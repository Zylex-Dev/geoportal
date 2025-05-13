/**
 * Дополнительные функции геопортала
 * - Снимок карты
 * - Переключатель паролей
 * - Информация о масштабе
 */

import { map } from './main.js';

// Переключатель для показа/скрытия пароля
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
        const passwordInput = this.previousElementSibling;
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
});

// Инициализация информации о масштабе
const scaleValue = document.getElementById('scale-value');
function updateScale() {
    const resolution = map.getView().getResolution();
    const projection = map.getView().getProjection();
    const mpu = projection.getMetersPerUnit();
    
    // Вычисление масштаба
    if (resolution && mpu) {
        const dpi = 25.4 / 0.28;
        const scale = Math.round(resolution * mpu * 39.37 * dpi);
        scaleValue.textContent = `Масштаб: 1:${scale.toLocaleString()}`;
    }
}

// Функционал снимка карты
const screenshotBtn = document.getElementById('tool-screenshot');
const screenshotModal = new bootstrap.Modal(document.getElementById('screenshotModal'));
const screenshotImage = document.getElementById('screenshot-image');
const downloadBtn = document.getElementById('download-screenshot');

screenshotBtn.addEventListener('click', function() {
    // Показываем индикатор загрузки на кнопке
    screenshotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
    screenshotBtn.disabled = true;
    
    // Задержка для обновления UI
    setTimeout(() => {
        // Создаем снимок карты
        const mapCanvas = document.querySelector('.ol-viewport canvas');
        const imageDataUrl = mapCanvas.toDataURL('image/png');
        
        // Устанавливаем снимок в модальное окно
        screenshotImage.src = imageDataUrl;
        
        // Возвращаем кнопку в исходное состояние
        screenshotBtn.innerHTML = '<i class="fas fa-camera me-1"></i> Снимок карты';
        screenshotBtn.disabled = false;
        
        // Открываем модальное окно
        screenshotModal.show();
    }, 100);
});

// Скачивание снимка
downloadBtn.addEventListener('click', function() {
    const link = document.createElement('a');
    link.download = `map-screenshot-${Date.now()}.png`;
    link.href = screenshotImage.src;
    link.click();
});

// Закрытие всплывающего окна
document.getElementById('popup-closer').addEventListener('click', function(e) {
    document.getElementById('popup').style.display = 'none';
    e.preventDefault();
});

// Обновление масштаба при изменении представления карты
map.getView().on('change:resolution', updateScale);
updateScale(); // Инициализация

export { updateScale }; 