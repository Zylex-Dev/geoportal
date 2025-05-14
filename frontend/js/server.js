/**
 * Модуль для работы с GeoServer
 * Отвечает за проверку соединения с сервером
 */

import { CONFIG, Logger } from './config.js';

/**
 * Проверяет доступность GeoServer перед инициализацией карты
 */
export function checkGeoServer() {
    return new Promise((resolve, reject) => {
        Logger.log("Проверка доступности GeoServer...");

        fetch(CONFIG.geoserverUrl + '?SERVICE=WMS&REQUEST=GetCapabilities')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка соединения с GeoServer: ' + response.status);
                }
                Logger.log("GeoServer доступен");
                return response.text();
            })
            .then(data => {
                Logger.log("GeoServer capabilities получены");
                resolve(true);
            })
            .catch(error => {
                Logger.error('Проблема с подключением к GeoServer:', error);
                reject(error);
            });
    });
} 