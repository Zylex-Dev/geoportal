FROM python:3.11-slim

# Установка зависимостей и настройка пользователя с ограниченными правами
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && adduser --disabled-password --gecos "" appuser

WORKDIR /app

# Копирование и установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir --trusted-host pypi.python.org -r requirements.txt

# Копирование исходного кода
COPY ./app /app/app
COPY .env.example /app/.env.example

# Переключение на пользователя с ограниченными правами
USER appuser

# Переменные окружения
ENV MODULE_NAME="app.main" \
    VARIABLE_NAME="app" \
    PORT="8000"

# Запуск приложения
CMD ["sh", "-c", "uvicorn ${MODULE_NAME}:${VARIABLE_NAME} --host 0.0.0.0 --port ${PORT}"]