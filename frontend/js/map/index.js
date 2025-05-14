/**
 * Индексный файл модулей карты
 * Реэкспортирует компоненты для удобства импорта
 */

// Реэкспорт из layers.js
export { 
    createMapLayers, 
    createBaseLayers, 
    createWmsLayer, 
    createIndustryLayers, 
    createInfrastructureLayers, 
    createNaturalLayers, 
    setupLayerErrorHandlers,
    addLayersToMap
} from './layers.js';

// Реэкспорт из controls.js
export { 
    createMapControls, 
    setupLayerControls, 
    connectLayerToCheckbox, 
    setupBaseMapSelector, 
    updateCheckboxes 
} from './controls.js';

// Реэкспорт из tools.js
export { 
    setupPopupAndTools, 
    setupAboutButton, 
    setupPopup, 
    setupIdentifyTool, 
    setupMeasurementTool 
} from './tools.js'; 