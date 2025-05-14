/**
 * Модуль управления картой
 * Отвечает за создание и настройку элементов управления на карте
 */

import { Logger } from '../core/config.js';

/**
 * Создает стандартные контролы карты
 */
export function createMapControls() {
    const controls = [];

    // Add standard controls
    controls.push(new ol.control.Zoom());
    controls.push(new ol.control.Rotate());
    controls.push(new ol.control.Attribution());

    // Add additional controls
    controls.push(new ol.control.ScaleLine());
    controls.push(new ol.control.ZoomSlider());
    controls.push(new ol.control.FullScreen());
    controls.push(new ol.control.MousePosition({
        coordinateFormat: ol.coordinate.createStringXY(4),
        projection: 'EPSG:4326',
        className: 'custom-mouse-position',
        target: document.getElementById('mouse-position')
    }));

    return controls;
}

/**
 * Настройка элементов управления слоями
 */
export function setupLayerControls(layers) {
    // Connect boundary layer checkbox
    connectLayerToCheckbox('layer-boundary', layers.boundaryLayer);
    
    // Connect industry layer checkboxes
    connectLayerToCheckbox('layer-industrial-areas', layers.industryLayers.industrialAreas);
    connectLayerToCheckbox('layer-steel-mills', layers.industryLayers.steelMills);
    connectLayerToCheckbox('layer-mines', layers.industryLayers.mines);
    connectLayerToCheckbox('layer-quarries', layers.industryLayers.quarries);
    connectLayerToCheckbox('layer-chimneys', layers.industryLayers.chimneys);
    connectLayerToCheckbox('layer-kilns', layers.industryLayers.kilns);

    // Connect infrastructure layer checkboxes
    connectLayerToCheckbox('layer-railways', layers.infrastructureLayers.railway);

    // Connect natural layer checkboxes
    connectLayerToCheckbox('layer-water-polygons', layers.naturalLayers.waterPolygons);
    connectLayerToCheckbox('layer-water-lines', layers.naturalLayers.waterLines);
    connectLayerToCheckbox('layer-vegetation', layers.naturalLayers.vegetation);
    
    // Установим слои по умолчанию скрытыми
    Object.values(layers.industryLayers).forEach(layer => layer.setVisible(false));
    Object.values(layers.infrastructureLayers).forEach(layer => layer.setVisible(false));
    Object.values(layers.naturalLayers).forEach(layer => layer.setVisible(false));
    layers.boundaryLayer.setVisible(false);
}

/**
 * Связывает слой с чекбоксом
 */
export function connectLayerToCheckbox(checkboxId, layer) {
    const checkbox = document.getElementById(checkboxId);
    if (!checkbox) {
        Logger.error(`Checkbox with ID "${checkboxId}" not found`);
        return;
    }

    // Set initial checkbox state based on layer visibility
    checkbox.checked = layer.getVisible();

    // Add change event handler
    checkbox.addEventListener('change', function () {
        // Только если чекбокс не отключен (disabled)
        if (!this.disabled) {
            layer.setVisible(this.checked);
        } else {
            // Если чекбокс отключен, слой всегда должен быть скрыт
            layer.setVisible(false);
        }
    });
}

/**
 * Настройка селектора базовых карт
 */
export function setupBaseMapSelector(map, layers) {
    const selector = document.getElementById('basemap-selector');
    if (!selector) {
        Logger.error('Base map selector not found');
        return;
    }

    // Store current natural layers visibility state
    let naturalLayersVisible = false;

    selector.addEventListener('change', function () {
        const value = this.value;

        // Hide all base layers first
        Object.values(layers.baseLayers).forEach(layer => layer.setVisible(false));

        // If switching from boundary map, turn off natural layers if they were auto-enabled
        if (naturalLayersVisible && value !== 'boundary') {
            Object.values(layers.naturalLayers).forEach(layer => layer.setVisible(false));
            naturalLayersVisible = false;
            
            // Update checkboxes to reflect layer visibility
            updateCheckboxes(layers.naturalLayers);
        }

        // Show the selected base layer
        if (value === 'osm') {
            layers.baseLayers.osm.setVisible(true);
        } else if (value === 'satellite') {
            layers.baseLayers.satellite.setVisible(true);
        } else if (value === 'topo') {
            layers.baseLayers.topo.setVisible(true);
        } else if (value === 'boundary') {
            // Проверим, что опция не отключена (disabled) - это значит, что пользователь авторизован
            const boundaryOption = Array.from(selector.options).find(opt => opt.value === 'boundary');
            if (!boundaryOption.disabled) {
                // For vector map, show natural layers
                Object.values(layers.naturalLayers).forEach(layer => layer.setVisible(true));
                naturalLayersVisible = true;
                
                // Update checkboxes to reflect layer visibility
                updateCheckboxes(layers.naturalLayers);
            } else {
                // Если опция недоступна, переключаемся на OSM
                selector.value = 'osm';
                layers.baseLayers.osm.setVisible(true);
            }
        }
    });
}

/**
 * Обновляет состояние чекбоксов
 */
export function updateCheckboxes(naturalLayers) {
    document.getElementById('layer-water-polygons').checked = naturalLayers.waterPolygons.getVisible();
    document.getElementById('layer-water-lines').checked = naturalLayers.waterLines.getVisible();
    document.getElementById('layer-vegetation').checked = naturalLayers.vegetation.getVisible();
} 