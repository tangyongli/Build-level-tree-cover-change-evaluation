/*https://code.earthengine.google.com/467b3af170c64856340ea25aa8343f5a*/



////////// 1.Create main Panel////////
var mainPanel = ui.Panel({
    style: {
        width: '300px',
        padding: '8px'
    }
});

// Define class values and colors
var colors = [
    '#006400', // Tree
    '#7CFC00', // Grass
    '#8B0000', // Urban
    '#D3D3D3', // Bare
    '#0000FF'  // Water
];
var classValues = {
    'Tree': { value: 0, color: '#006400' },
    'Grass': { value: 1, color: '#7CFC00' },
    'Impervious surface': { value: 2, color: '#8B0000' },
    'Barren land': { value: 3, color: '#D3D3D3' },
    'Water': { value: 4, color: '#0000FF' }
};

// Function to create classification panel-the right one 
var createClassificationPanel = function () {
    var classPanel = ui.Panel({
        style: {
            width: '300px',
            padding: '8px'
        }
    });
    // Define class colors and names
    var colors = [
        '#006400', // Tree
        '#7CFC00', // Grass
        '#8B0000', // Urban
        '#D3D3D3', // Bare
        '#0000FF'  // Water
    ];
    var names = ['Tree', 'Grass', 'Impervious surface', 'Barren land', 'Water'];
    // Create legend title
    var legendTitle = ui.Label({
        value: 'Land Cover Classes',
        style: {
            fontWeight: 'bold',
            fontSize: '16px',
            margin: '0 0 4px 0',
            padding: '0'
        }
    });
    classPanel.add(legendTitle);
    // Add color boxes and labels
    for (var i = 0; i < colors.length; i++) {
        var colorBox = ui.Label({
            style: {
                backgroundColor: colors[i],
                padding: '8px',
                margin: '0 0 4px 0'
            }
        });
        var description = ui.Label({
            value: names[i],
            style: { margin: '0 0 4px 6px' }
        });
        var entry = ui.Panel({
            widgets: [colorBox, description],
            layout: ui.Panel.Layout.Flow('horizontal')
        });
        classPanel.add(entry);
    }
    return classPanel;
};


//////// 2. Function to load NAIP imagery ////////
function NAPIcomposite() {
    var composite2010 = ee.ImageCollection('USDA/NAIP/DOQQ').filter(ee.Filter.date(2010 + '-01-01', 2010 + '-12-30')).mean()
    var composite2022 = ee.ImageCollection('USDA/NAIP/DOQQ').filter(ee.Filter.date(2022 + '-01-01', 2022 + '-12-30')).mean()
    var epsg4326 = ee.Projection('EPSG:4326')
    var composite2010 = composite2010.reproject({
        crs: epsg4326,
        scale: 1
    })
    var composite2022 = composite2022.reproject({
        crs: epsg4326,
        scale: 1
    })
    return {
        'composite2010': composite2010,
        'composite2022': composite2022,
    }
}


//////// 3.Load saved classification results//////////

var img2010coast = ee.Image('projects/ee-2022yl/assets/CAwildfire/wuicoastclass2010')
var img2022coast = ee.Image('projects/ee-2022yl/assets/CAwildfire/wuicoastclass2022')
var img2010inland = ee.Image('projects/ee-2022yl/assets/CAwildfire/wuiinlandclass2010')
var img2022inland = ee.Image('projects/ee-2022yl/assets/CAwildfire/wuiinlandclass2022')
var img2010 = ee.ImageCollection([img2010coast, img2010inland]).mosaic()
var img2022 = ee.ImageCollection([img2022coast, img2022inland]).mosaic()

// remove locations without NAIP images in 2022
var geometry = ee.FeatureCollection('projects/ee-2022yl/assets/CAwildfire/napi2022noimages')
var img2022remove = img2022.clip(geometry)
var mask0 = img2022remove.eq(0).selfMask();
var mask1 = img2022remove.neq(0).selfMask();
var mask = ee.ImageCollection([mask0, mask1]).mosaic().not().unmask(1)
var img2022 = img2022.updateMask(mask);

