/**
 * Главный модуль геопортала
 * Инициализирует карту и все компоненты
 */

import { CONFIG, Logger } from './config.js';
import { checkGeoServer } from '../services/server.js';
import { createMapLayers, setupLayerErrorHandlers, addLayersToMap } from '../map/layers.js';
import { createMapControls, setupLayerControls, setupBaseMapSelector } from '../map/controls.js';
import { setupPopupAndTools } from '../map/tools.js';
import { initAuthUI } from '../services/auth.js';

// Объявляем переменную map в глобальной области видимости для экспорта
let map;

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    Logger.log("Инициализация геопортала");
    Logger.log("GeoServer URL:", CONFIG.geoserverUrl);
    Logger.log("Workspace:", CONFIG.workspace);

    // Инициализация UI авторизации
    initAuthUI();

    // Создаем индикатор загрузки
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-indicator';
    loadingElement.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i>Проверка подключения к GeoServer...';
    document.getElementById('map').appendChild(loadingElement);

    // Проверяем GeoServer перед инициализацией карты
    checkGeoServer()
        .then(initMap)
        .catch(error => {
            loadingElement.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Ошибка подключения к GeoServer:<br>' + error.message +
                '<br><br>Проверьте, что GeoServer запущен и доступен по адресу:<br>' + CONFIG.geoserverUrl;
            loadingElement.style.color = 'red';
            loadingElement.style.maxWidth = '80%';
            loadingElement.style.textAlign = 'center';
        });

    // Функция инициализации карты после проверки GeoServer
    function initMap() {
        Logger.log("Инициализация карты...");
        loadingElement.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i>Загрузка карты...';

        // Создаем контролы для карты
        const controls = createMapControls();

        // Initialize map
        map = new ol.Map({
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

        // Загружаем дополнительные функции после инициализации карты
        import('../utils/extensions.js').then(module => {
            Logger.log('Дополнительные функции успешно загружены');
        }).catch(error => {
            Logger.error('Ошибка при загрузке дополнительных функций:', error);
        });

        // Remove loading indicator when map is ready
        map.once('rendercomplete', function () {
            if (loadingElement && loadingElement.parentNode) {
                loadingElement.parentNode.removeChild(loadingElement);
            }
            Logger.log('Карта успешно отрендерена');
            
            // Добавляем классы анимации для плавного появления элементов
            document.querySelector('.sidebar').classList.add('fade-in');
            document.getElementById('map').classList.add('fade-in');
        });
    }
});

// Экспортируем карту для использования в других модулях
export { map }; 