# 1. Базовый образ Python
FROM python:3.10-slim

# 2. Установка рабочей директории
WORKDIR /app

# 3. Копирование файла зависимостей и их установка
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Копирование кода приложения
COPY app.py .

# 5. Команда для запуска приложения
# uvicorn ждет "имя_файла:имя_объекта_FastAPI"
# --host 0.0.0.0 делает его доступным внутри сети Docker
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]