//////// 4.Show the default layers on the code editor/////////
var composte2010 = NAPIcomposite().composite2010
var composte2022 = NAPIcomposite().composite2022
var composte2010 = ui.Map.Layer(composte2010.select('N', 'R', 'G'), {
}, 'NAPI2010', false);
var composte2022 = ui.Map.Layer(composte2022.select('N', 'R', 'G'), {
}, 'NAPI2022', false);
var class2010wuiandurban = ui.Map.Layer(img2010, { min: 0, max: 4, palette: colors }, 'WUI+Urban(2010)');
var class2022wuiandurban = ui.Map.Layer(img2022, { min: 0, max: 4, palette: colors }, 'WUI+Urban(2022)');
Map.layers().add(composte2010);
Map.layers().add(composte2022);
Map.layers().add(class2010wuiandurban);
Map.layers().add(class2022wuiandurban);


//////// 5.Select Year&Region&Class to highlight on the code editor////////
var urbanarea = ee.FeatureCollection('projects/ee-2022yl/assets/CAwildfire/admin/urbanarea2020')
var wui = ee.FeatureCollection('projects/ee-2022yl/assets/CAwildfire/admin/wuimergebgsmalldisolvecountyfp')

// Define global variables for clipped images by urban boundary or WUI boundary
var clippedimg2010;
var clippedimg2022;

var areaSelect = ui.Select({
    items: ['Urban', 'WUI'],
    placeholder: 'Select Area',
    value: 'WUI',
    onChange: function (selectedArea) {
        var area = selectedArea === 'WUI' ? wui : urbanarea;
        // clip classification results according to selected region by users
        clippedimg2010 = img2010.clip(area);
        clippedimg2022 = img2022.clip(area);

        // Hide WUI+Urban layers when a specific area is selected
        class2010wuiandurban.setShown(false);
        class2022wuiandurban.setShown(false);

        // Highlight again
        var selectedClass = classSelect.getValue();
        if (selectedClass) {
            applyHighlighting(selectedClass, clippedimg2010, '2010');
            applyHighlighting(selectedClass, clippedimg2022, '2022');
        }


    }
});

// Create year selection control
var yearSelect = ui.Select({
    items: ['2010', '2022', '2010 and 2022'],
    placeholder: 'Select Year',
    value: null, // Set default value
    onChange: function (selected) {
        if (selected === '2010') {
            class2010wuiandurban.setShown(false);
            class2022wuiandurban.setShown(false);
        } else if (selected === '2022') {
            class2010wuiandurban.setShown(false);
            class2022wuiandurban.setShown(false);
        } else if (selected === '2010 and 2022') {
            class2010wuiandurban.setShown(false);
            class2022wuiandurban.setShown(false);
        }
    }
});

var classSelect = ui.Select({
    items: ['All Classes', 'Tree', 'Grass', 'Impervious surface', 'Barren land'],
    placeholder: 'Select Class to Highlight',
    value: null,
    onChange: function (selected) {
        if (selected) {
            applyHighlighting(selected, clippedimg2010, '2010');
            applyHighlighting(selected, clippedimg2022, '2022');
        }
    }
});


