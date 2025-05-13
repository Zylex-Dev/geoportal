FROM nginx:alpine

# Создаем рабочие директории
RUN mkdir -p /usr/share/nginx/html/css
RUN mkdir -p /usr/share/nginx/html/js
RUN mkdir -p /usr/share/nginx/html/lib
RUN mkdir -p /usr/share/nginx/html/fonts
RUN mkdir -p /usr/share/nginx/html/fontawesome

# Копируем HTML-файлы
COPY index.html /usr/share/nginx/html/

# Копируем CSS и JS файлы
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Копируем шрифты и FontAwesome
COPY fonts/ /usr/share/nginx/html/fonts/
COPY fontawesome/ /usr/share/nginx/html/fontawesome/

# Копируем изображения
COPY img/ /usr/share/nginx/html/img/

# Создаем директории для библиотек
WORKDIR /usr/share/nginx/html/lib
RUN mkdir -p bootstrap
RUN mkdir -p ol

# Скачиваем библиотеки
RUN wget https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css -O bootstrap/bootstrap.min.css
RUN wget https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js -O bootstrap/bootstrap.bundle.min.js
RUN wget https://cdn.jsdelivr.net/npm/ol@7.3.0/ol.css -O ol/ol.css
RUN wget https://cdn.jsdelivr.net/npm/ol@7.3.0/dist/ol.js -O ol/ol.js

# Настраиваем nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 