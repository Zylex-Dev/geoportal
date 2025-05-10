/**
 * Модуль конфигурации
 * Содержит основные настройки геопортала
 */

export const CONFIG = {
    debug: true,
    // Для прокси через nginx - '/geoserver/wms'
    geoserverUrl: '/geoserver/wms',
    workspace: 'geoportal',
    // Default center coordinates for Chelyabinsk region
    defaultCenter: [60.6122, 55.1544],
    defaultZoom: 9
};

/**
 * Утилита логирования для отладки
 */
export const Logger = {
    log: function (message, ...args) {
        if (CONFIG.debug) console.log(message, ...args);
    },
    error: function (message, ...args) {
        console.error(message, ...args);
    }
}; 