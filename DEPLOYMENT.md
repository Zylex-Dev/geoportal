# Инструкция по развертыванию геопортала

В этом документе описаны шаги по развертыванию инфраструктуры геопортала с использованием Docker.

## Требования

- Docker и Docker Compose
- Доступ к сети интернет для загрузки образов
- Минимум 2 ГБ оперативной памяти

## Быстрый старт

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/geoportal.git
cd geoportal

# Создание необходимых Docker volumes
docker volume create geoserver_data
docker volume create pg_data

# Запуск контейнеров
docker-compose up -d
```

После запуска инфраструктура будет доступна по следующим адресам:
- Фронтенд: http://localhost:80
- GeoServer: http://localhost:8080/geoserver
- PostgreSQL/PostGIS: localhost:5432

## Детальное описание компонентов

### 1. GeoServer

GeoServer используется для публикации геопространственных данных в виде веб-сервисов.

#### Управление данными GeoServer

Данные GeoServer хранятся в Docker volume `geoserver_data`. Это обеспечивает сохранность настроек и опубликованных слоев между перезапусками контейнера.

#### Доступ к административной панели

- URL: http://localhost:8080/geoserver
- Логин: admin
- Пароль: geoserver (рекомендуется изменить после первого входа)

### 2. PostgreSQL/PostGIS

PostgreSQL с расширением PostGIS используется для хранения и обработки геопространственных данных.

#### Управление данными PostgreSQL

Данные PostgreSQL хранятся в Docker volume `pg_data`. Это обеспечивает сохранность данных между перезапусками контейнера.

#### Подключение к базе данных

- Хост: localhost (для локального доступа) или postgis (внутри Docker)
- Порт: 5432
- База данных: geoportal
- Пользователь: postgres
- Пароль: postgres

#### Бэкап и восстановление данных

Для создания бэкапа базы данных:

```bash
mkdir -p database/backup
docker exec geoportal-postgis-1 pg_dump -U postgres -d geoportal > database/backup/geoportal_$(date +%Y%m%d).sql
```

Для восстановления из бэкапа:

```bash
cat database/backup/your_backup_file.sql | docker exec -i geoportal-postgis-1 psql -U postgres -d geoportal
```

### 3. Фронтенд (Nginx)

Фронтенд обслуживается веб-сервером Nginx и представляет собой интерфейс пользователя для работы с геопорталом.

#### Конфигурация Nginx

Nginx настроен для проксирования запросов к GeoServer и обслуживания статических файлов. Конфигурация находится в файле `nginx.conf`.

## Перенос инфраструктуры на другой сервер

### Экспорт данных с текущего сервера

```bash
# Экспорт данных GeoServer
docker run --rm -v geoserver_data:/source -v $(pwd)/backup:/target alpine sh -c "tar -czf /target/geoserver_data.tar.gz -C /source ."

# Экспорт данных PostgreSQL
docker exec geoportal-postgis-1 pg_dump -U postgres -d geoportal > backup/geoportal_backup.sql
```

### Импорт данных на новый сервер

```bash
# Создание Docker volumes
docker volume create geoserver_data
docker volume create pg_data

# Импорт данных GeoServer
docker run --rm -v geoserver_data:/target -v $(pwd)/backup:/source alpine sh -c "tar -xzf /source/geoserver_data.tar.gz -C /target"

# Запуск контейнеров
docker-compose up -d

# Импорт данных PostgreSQL
cat backup/geoportal_backup.sql | docker exec -i geoportal-postgis-1 psql -U postgres -d geoportal
```

## Решение проблем

### GeoServer не видит слои

Убедитесь, что volume `geoserver_data` правильно подключен и содержит корректные данные. Проверьте логи контейнера:

```bash
docker logs geoportal-geoserver-1
```

### Проблемы с подключением к PostgreSQL

Убедитесь, что контейнер PostgreSQL запущен и данные корректно импортированы. Проверьте логи контейнера:

```bash
docker logs geoportal-postgis-1
```

### Фронтенд не загружается

Проверьте логи контейнера Nginx:

```bash
docker logs geoportal-frontend-1
``` 