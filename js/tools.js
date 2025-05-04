/**
 * Модуль инструментов работы с картой
 * Содержит функции для измерения, идентификации объектов и др.
 */

import { Logger } from './config.js';

/**
 * Настройка всплывающих подсказок и инструментов
 */
export function setupPopupAndTools(map, layers) {
    // Setup popup
    const popup = setupPopup(map);

    // Setup identify tool
    setupIdentifyTool(map, popup, layers.wmsLayers);

    // Setup measurement tool
    setupMeasurementTool(map);

    // Setup about button
    setupAboutButton();
}

/**
 * Настройка кнопки "О проекте"
 */
export function setupAboutButton() {
    const aboutBtn = document.getElementById('about-btn');
    if (!aboutBtn) {
        Logger.error('About button not found');
        return;
    }

    aboutBtn.addEventListener('click', function () {
        const aboutModal = new bootstrap.Modal(document.getElementById('aboutModal'));
        aboutModal.show();
    });
}

/**
 * Настройка всплывающего окна для информации об объектах
 */
export function setupPopup(map) {
    const popupElement = document.getElementById('popup');
    if (!popupElement) {
        Logger.error('Popup element not found');
        return null;
    }

    const popup = new ol.Overlay({
        element: popupElement,
        positioning: 'bottom-center',
        stopEvent: false,
        offset: [0, -10]
    });

    map.addOverlay(popup);

    // Set up popup closer
    const closer = document.getElementById('popup-closer');
    if (closer) {
        closer.onclick = function () {
            popup.setPosition(undefined);
            popupElement.style.display = 'none';
            closer.blur();
            return false;
        };
    }

    return popup;
}

/**
 * Настройка инструмента идентификации объектов
 */
