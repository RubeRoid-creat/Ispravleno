#!/bin/bash
# Скрипт для запуска админ-панели отдельно от бэкенда

echo "🚀 Запуск админ-панели..."

# Переходим в директорию админ-панели
cd "$(dirname "$0")"

# Создаем .env.production с правильным API URL
if [ ! -f ".env.production" ]; then
    echo "📝 Создание .env.production..."
    echo "VITE_API_URL=http://212.74.227.208:3000/api" > .env.production
fi

# Проверяем, собран ли проект
if [ ! -d "dist" ]; then
    echo "📦 Сборка админ-панели..."
    npm install
    npm run build
fi

# Запускаем через PM2
echo "▶️  Запуск админ-панели на порту 3001..."
pm2 start npm --name "admin-panel" -- run serve

# Сохраняем конфигурацию PM2
pm2 save

echo "✅ Админ-панель запущена!"
echo "🌐 Доступна по адресу: http://0.0.0.0:3001/admin"
echo ""
echo "📊 Статус процессов:"
pm2 list


