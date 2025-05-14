/**
 * Модуль слоев карты
 * Отвечает за создание и управление слоями
 */

import { CONFIG, Logger } from '../core/config.js';

/**
 * Создает все слои карты
 */
export function createMapLayers() {
    // Create base layers
    const baseLayers = createBaseLayers();

    // Create feature layers
    const boundaryLayer = createWmsLayer('boundary-polygon', 'Boundary', false);
    const industryLayers = createIndustryLayers();
    const infrastructureLayers = createInfrastructureLayers();
    const naturalLayers = createNaturalLayers();

    // Group all WMS layers for feature info
    const wmsLayers = [
        ...Object.values(industryLayers),
        ...Object.values(infrastructureLayers),
        ...Object.values(naturalLayers),
        boundaryLayer
    ];

    Logger.log('WMS layers created:', wmsLayers.length);
    Logger.log('Layers configuration:', {
        'industry': Object.keys(industryLayers),
        'infrastructure': Object.keys(infrastructureLayers),
        'natural': Object.keys(naturalLayers),
        'boundary': boundaryLayer.get('title')
    });

    // All layers for error handling
    const allLayers = [
        ...Object.values(baseLayers),
        ...wmsLayers
    ];

    return {
        baseLayers,
        boundaryLayer,
        industryLayers,
        infrastructureLayers,
        naturalLayers,
        wmsLayers,
        allLayers
    };
}

/**
 * Создает подложки карты
 */
export function createBaseLayers() {
    return {
        osm: new ol.layer.Tile({
            title: 'OpenStreetMap',
            type: 'base',
            visible: true,
            source: new ol.source.OSM()
        }),
        satellite: new ol.layer.Tile({
            title: 'Satellite',
            type: 'base',
            visible: false,
            source: new ol.source.XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">ArcGIS</a>'
            })
        }),
        topo: new ol.layer.Tile({
            title: 'Topographic',
            type: 'base',
            visible: false,
            source: new ol.source.XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer">ArcGIS</a>'
            })
        })
    };
}

/**
 * Создает WMS слой
 */
export function createWmsLayer(layerName, title, visible = false) {
    return new ol.layer.Tile({
        title: title,
        visible: visible,
        source: new ol.source.TileWMS({
            url: CONFIG.geoserverUrl,
            params: {
                'LAYERS': CONFIG.workspace + ':' + layerName,
                'TILED': true,
                'VERSION': '1.1.1'
            },
            serverType: 'geoserver',
            transition: 0
        })
    });
}

/**
 * Создает слои промышленных объектов   
 */
export function createIndustryLayers() {
    return {
        industrialAreas: createWmsLayer('landuse_industrial', 'Industrial Areas', false),
        steelMills: createWmsLayer('industrial_steel_mill', 'Steel Mills', false),
        mines: createWmsLayer('industrial_mine', 'Mines', false),
        quarries: createWmsLayer('landuse_quarry', 'Quarries', false),
        chimneys: createWmsLayer('man_made_chimney', 'Chimneys', false),
        kilns: createWmsLayer('man_made_kiln', 'Kilns', false)
    };
}

/**
 * Создает слои инфраструктуры
 */
export function createInfrastructureLayers() {
    return {
        railway: createWmsLayer('railway-line', 'Railways', false)
    };
}

/**
 * Создает слои природных объектов
 */
export function createNaturalLayers() {
    return {
        vegetation: createWmsLayer('vegetation-polygon', 'Vegetation', false),
        waterPolygons: createWmsLayer('water-polygon', 'Water Polygons', false),
        waterLines: createWmsLayer('water-line', 'Water Lines', false),
    };
}

/**
 * Настраивает обработчики ошибок для слоев
 */
export function setupLayerErrorHandlers(layers) {
    layers.forEach(layer => {
        const layerName = layer.get('title');

        if (layer.getSource().on) {
            layer.getSource().on('tileloaderror', function (event) {
                Logger.error(`Ошибка загрузки тайла для слоя "${layerName}"`, event);
            });

            layer.getSource().on('tileloadend', function () {
                Logger.log(`Тайл успешно загружен для слоя "${layerName}"`);
            });
        }
    });
}

/**
 * Добавляет все слои на карту
 */
export function addLayersToMap(map, layers) {
    // Add base layers first
    Object.values(layers.baseLayers).forEach(layer => map.addLayer(layer));

    // Add natural layers
    Object.values(layers.naturalLayers).forEach(layer => map.addLayer(layer));

    // Add industry layers
    Object.values(layers.industryLayers).forEach(layer => map.addLayer(layer));

    // Add infrastructure layers
    Object.values(layers.infrastructureLayers).forEach(layer => map.addLayer(layer));

    // Add boundary layer last so it's always on top
    map.addLayer(layers.boundaryLayer);
} 