function applyHighlighting(selected, image, yearLabel) {
    // Remove all classification layers if not "2010 and 2022" mode
    var currentYear = yearSelect.getValue();
    var layers = Map.layers();

    if (currentYear !== '2010 and 2022') {
        // Remove all classification layers
        for (var i = layers.length() - 1; i >= 0; i--) {
            var layer = layers.get(i);
            if (layer.getName().indexOf('Tree') === 0 ||
                layer.getName().indexOf('Grass') === 0 ||
                layer.getName().indexOf('Impervious surface') === 0 ||
                layer.getName().indexOf('Barren land') === 0 ||
                layer.getName().indexOf('Water') === 0 ||
                layer.getName().indexOf('Classification') === 0) {
                Map.layers().remove(layer);
            }
        }
    } else {
        // Only remove layers for the specific year we're updating
        for (var i = layers.length() - 1; i >= 0; i--) {
            var layer = layers.get(i);
            if (layer.getName().indexOf(yearLabel) !== -1) {
                if (layer.getName().indexOf('Tree') === 0 ||
                    layer.getName().indexOf('Grass') === 0 ||
                    layer.getName().indexOf('Impervious surface') === 0 ||
                    layer.getName().indexOf('Barren land') === 0 ||
                    layer.getName().indexOf('Water') === 0 ||
                    layer.getName() === ('Classification ' + yearLabel)) {
                    Map.layers().remove(layer);
                }
            }
        }
    }

    // Add new classification layer
    if (selected === 'All Classes') {
        Map.layers().add(
            ui.Map.Layer(image, {
                min: 0,
                max: 4,
                palette: [
                    classValues['Tree'].color,
                    classValues['Grass'].color,
                    classValues['Impervious surface'].color,
                    classValues['Barren land'].color,
                    classValues['Water'].color
                ],
                opacity: 1
            }, 'Classification ' + yearLabel)
        );
    } else {
        var classValue = classValues[selected].value;
        var maskImage = image.eq(classValue);
        Map.layers().add(
            ui.Map.Layer(
                maskImage.updateMask(maskImage),
                {
                    palette: [classValues[selected].color],
                    opacity: 1
                },
                selected + ' ' + yearLabel
            )
        );
    }
}
var classificationControls = ui.Panel({
    widgets: [
        ui.Checkbox({
            label: 'Select class to highlight',
            value: true,
            onChange: function (checked) {
                var currentYear = yearSelect.getValue() || '2010';
                if (currentYear === '2010') {
                    class2010wuiandurban.setShown(checked);
                } else if (currentYear === '2022') {
                    class2022wuiandurban.setShown(checked);
                } else if (currentYear === '2010 and 2022') {
                    class2010wuiandurban.setShown(checked);
                    class2022wuiandurban.setShown(checked);
                }
            }
        }),
        ui.Select({
            items: ['All Classes', 'Tree', 'Grass', 'Impervious surface', 'Barren land'],
            placeholder: 'Select class to highlight',
            onChange: function (selected) {
                var currentYear = yearSelect.getValue() || '2010';
                if (currentYear === '2010') {
                    applyHighlighting(selected, clippedimg2010, '2010');
                    class2022wuiandurban.setShown(false);
                } else if (currentYear === '2022') {
                    applyHighlighting(selected, clippedimg2022, '2022');
                    class2010wuiandurban.setShown(false);
                } else if (currentYear === '2010 and 2022') {
                    applyHighlighting(selected, clippedimg2010, '2010');
                    applyHighlighting(selected, clippedimg2022, '2022');
                }
            }
        })
    ],
    style: { padding: '8px' }
});



//////// 6.Add region&year selection to the main control panel////////
var controlsregion = ui.Panel({
    widgets: [
        ui.Label('Select Area'),
        areaSelect
    ],
    style: { padding: '8px' }
});
var controlsyear = ui.Panel({
    widgets: [
        ui.Label('Select Year'),
        yearSelect
    ],
    style: { padding: '8px' }
});
mainPanel.add(controlsregion);
mainPanel.add(controlsyear);
mainPanel.add(createClassificationPanel());
mainPanel.add(classificationControls);
ui.root.add(mainPanel);

//////// 7.initialization map////////
function initialize() {
    areaSelect.setValue(null);
    class2010wuiandurban.setShown(true);
    class2022wuiandurban.setShown(true);
}
initialize();
Map.setCenter(-118, 34, 8)
