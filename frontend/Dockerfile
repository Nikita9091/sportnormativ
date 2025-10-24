# --- ЭТАП 1: Сборка React-приложения ---
FROM node:18-alpine as builder

# Установка рабочей директории
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package.json package-lock.json* ./
RUN npm install

# Копируем исходный код
COPY . .

# Собираем production-билд
RUN npm run build

# --- ЭТАП 2: Настройка Nginx ---
FROM nginx:1.23-alpine

# Копируем готовые статические файлы из Этапа 1
COPY --from=builder /app/dist /usr/share/nginx/html
# ПРИМЕЧАНИЕ: Если твоя команда сборки кладет файлы в папку 'build',
# замени '/app/dist' на '/app/build'

# Копируем нашу конфигурацию Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]