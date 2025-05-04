document.addEventListener('DOMContentLoaded', function() {
  // Configuration
  const DEBUG = true; // Включение логирования для отладки
  const geoserverUrl = 'http://localhost:8080/geoserver/wms'; // Update with your GeoServer URL
  const workspace = 'geoportal'; // Update with your workspace name
  
  if (DEBUG) {
      console.log("Инициализация геопортала");
      console.log("GeoServer URL:", geoserverUrl);
      console.log("Workspace:", workspace);
  }
  
  // Функция для проверки доступности GeoServer перед инициализацией карты
  function checkGeoServer() {
      return new Promise((resolve, reject) => {
          if (DEBUG) console.log("Проверка доступности GeoServer...");
          
          fetch(geoserverUrl + '?SERVICE=WMS&REQUEST=GetCapabilities')
              .then(response => {
                  if (!response.ok) {
                      throw new Error('Ошибка соединения с GeoServer: ' + response.status);
                  }
                  if (DEBUG) console.log("GeoServer доступен");
                  return response.text();
              })
              .then(data => {
                  if (DEBUG) console.log("GeoServer capabilities получены");
                  resolve(true);
              })
              .catch(error => {
                  console.error('Проблема с подключением к GeoServer:', error);
                  reject(error);
              });
      });
  }
  
  // Создаем индикатор загрузки
  const loadingElement = document.createElement('div');
  loadingElement.innerHTML = 'Проверка подключения к GeoServer...';
  loadingElement.style.position = 'absolute';
  loadingElement.style.top = '50%';
  loadingElement.style.left = '50%';
  loadingElement.style.transform = 'translate(-50%, -50%)';
  loadingElement.style.padding = '10px';
  loadingElement.style.background = 'rgba(255, 255, 255, 0.8)';
  loadingElement.style.borderRadius = '5px';
  loadingElement.style.zIndex = '1000';
  document.getElementById('map').appendChild(loadingElement);
  
  // Проверяем GeoServer перед инициализацией карты
  checkGeoServer()
      .then(initMap)
      .catch(error => {
          loadingElement.innerHTML = 'Ошибка подключения к GeoServer:<br>' + error.message + 
              '<br><br>Проверьте, что GeoServer запущен и доступен по адресу:<br>' + geoserverUrl;
          loadingElement.style.color = 'red';
          loadingElement.style.maxWidth = '80%';
          loadingElement.style.textAlign = 'center';
      });
  
  // Функция инициализации карты после проверки GeoServer
  function initMap() {
      if (DEBUG) console.log("Инициализация карты...");
      loadingElement.innerHTML = 'Загрузка карты...';
      
      // Создаем контролы для карты
      const controls = [];
      
      // Добавляем стандартные контролы
      controls.push(new ol.control.Zoom());
      controls.push(new ol.control.Rotate());
      controls.push(new ol.control.Attribution());
      
      // Добавляем дополнительные контролы
      controls.push(new ol.control.ScaleLine());
      controls.push(new ol.control.ZoomSlider());
      controls.push(new ol.control.FullScreen());
      controls.push(new ol.control.MousePosition({
          coordinateFormat: ol.coordinate.createStringXY(4),
          projection: 'EPSG:4326',
          className: 'custom-mouse-position',
          target: document.getElementById('mouse-position')
      }));
      
      // Initialize map
      const map = new ol.Map({
          target: 'map',
          controls: controls,
          view: new ol.View({
              center: ol.proj.fromLonLat([60.6122, 55.1544]), // Center on Chelyabinsk region
              zoom: 9
          })
      });
      
      // Base layers
      const osmLayer = new ol.layer.Tile({
          title: 'OpenStreetMap',
          type: 'base',
          visible: true,
          source: new ol.source.OSM()
      });
      
      const satelliteLayer = new ol.layer.Tile({
          title: 'Satellite',
          type: 'base',
          visible: false,
          source: new ol.source.XYZ({
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">ArcGIS</a>'
          })
      });
      
      const topoLayer = new ol.layer.Tile({
          title: 'Topographic',
          type: 'base',
          visible: false,
          source: new ol.source.XYZ({
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
              attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer">ArcGIS</a>'
          })
      });
      
      // Слой границы Челябинской области - всегда видимый
      const boundaryLayer = new ol.layer.Tile({
          title: 'Boundary',
          visible: true,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':boundary-polygon',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Слой осм-блайнд для ограничения видимости OSM в пределах области
      const osmBlindLayer = new ol.layer.Tile({
          title: 'OSM Blind',
          visible: true, // по умолчанию включен
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':osm-blind',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Добавляем базовые слои
      map.addLayer(osmLayer);
      map.addLayer(satelliteLayer);
      map.addLayer(topoLayer);
      
      // WMS Layers from GeoServer
      // Industrial Areas Layer
      const industrialAreasLayer = new ol.layer.Tile({
          title: 'Industrial Areas',
          visible: true,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':landuse_industrial',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Steel Mills Layer
      const steelMillsLayer = new ol.layer.Tile({
          title: 'Steel Mills',
          visible: true,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':industrial_steel_mill',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Mines Layer
      const minesLayer = new ol.layer.Tile({
          title: 'Mines',
          visible: false,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':industrial_mine',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Quarries Layer
      const quarriesLayer = new ol.layer.Tile({
          title: 'Quarries',
          visible: false,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':landuse_quarry',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Chimneys Layer
      const chimneysLayer = new ol.layer.Tile({
          title: 'Chimneys',
          visible: false,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':man_made_chimney',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Kilns Layer
      const kilnsLayer = new ol.layer.Tile({
          title: 'Kilns',
          visible: false,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':man_made_kiln',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Railway Layer
      const railwayLayer = new ol.layer.Tile({
          title: 'Railways',
          visible: false,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':railway-line',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Water Polygons Layer
      const waterPolygonsLayer = new ol.layer.Tile({
          title: 'Water Polygons',
          visible: false,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':water-polygon',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Water Lines Layer
      const waterLinesLayer = new ol.layer.Tile({
          title: 'Water Lines',
          visible: false,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':water-line',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Vegetation Layer
      const vegetationLayer = new ol.layer.Tile({
          title: 'Vegetation',
          visible: false,
          source: new ol.source.TileWMS({
              url: geoserverUrl,
              params: {
                  'LAYERS': workspace + ':vegetation-polygon',
                  'TILED': true,
                  'VERSION': '1.1.1'
              },
              serverType: 'geoserver',
              transition: 0
          })
      });
      
      // Добавление обработчиков ошибок для слоев
      const layers = [
          industrialAreasLayer, steelMillsLayer, minesLayer, quarriesLayer,
          chimneysLayer, kilnsLayer, railwayLayer, waterPolygonsLayer,
          waterLinesLayer, vegetationLayer, boundaryLayer, osmBlindLayer
      ];
      
      if (DEBUG) {
          layers.forEach(layer => {
              const layerName = layer.get('title');
              
              layer.getSource().on('tileloaderror', function(event) {
                  console.error(`Ошибка загрузки тайла для слоя "${layerName}"`, event);
              });
              
              layer.getSource().on('tileloadend', function(event) {
                  console.log(`Тайл успешно загружен для слоя "${layerName}"`);
              });
          });
      }
      
      // Добавляем слои в особом порядке (сначала базовые, потом граница, потом все остальные)
      // Граница всегда видима
      map.addLayer(boundaryLayer);
      
      // OSM Blind слой для ограничения видимости OSM
      map.addLayer(osmBlindLayer);
      
      // Добавляем остальные слои
      map.addLayer(railwayLayer);
      map.addLayer(chimneysLayer);
      map.addLayer(kilnsLayer);
      map.addLayer(waterLinesLayer);
      map.addLayer(waterPolygonsLayer);
      map.addLayer(steelMillsLayer);
      map.addLayer(quarriesLayer);
      map.addLayer(minesLayer);
      map.addLayer(industrialAreasLayer);
      map.addLayer(vegetationLayer);
      
      // Layer Switcher setup (connect the checkboxes to the layers)
      // Industrial Areas
      document.getElementById('layer-industrial-areas').addEventListener('change', function() {
          industrialAreasLayer.setVisible(this.checked);
      });
      
      // Steel Mills
      document.getElementById('layer-steel-mills').addEventListener('change', function() {
          steelMillsLayer.setVisible(this.checked);
      });
      
      // Mines
      document.getElementById('layer-mines').addEventListener('change', function() {
          minesLayer.setVisible(this.checked);
      });
      
      // Quarries
      document.getElementById('layer-quarries').addEventListener('change', function() {
          quarriesLayer.setVisible(this.checked);
      });
      
      // Chimneys
      document.getElementById('layer-chimneys').addEventListener('change', function() {
          chimneysLayer.setVisible(this.checked);
      });
      
      // Kilns
      document.getElementById('layer-kilns').addEventListener('change', function() {
          kilnsLayer.setVisible(this.checked);
      });
      
      // Railways
      document.getElementById('layer-railways').addEventListener('change', function() {
          railwayLayer.setVisible(this.checked);
      });
      
      // Water Polygons
      document.getElementById('layer-water-polygons').addEventListener('change', function() {
          waterPolygonsLayer.setVisible(this.checked);
      });
      
      // Water Lines
      document.getElementById('layer-water-lines').addEventListener('change', function() {
          waterLinesLayer.setVisible(this.checked);
      });
      
      // Vegetation
      document.getElementById('layer-vegetation').addEventListener('change', function() {
          vegetationLayer.setVisible(this.checked);
      });
      
      // Функция для синхронизации состояния чекбоксов с видимостью слоев
      function updateCheckboxes() {
          document.getElementById('layer-industrial-areas').checked = industrialAreasLayer.getVisible();
          document.getElementById('layer-steel-mills').checked = steelMillsLayer.getVisible();
          document.getElementById('layer-mines').checked = minesLayer.getVisible();
          document.getElementById('layer-quarries').checked = quarriesLayer.getVisible();
          document.getElementById('layer-chimneys').checked = chimneysLayer.getVisible();
          document.getElementById('layer-kilns').checked = kilnsLayer.getVisible();
          document.getElementById('layer-railways').checked = railwayLayer.getVisible();
          document.getElementById('layer-water-polygons').checked = waterPolygonsLayer.getVisible();
          document.getElementById('layer-water-lines').checked = waterLinesLayer.getVisible();
          document.getElementById('layer-vegetation').checked = vegetationLayer.getVisible();
      }
      
      // Basemap selector
      document.getElementById('basemap-selector').addEventListener('change', function() {
          const value = this.value;
          
          // Отключаем все базовые слои
          osmLayer.setVisible(false);
          satelliteLayer.setVisible(false);
          topoLayer.setVisible(false);
          
          // Включаем выбранный базовый слой
          if (value === 'osm') {
              osmLayer.setVisible(true);
              osmBlindLayer.setVisible(true); // Включаем OSM Blind при выборе OSM
          } else if (value === 'satellite') {
              satelliteLayer.setVisible(true);
              osmBlindLayer.setVisible(false);
          } else if (value === 'topo') {
              topoLayer.setVisible(true);
              osmBlindLayer.setVisible(false);
          } else if (value === 'boundary') {
              // Для векторной карты особые настройки
              osmBlindLayer.setVisible(false);
              
              // Включаем природные слои
              waterPolygonsLayer.setVisible(true);
              waterLinesLayer.setVisible(true);
              vegetationLayer.setVisible(true);
              
              // Синхронизируем чекбоксы
              updateCheckboxes();
          }
      });
      
      // Setup popup for feature info
      const popup = new ol.Overlay({
          element: document.getElementById('popup'),
          positioning: 'bottom-center',
          stopEvent: false,
          offset: [0, -10]
      });
      map.addOverlay(popup);
      
      // Popup closer
      const closer = document.getElementById('popup-closer');
      if (closer) {
          closer.onclick = function() {
              popup.setPosition(undefined);
              closer.blur();
              return false;
          };
      }
      
      // Implement GetFeatureInfo for identify tool
      function showFeatureInfo(pixel) {
          const feature = map.forEachFeatureAtPixel(pixel, function(feature) {
              return feature;
          });
          
          // Get the WMS layers to query
          const viewResolution = map.getView().getResolution();
          const viewProjection = map.getView().getProjection();
          const coordinate = map.getCoordinateFromPixel(pixel);
          
          // Collect all visible WMS layers
          const visibleWmsLayers = [
              industrialAreasLayer, steelMillsLayer, minesLayer, quarriesLayer, 
              chimneysLayer, kilnsLayer, railwayLayer, waterPolygonsLayer, 
              waterLinesLayer, vegetationLayer, boundaryLayer
          ].filter(layer => layer.getVisible());
          
          if (visibleWmsLayers.length === 0) {
              return;
          }
          
          // Build URL for GeoServer WMS GetFeatureInfo request
          let url;
          let foundLayer = false;
          
          // Try each visible layer until we find information
          for (const layer of visibleWmsLayers) {
              const source = layer.getSource();
              url = source.getFeatureInfoUrl(
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
                  if (DEBUG) console.log("Запрос GetFeatureInfo URL:", url);
                  
                  fetch(url)
                      .then(response => {
                          if (!response.ok) {
                              throw new Error('HTTP error ' + response.status);
                          }
                          return response.json();
                      })
                      .then(data => {
                          const content = document.getElementById('popup-content');
                          
                          if (data.features && data.features.length) {
                              // Display feature info in popup
                              let popupContent = '<div>';
                              const feature = data.features[0];
                              
                              // Feature type/name
                              popupContent += '<h5>' + layer.get('title') + '</h5>';
                              
                              // Properties table
                              popupContent += '<table class="table table-sm">';
                              for (const prop in feature.properties) {
                                  if (prop !== 'bbox') { // Skip bounding box property
                                      popupContent += '<tr>' +
                                          '<th scope="row">' + prop + '</th>' +
                                          '<td>' + feature.properties[prop] + '</td>' +
                                          '</tr>';
                                  }
                              }
                              popupContent += '</table></div>';
                              
                              content.innerHTML = popupContent;
                              popup.setPosition(coordinate);
                          }
                          // Removed the problematic 'continue' statement
                      })
                      .catch(error => {
                          console.error('Error fetching feature info:', error);
                      });
                  
                  break; // Exit once we've found a layer with data
              }
          }
          
          if (!foundLayer) {
              popup.setPosition(undefined);
          }
      }
      
      // Identify tool
      let identifyActive = false;
      
      document.getElementById('tool-identify').addEventListener('click', function() {
          identifyActive = !identifyActive;
          this.classList.toggle('active');
          
          if (identifyActive) {
              map.on('singleclick', function(evt) {
                  if (identifyActive) {
                      showFeatureInfo(evt.pixel);
                  }
              });
          }
      });
      
      // Measurement tool
      let draw;
      let measureActive = false;
      
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
          const measureTooltipElement = document.createElement('div');
          measureTooltipElement.className = 'tooltip tooltip-measure';
          
          const measureTooltip = new ol.Overlay({
              element: measureTooltipElement,
              offset: [0, -15],
              positioning: 'bottom-center'
          });
          
          map.addOverlay(measureTooltip);
          
          // Format length measurement
          const formatLength = function(line) {
              const length = ol.sphere.getLength(line);
              let output;
              
              if (length > 1000) {
                  output = (Math.round(length / 1000 * 100) / 100) + ' km';
              } else {
                  output = (Math.round(length * 100) / 100) + ' m';
              }
              
              return output;
          };
          
          // Format area measurement
          const formatArea = function(polygon) {
              const area = ol.sphere.getArea(polygon);
              let output;
              
              if (area > 10000) {
                  output = (Math.round(area / 1000000 * 100) / 100) + ' km²';
              } else {
                  output = (Math.round(area * 100) / 100) + ' m²';
              }
              
              return output;
          };
          
          // Create draw interaction for measurements
          draw = new ol.interaction.Draw({
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
          
          // Start drawing
          draw.on('drawstart', function(evt) {
              const sketch = evt.feature;
              
              let tooltipCoord = evt.coordinate;
              
              listener = sketch.getGeometry().on('change', function(evt) {
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
          draw.on('drawend', function() {
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
          
          return function() {
              map.removeInteraction(draw);
              map.removeLayer(vector);
              measureTooltipElement.parentNode.removeChild(measureTooltipElement);
              map.removeOverlay(measureTooltip);
          };
      }
      
      let removeMeasurement;
      
      document.getElementById('tool-measure').addEventListener('click', function() {
          measureActive = !measureActive;
          this.classList.toggle('active');
          
          if (measureActive) {
              removeMeasurement = addMeasurementInteraction();
          } else if (removeMeasurement) {
              removeMeasurement();
          }
      });
      
      // About button and modal
      document.getElementById('about-btn').addEventListener('click', function() {
          const aboutModal = new bootstrap.Modal(document.getElementById('aboutModal'));
          aboutModal.show();
      });
      
      // Удаление индикатора загрузки, когда карта готова
      map.once('rendercomplete', function() {
          if (loadingElement && loadingElement.parentNode) {
              loadingElement.parentNode.removeChild(loadingElement);
          }
          if (DEBUG) console.log('Карта успешно отрендерена');
      });
      
      // Инициализация начального состояния - для OpenStreetMap включаем osm_blind
      osmBlindLayer.setVisible(true);
  }
});