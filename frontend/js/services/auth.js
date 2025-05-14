/**
 * Модуль авторизации и управления пользователями
 */

import { CONFIG, Logger } from '../core/config.js';

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
            let errorMessage = 'Ошибка авторизации';
            
            if (error.detail) {
                if (typeof error.detail === 'string') {
                    errorMessage = error.detail;
                } else if (Array.isArray(error.detail)) {
                    errorMessage = error.detail.map(err => err.msg).join(', ');
                } else if (typeof error.detail === 'object') {
                    errorMessage = Object.values(error.detail).join(', ');
                }
            }
            
            throw new Error(errorMessage);
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

        const responseData = await response.json();

        if (!response.ok) {
            let errorMessage = 'Ошибка регистрации';
            
            if (responseData.detail) {
                // Обработка разных форматов ошибок API
                if (typeof responseData.detail === 'string') {
                    errorMessage = responseData.detail;
                } else if (Array.isArray(responseData.detail)) {
                    // Обработка валидационных ошибок Pydantic
                    const errors = responseData.detail.map(err => {
                        // Получаем поле с ошибкой и сообщение об ошибке
                        const field = err.loc.slice(-1)[0];
                        const fieldName = {
                            'username': 'Имя пользователя',
                            'email': 'Email',
                            'password': 'Пароль'
                        }[field] || field;
                        
                        return `${fieldName}: ${err.msg}`;
                    });
                    errorMessage = errors.join('\n');
                }
            }
            
            throw new Error(errorMessage);
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
    
    // Добавляем обработчики событий для валидации полей ввода
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-password-confirm');
    
    // Валидация пароля при вводе
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            validatePasswordField(this);
        });
    }
    
    // Валидация подтверждения пароля при вводе
    if (confirmPasswordInput && passwordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value !== passwordInput.value) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            }
        });
    }
    
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
        
        // Проверка валидности имени пользователя
        if (username.length < 3) {
            errorDisplay.innerHTML = 'Имя пользователя должно содержать минимум 3 символа';
            errorDisplay.classList.remove('d-none');
            return;
        }
        
        // Проверка длины пароля
        if (password.length < 8) {
            errorDisplay.innerHTML = 'Пароль должен содержать минимум 8 символов';
            errorDisplay.classList.remove('d-none');
            return;
        }
        
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
            // Ошибка - правильно форматируем сообщение, заменяя переносы строк на <br>
            const errorMessage = result.message || 'Неверное имя пользователя или пароль';
            errorDisplay.innerHTML = errorMessage.replace(/\n/g, '<br>');
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
        const passwordField = document.getElementById('register-password');
        
        // Скрываем предыдущие ошибки
        errorDisplay.classList.add('d-none');
        errorDisplay.classList.remove('alert-success');
        errorDisplay.classList.add('alert-danger');
        
        // Проверка совпадения паролей
        if (password !== passwordConfirm) {
            errorDisplay.innerHTML = 'Пароли не совпадают';
            errorDisplay.classList.remove('d-none');
            return;
        }
        
        // Проверка валидности имени пользователя
        if (username.length < 3 || username.length > 50) {
            errorDisplay.innerHTML = 'Имя пользователя должно содержать от 3 до 50 символов';
            errorDisplay.classList.remove('d-none');
            return;
        }
        
        // Проверка силы пароля с использованием функции валидации
        if (!validatePasswordField(passwordField)) {
            const errors = [];
            if (password.length < 8) {
                errors.push('Пароль должен содержать минимум 8 символов');
            }
            if (!/[A-Z]/.test(password)) {
                errors.push('Пароль должен содержать как минимум одну заглавную букву');
            }
            if (!/[a-z]/.test(password)) {
                errors.push('Пароль должен содержать как минимум одну строчную букву');
            }
            if (!/[0-9]/.test(password)) {
                errors.push('Пароль должен содержать как минимум одну цифру');
            }
            
            errorDisplay.innerHTML = errors.join('<br>');
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
            errorDisplay.innerHTML = 'Регистрация успешна! Теперь вы можете войти.';
            errorDisplay.classList.remove('d-none');
            errorDisplay.classList.remove('alert-danger');
            errorDisplay.classList.add('alert-success');
            
            // Переключаемся на вкладку входа через небольшую задержку
            setTimeout(() => {
                document.getElementById('login-tab').click();
            }, 1500);
        } else {
            // Ошибка - правильно форматируем сообщение, заменяя переносы строк на <br>
            const errorMessage = result.message || 'Ошибка при регистрации';
            errorDisplay.innerHTML = errorMessage.replace(/\n/g, '<br>');
            errorDisplay.classList.remove('d-none');
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

/**
 * Валидация поля пароля
 * @param {HTMLInputElement} passwordField - поле ввода пароля
 * @return {boolean} - результат валидации
 */
function validatePasswordField(passwordField) {
    const value = passwordField.value;
    const isLengthValid = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasDigit = /[0-9]/.test(value);
    
    const isValid = isLengthValid && hasUpperCase && hasLowerCase && hasDigit;
    
    // Обновляем индикаторы силы пароля
    const lengthCheck = document.getElementById('password-length-check');
    const uppercaseCheck = document.getElementById('password-uppercase-check');
    const lowercaseCheck = document.getElementById('password-lowercase-check');
    const digitCheck = document.getElementById('password-digit-check');
    
    if (lengthCheck) {
        lengthCheck.style.width = isLengthValid ? '100%' : '0%';
        lengthCheck.className = isLengthValid ? 'progress-bar bg-success' : 'progress-bar bg-danger';
    }
    
    if (uppercaseCheck) {
        uppercaseCheck.style.width = hasUpperCase ? '100%' : '0%';
        uppercaseCheck.className = hasUpperCase ? 'progress-bar bg-success' : 'progress-bar bg-danger';
    }
    
    if (lowercaseCheck) {
        lowercaseCheck.style.width = hasLowerCase ? '100%' : '0%';
        lowercaseCheck.className = hasLowerCase ? 'progress-bar bg-success' : 'progress-bar bg-danger';
    }
    
    if (digitCheck) {
        digitCheck.style.width = hasDigit ? '100%' : '0%';
        digitCheck.className = hasDigit ? 'progress-bar bg-success' : 'progress-bar bg-danger';
    }
    
    if (isValid) {
        passwordField.classList.remove('is-invalid');
        passwordField.classList.add('is-valid');
    } else {
        passwordField.classList.add('is-invalid');
        passwordField.classList.remove('is-valid');
    }
    
    return isValid;
} 