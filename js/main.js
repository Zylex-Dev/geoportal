/**
 * Главный модуль геопортала
 * Инициализирует карту и все компоненты
 */

import { CONFIG, Logger } from './config.js';
import { checkGeoServer } from './server.js';
import { createMapLayers, setupLayerErrorHandlers, addLayersToMap } from './layers.js';
import { createMapControls, setupLayerControls, setupBaseMapSelector } from './controls.js';
import { setupPopupAndTools } from './tools.js';

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    Logger.log("Инициализация геопортала");
    Logger.log("GeoServer URL:", CONFIG.geoserverUrl);
    Logger.log("Workspace:", CONFIG.workspace);

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
                '<br><br>Проверьте, что GeoServer запущен и доступен по адресу:<br>' + CONFIG.geoserverUrl;
            loadingElement.style.color = 'red';
            loadingElement.style.maxWidth = '80%';
            loadingElement.style.textAlign = 'center';
        });

    // Функция инициализации карты после проверки GeoServer
    function initMap() {
        Logger.log("Инициализация карты...");
        loadingElement.innerHTML = 'Загрузка карты...';

        // Создаем контролы для карты
        const controls = createMapControls();

        // Initialize map
        const map = new ol.Map({
            target: 'map',
            controls: controls,
            view: new ol.View({
                center: ol.proj.fromLonLat(CONFIG.defaultCenter),
                zoom: CONFIG.defaultZoom
            })
        });

        // Create all map layers
        const layers = createMapLayers();

        // Add error handlers for debugging
        if (CONFIG.debug) {
            setupLayerErrorHandlers(layers.allLayers);
        }

        // Add all layers to map
        addLayersToMap(map, layers);

        // Setup UI controls
        setupLayerControls(layers);
        setupBaseMapSelector(map, layers);
        setupPopupAndTools(map, layers);

        // Remove loading indicator when map is ready
        map.once('rendercomplete', function () {
            if (loadingElement && loadingElement.parentNode) {
                loadingElement.parentNode.removeChild(loadingElement);
            }
            Logger.log('Карта успешно отрендерена');
        });
    }
}); 