export function setupIdentifyTool(map, popup, wmsLayers) {
    let identifyActive = false;

    const identifyBtn = document.getElementById('tool-identify');
    if (!identifyBtn) {
        Logger.error('Identify tool button not found');
        return;
    }

    const popupElement = document.getElementById('popup');

    // Click handler for identifying features
    function handleIdentifyClick(evt) {
        Logger.log('Identify click handler called', identifyActive);
        if (identifyActive) {
            showFeatureInfo(evt.pixel);
        }
    }

    // Display feature info at a pixel
    function showFeatureInfo(pixel) {
        Logger.log('Show feature info for pixel', pixel);
        
        // Get the vector feature under the pixel
        const feature = map.forEachFeatureAtPixel(pixel, function (feature) {
            return feature;
        });

        // Get map properties for the GetFeatureInfo request
        const viewResolution = map.getView().getResolution();
        const viewProjection = map.getView().getProjection();
        const coordinate = map.getCoordinateFromPixel(pixel);

        // Get all visible WMS layers
        const visibleWmsLayers = wmsLayers.filter(layer => layer.getVisible());
        Logger.log('Visible WMS layers:', visibleWmsLayers.length);

        if (visibleWmsLayers.length === 0) {
            return;
        }

        // Try to get feature info for each visible layer
        let foundLayer = false;

        for (const layer of visibleWmsLayers) {
            const source = layer.getSource();
            const url = source.getFeatureInfoUrl(
                coordinate,
                viewResolution,
                viewProjection,
                {
                    'INFO_FORMAT': 'application/json',
                    'FEATURE_COUNT': 10
                }
            );

            if (url) {
                foundLayer = true;
                Logger.log("Запрос GetFeatureInfo URL:", url);

                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('HTTP error ' + response.status);
                        }
                        return response.json();
                    })
                    .then(data => {
                        const content = document.getElementById('popup-content');
                        Logger.log('GetFeatureInfo response:', data);

                        if (data.features && data.features.length) {
                            // Display feature info in popup
                            let popupContent = '<div>';
                            const feature = data.features[0];

                            // Feature type/name
                            popupContent += '<h5>' + layer.get('title') + '</h5>';

                            // Helper function to truncate long values
                            function truncateValue(value, maxLength = 50) {
                                if (typeof value !== 'string') {
                                    return value;
                                }
                                
                                if (value.length > maxLength) {
                                    const truncated = value.substr(0, maxLength);
                                    return `<span class="truncated-value" 
                                        data-full-value="${value.replace(/"/g, '&quot;')}">${truncated}... 
                                        <a href="#" class="show-more">Показать</a></span>`;
                                }
                                
                                return value;
                            }

                            // Properties table - filter out null values
                            popupContent += '<table class="table table-sm table-striped">';
                            
                            // Counter for non-null properties
                            let nonNullCount = 0;
                            const properties = [];
                            
                            // First pass - count non-null properties and collect them
                            for (const prop in feature.properties) {
                                const value = feature.properties[prop];
                                if (prop !== 'bbox' && value !== null && value !== '' && value !== undefined) {
                                    nonNullCount++;
                                    properties.push({ name: prop, value: value });
                                }
                            }
                            
                            // Maximum properties to show initially
                            const maxInitialProps = 15;
                            const hasMoreProps = nonNullCount > maxInitialProps;
                            
                            // If many properties, use compact display and limit initial count
                            const compactMode = nonNullCount > 10;
                            const propsToShow = hasMoreProps ? maxInitialProps : nonNullCount;
                            
                            // Add properties to table
                            if (compactMode) {
                                // Compact display - 2 columns
                                let rowOpen = false;
                                
                                for (let i = 0; i < propsToShow; i++) {
                                    const prop = properties[i].name;
                                    const value = properties[i].value;
                                    
                                    // Open a new row for every 2 properties
                                    if (i % 2 === 0) {
                                        popupContent += '<tr>';
                                        rowOpen = true;
                                    }
                                    
                                    // Add property and value
                                    popupContent += 
                                        '<td><strong>' + prop + '</strong>: ' + 
                                        truncateValue(value) + '</td>';
                                    
                                    // Close the row after every 2 properties
                                    if (i % 2 === 1) {
                                        popupContent += '</tr>';
                                        rowOpen = false;
                                    }
                                }
                                
                                // Close the last row if it's still open
                                if (rowOpen) {
                                    popupContent += '<td></td></tr>';
                                }
                            } else {
                                // Standard display - 1 property per row
                                for (let i = 0; i < propsToShow; i++) {
                                    const prop = properties[i].name;
                                    const value = properties[i].value;
                                    
                                    popupContent += '<tr>' +
                                        '<th scope="row">' + prop + '</th>' +
                                        '<td>' + truncateValue(value) + '</td>' +
                                        '</tr>';
                                }
                            }
                            
                            popupContent += '</table>';
                            
                            // Add show more button if needed
                            if (hasMoreProps) {
                                popupContent += '<div class="text-center mt-2">' +
                                    '<button class="btn btn-sm btn-outline-primary show-all-props" ' +
                                    'data-count="' + (nonNullCount - maxInitialProps) + '">' +
                                    'Показать еще ' + (nonNullCount - maxInitialProps) + ' атрибутов</button>' +
                                    '</div>';
                                
                                // Store remaining properties in data attribute
                                const remainingProps = properties.slice(maxInitialProps);
                                popupContent += '<div id="remaining-props" style="display:none;" ' +
                                    'data-props=\'' + JSON.stringify(remainingProps).replace(/'/g, "&#39;") + '\'></div>';
                            }
                            
                            popupContent += '</div>';

                            content.innerHTML = popupContent;
                            popup.setPosition(coordinate);
                            popupElement.style.display = 'block';
                            
                            // Add event listeners for "show more" links
                            const showMoreLinks = content.querySelectorAll('.show-more');
                            showMoreLinks.forEach(link => {
                                link.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    const span = this.parentNode;
                                    const fullValue = span.getAttribute('data-full-value');
                                    span.innerHTML = fullValue;
                                });
                            });
                            
                            // Add event listener for "show all props" button
                            const showAllBtn = content.querySelector('.show-all-props');
                            if (showAllBtn) {
                                showAllBtn.addEventListener('click', function() {
                                    const remainingPropsDiv = content.querySelector('#remaining-props');
                                    const remainingProps = JSON.parse(remainingPropsDiv.getAttribute('data-props'));
                                    const table = content.querySelector('table');
                                    
                                    let html = '';
                                    if (compactMode) {
                                        // Compact mode - 2 columns
                                        let rowOpen = false;
                                        
                                        for (let i = 0; i < remainingProps.length; i++) {
                                            const prop = remainingProps[i].name;
                                            const value = remainingProps[i].value;
                                            
                                            // Open a new row for every 2 properties
                                            if (i % 2 === 0) {
                                                html += '<tr>';
                                                rowOpen = true;
                                            }
                                            
                                            // Add property and value
                                            html += 
                                                '<td><strong>' + prop + '</strong>: ' + 
                                                truncateValue(value) + '</td>';
                                            
                                            // Close the row after every 2 properties
                                            if (i % 2 === 1) {
                                                html += '</tr>';
                                                rowOpen = false;
                                            }
                                        }
                                        
                                        // Close the last row if it's still open
                                        if (rowOpen) {
                                            html += '<td></td></tr>';
                                        }
                                    } else {
                                        // Standard mode - 1 property per row
                                        for (let i = 0; i < remainingProps.length; i++) {
                                            const prop = remainingProps[i].name;
                                            const value = remainingProps[i].value;
                                            
                                            html += '<tr>' +
                                                '<th scope="row">' + prop + '</th>' +
                                                '<td>' + truncateValue(value) + '</td>' +
                                                '</tr>';
                                        }
                                    }
                                    
                                    // Append to table and hide button
                                    table.insertAdjacentHTML('beforeend', html);
                                    this.parentNode.style.display = 'none';
                                    
                                    // Add event listeners for "show more" links again
                                    const newShowMoreLinks = content.querySelectorAll('.show-more');
                                    newShowMoreLinks.forEach(link => {
                                        link.addEventListener('click', function(e) {
                                            e.preventDefault();
                                            const span = this.parentNode;
                                            const fullValue = span.getAttribute('data-full-value');
                                            span.innerHTML = fullValue;
                                        });
                                    });
                                });
                            }
                            
                            Logger.log('Popup content updated and positioned');
                        } else {
                            Logger.log('No features found in response');
                            popup.setPosition(undefined);
                            popupElement.style.display = 'none';
                        }
                    })
                    .catch(error => {
                        Logger.error('Error fetching feature info:', error);
                        popup.setPosition(undefined);
                        popupElement.style.display = 'none';
                    });

                break; // Exit once we've found a layer with data
            }
        }

        if (!foundLayer) {
            Logger.log('No layer found for GetFeatureInfo');
            popup.setPosition(undefined);
            popupElement.style.display = 'none';
        }
    }

    // Toggle identify tool on button click
    identifyBtn.addEventListener('click', function () {
        identifyActive = !identifyActive;
        this.classList.toggle('active');
        Logger.log('Identify tool ' + (identifyActive ? 'activated' : 'deactivated'));

        if (identifyActive) {
            // Add the click handler when tool is active
            map.on('singleclick', handleIdentifyClick);
        } else {
            // Remove it when tool is deactivated
            map.un('singleclick', handleIdentifyClick);
            // Hide popup when deactivating the tool
            popup.setPosition(undefined);
            popupElement.style.display = 'none';
        }
    });
}

