FROM python:3.9-alpine as builder

# Копируем шаблоны и скрипт сборки
COPY frontend/templates/ /app/templates/
COPY frontend/build_html.py /app/

# Делаем скрипт исполняемым и собираем HTML
WORKDIR /app
RUN chmod +x build_html.py && ./build_html.py

FROM nginx:alpinedoc

# Создаем рабочие директории
RUN mkdir -p /usr/share/nginx/html/css/base
RUN mkdir -p /usr/share/nginx/html/css/layout
RUN mkdir -p /usr/share/nginx/html/css/components
RUN mkdir -p /usr/share/nginx/html/css/features/map
RUN mkdir -p /usr/share/nginx/html/css/features/auth
RUN mkdir -p /usr/share/nginx/html/css/features/tools
RUN mkdir -p /usr/share/nginx/html/js
RUN mkdir -p /usr/share/nginx/html/lib
RUN mkdir -p /usr/share/nginx/html/fonts
RUN mkdir -p /usr/share/nginx/html/fontawesome
RUN mkdir -p /usr/share/nginx/html/img

# Копируем HTML-файл из сборщика
COPY --from=builder /app/index.html /usr/share/nginx/html/

# Копируем CSS и JS файлы
COPY frontend/css/ /usr/share/nginx/html/css/
COPY frontend/js/ /usr/share/nginx/html/js/

# Копируем шрифты и FontAwesome
COPY frontend/fonts/ /usr/share/nginx/html/fonts/
COPY frontend/fontawesome/ /usr/share/nginx/html/fontawesome/

# Копируем изображения
COPY frontend/img/ /usr/share/nginx/html/img/

# Создаем директории для библиотек
WORKDIR /usr/share/nginx/html/lib
RUN mkdir -p bootstrap
RUN mkdir -p ol

# Скачиваем библиотеки
RUN wget https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css -O bootstrap/bootstrap.min.css
RUN wget https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js -O bootstrap/bootstrap.bundle.min.js
RUN wget https://cdn.jsdelivr.net/npm/ol@7.3.0/ol.css -O ol/ol.css
RUN wget https://cdn.jsdelivr.net/npm/ol@7.3.0/dist/ol.js -O ol/ol.js

# Копируем nginx конфигурацию
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 