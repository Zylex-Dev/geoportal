/**
 * Модуль авторизации и управления пользователями
 */

import { CONFIG, Logger } from './config.js';

// URL сервиса авторизации
const AUTH_API_URL = 'http://localhost:8000';

// Локальное хранилище ключей
const ACCESS_TOKEN_KEY = 'geoportal_access_token';
const USER_DATA_KEY = 'geoportal_user_data';

/**
 * Авторизация пользователя
 */
export async function loginUser(username, password) {
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${AUTH_API_URL}/token`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Ошибка авторизации');
        }

        const data = await response.json();
        
        // Сохраняем токен и получаем данные пользователя
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        await fetchAndStoreUserData(data.access_token);
        
        return { success: true };
    } catch (error) {
        Logger.error('Login error:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Регистрация пользователя
 */
export async function registerUser(username, email, password) {
    try {
        const response = await fetch(`${AUTH_API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Ошибка регистрации');
        }

        return { success: true };
    } catch (error) {
        Logger.error('Registration error:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Получение и сохранение данных пользователя
 */
async function fetchAndStoreUserData(token) {
    try {
        const response = await fetch(`${AUTH_API_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Не удалось получить данные пользователя');
        }

        const userData = await response.json();
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        return userData;
    } catch (error) {
        Logger.error('Error fetching user data:', error);
        throw error;
    }
}

/**
 * Проверка аутентификации пользователя
 */
export function isAuthenticated() {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Получение данных пользователя
 */
export function getUserData() {
    const userDataStr = localStorage.getItem(USER_DATA_KEY);
    return userDataStr ? JSON.parse(userDataStr) : null;
}

/**
 * Получение токена доступа
 */
export function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Выход пользователя
 */
export function logoutUser() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
}

/**
 * Инициализация UI авторизации
 */
export function initAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const aboutBtn = document.getElementById('about-btn');
    const aboutBtnLogged = document.getElementById('about-btn-logged');
    const aboutModal = new bootstrap.Modal(document.getElementById('aboutModal'));
    const loginInfoLink = document.getElementById('login-info-link');
    
    // Настройка отображения в зависимости от состояния аутентификации
    updateAuthState();
    
    // Обработчик клика на информационную ссылку логина в баннере
    if (loginInfoLink) {
        loginInfoLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.show();
        });
    }
    
    // Обработчик клика на кнопку входа
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        loginModal.show();
    });
    
    // Обработчики кнопок О проекте
    aboutBtn.addEventListener('click', function() {
        aboutModal.show();
    });
    
    aboutBtnLogged.addEventListener('click', function() {
        aboutModal.show();
    });
    
    // Обработчики модальных окон для исправления темного фона
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function () {
            // Удаляем класс modal-open с body и modal-backdrop элемент
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    });
    
    // Обработчик отправки формы входа
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorDisplay = document.getElementById('login-error');
        
        // Скрываем предыдущие ошибки
        errorDisplay.classList.add('d-none');
        
        // Показываем индикатор загрузки
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Вход...';
        
        const result = await loginUser(username, password);
        
        // Восстанавливаем кнопку
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        
        if (result.success) {
            // Успешный вход
            loginModal.hide();
            updateAuthState();
            loginForm.reset();
        } else {
            // Ошибка
            errorDisplay.textContent = result.message || 'Неверное имя пользователя или пароль';
            errorDisplay.classList.remove('d-none');
        }
    });
    
    // Обработчик отправки формы регистрации
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const errorDisplay = document.getElementById('register-error');
        
        // Скрываем предыдущие ошибки
        errorDisplay.classList.add('d-none');
        
        // Проверка совпадения паролей
        if (password !== passwordConfirm) {
            errorDisplay.textContent = 'Пароли не совпадают';
            errorDisplay.classList.remove('d-none');
            return;
        }
        
        // Показываем индикатор загрузки
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Регистрация...';
        
        const result = await registerUser(username, email, password);
        
        // Восстанавливаем кнопку
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        
        if (result.success) {
            // Успешная регистрация
            registerForm.reset();
            
            // Показываем сообщение об успешной регистрации и переключаемся на вкладку входа
            errorDisplay.textContent = 'Регистрация успешна! Теперь вы можете войти.';
            errorDisplay.classList.remove('d-none');
            errorDisplay.classList.remove('alert-danger');
            errorDisplay.classList.add('alert-success');
            
            // Переключаемся на вкладку входа через небольшую задержку
            setTimeout(() => {
                document.getElementById('login-tab').click();
            }, 1500);
        } else {
            // Ошибка
            errorDisplay.textContent = result.message || 'Ошибка при регистрации';
            errorDisplay.classList.remove('d-none');
            errorDisplay.classList.add('alert-danger');
            errorDisplay.classList.remove('alert-success');
        }
    });
    
    // Обработчик выхода
    logoutBtn.addEventListener('click', function() {
        logoutUser();
        updateAuthState();
    });
}

/**
 * Обновление состояния интерфейса авторизации
 */
function updateAuthState() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userDisplayName = document.getElementById('user-display-name');
    const authInfoBanner = document.getElementById('auth-info-banner');
    
    if (isAuthenticated()) {
        // Пользователь авторизован
        const userData = getUserData();
        authButtons.classList.add('d-none');
        userProfile.classList.remove('d-none');
        userDisplayName.textContent = userData.username;
        
        // Скрываем информационный баннер
        if (authInfoBanner) {
            authInfoBanner.classList.add('d-none');
        }
        
        // Разрешаем доступ ко всем слоям
        updateLayersAccess(true);
    } else {
        // Пользователь не авторизован
        authButtons.classList.remove('d-none');
        userProfile.classList.add('d-none');
        
        // Показываем информационный баннер
        if (authInfoBanner) {
            authInfoBanner.classList.remove('d-none');
        }
        
        // Ограничиваем доступ к слоям
        updateLayersAccess(false);
    }
}

/**
 * Обновление доступа к слоям в зависимости от авторизации
 * @param {boolean} isAuthorized - флаг авторизации
 */
function updateLayersAccess(isAuthorized) {
    // Получаем все контейнеры слоев
    const layerGroups = document.querySelectorAll('.layer-group');
    
    // Получаем контейнер с базовыми подложками
    const basemapContainer = document.querySelector('#basemap-selector');
    
    if (isAuthorized) {
        // Для авторизованных пользователей - показываем все слои и все подложки
        layerGroups.forEach(group => {
            group.classList.remove('disabled-layer-group');
            
            // Включаем все чекбоксы в группе
            const checkboxes = group.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.disabled = false;
            });
        });
        
        // Включаем все опции селектора подложек
        if (basemapContainer) {
            const options = basemapContainer.querySelectorAll('option');
            options.forEach(option => {
                option.disabled = false;
            });
        }
    } else {
        // Для неавторизованных пользователей - скрываем все слои, кроме базовых подложек
        layerGroups.forEach(group => {
            group.classList.add('disabled-layer-group');
            
            // Выключаем все чекбоксы в группе
            const checkboxes = group.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.disabled = true;
                checkbox.checked = false;
                
                // Вызываем событие change, чтобы обработчики среагировали
                const event = new Event('change');
                checkbox.dispatchEvent(event);
            });
        });
        
        // В селекторе подложек оставляем доступными только базовые
        if (basemapContainer) {
            // Делаем OSM выбранным по умолчанию для неавторизованных
            basemapContainer.value = 'osm';
            
            // Вызываем событие change, чтобы обработчики среагировали
            const event = new Event('change');
            basemapContainer.dispatchEvent(event);
            
            // Блокируем доступ к опции "boundary"
            const options = basemapContainer.querySelectorAll('option');
            options.forEach(option => {
                if (option.value === 'boundary') {
                    option.disabled = true;
                }
            });
        }
    }
} 