/**
 * Настройка инструмента измерения расстояний
 */
export function setupMeasurementTool(map) {
    let measureActive = false;
    let activeMeasurement = null;

    const measureBtn = document.getElementById('tool-measure');
    if (!measureBtn) {
        Logger.error('Measure tool button not found');
        return;
    }

    // Add measurement interaction to the map
    function addMeasurementInteraction() {
        const source = new ol.source.Vector();

        const vector = new ol.layer.Vector({
            source: source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });

        map.addLayer(vector);

        // Create measuring tooltips
        let measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'tooltip tooltip-measure';

        let measureTooltip = new ol.Overlay({
            element: measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center'
        });

        map.addOverlay(measureTooltip);

        // Create draw interaction for measurements
        const draw = new ol.interaction.Draw({
            source: source,
            type: 'LineString',
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 0, 0, 0.5)',
                    lineDash: [10, 10],
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 5,
                    stroke: new ol.style.Stroke({
                        color: 'rgba(0, 0, 0, 0.7)'
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.2)'
                    })
                })
            })
        });

        map.addInteraction(draw);

        let listener;

        // Format length measurement
        function formatLength(line) {
            const length = ol.sphere.getLength(line);

            if (length > 1000) {
                return (Math.round(length / 1000 * 100) / 100) + ' км';
            } else {
                return (Math.round(length * 100) / 100) + ' м';
            }
        }

        // Format area measurement
        function formatArea(polygon) {
            const area = ol.sphere.getArea(polygon);

            if (area > 10000) {
                return (Math.round(area / 1000000 * 100) / 100) + ' км²';
            } else {
                return (Math.round(area * 100) / 100) + ' м²';
            }
        }

        // Start drawing
        draw.on('drawstart', function (evt) {
            const sketch = evt.feature;
            let tooltipCoord = evt.coordinate;

            listener = sketch.getGeometry().on('change', function (evt) {
                const geom = evt.target;
                let output;

                if (geom instanceof ol.geom.Polygon) {
                    output = formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                } else if (geom instanceof ol.geom.LineString) {
                    output = formatLength(geom);
                    tooltipCoord = geom.getLastCoordinate();
                }

                measureTooltipElement.innerHTML = output;
                measureTooltip.setPosition(tooltipCoord);
            });
        });

        // End drawing
        draw.on('drawend', function () {
            measureTooltipElement.className = 'tooltip tooltip-static';
            measureTooltip.setOffset([0, -7]);

            // Create a new tooltip for next measurement
            measureTooltipElement = document.createElement('div');
            measureTooltipElement.className = 'tooltip tooltip-measure';

            measureTooltip = new ol.Overlay({
                element: measureTooltipElement,
                offset: [0, -15],
                positioning: 'bottom-center'
            });

            map.addOverlay(measureTooltip);

            ol.Observable.unByKey(listener);
        });

        // Return cleanup function
        return function () {
            map.removeInteraction(draw);
            map.removeLayer(vector);

            // Find all tooltips and remove them
            const tooltipElements = document.querySelectorAll('.tooltip');
            tooltipElements.forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });

            // Remove overlays with tooltip class
            const overlays = map.getOverlays().getArray().slice();
            overlays.forEach(overlay => {
                const element = overlay.getElement();
                if (element && element.classList &&
                    (element.classList.contains('tooltip-measure') ||
                        element.classList.contains('tooltip-static'))) {
                    map.removeOverlay(overlay);
                }
            });
        };
    }

    // Toggle measurement tool on button click
    measureBtn.addEventListener('click', function () {
        measureActive = !measureActive;
        this.classList.toggle('active');

        if (measureActive) {
            activeMeasurement = addMeasurementInteraction();
        } else if (activeMeasurement) {
            activeMeasurement();
            activeMeasurement = null;
        }
    });
} 