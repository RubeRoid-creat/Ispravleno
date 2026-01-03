# PowerShell скрипт для запуска админ-панели отдельно от бэкенда

Write-Host "🚀 Запуск админ-панели..." -ForegroundColor Green

# Переходим в директорию админ-панели
Set-Location $PSScriptRoot

# Создаем .env.production с правильным API URL
if (-not (Test-Path ".env.production")) {
    Write-Host "📝 Создание .env.production..." -ForegroundColor Yellow
    "VITE_API_URL=http://212.74.227.208:3000/api" | Out-File -FilePath ".env.production" -Encoding utf8
}

# Проверяем, собран ли проект
if (-not (Test-Path "dist")) {
    Write-Host "📦 Сборка админ-панели..." -ForegroundColor Yellow
    npm install
    npm run build
}

# Запускаем через PM2
Write-Host "▶️  Запуск админ-панели на порту 3001..." -ForegroundColor Green
pm2 start npm --name "admin-panel" -- run serve

# Сохраняем конфигурацию PM2
pm2 save

Write-Host "✅ Админ-панель запущена!" -ForegroundColor Green
Write-Host "🌐 Доступна по адресу: http://0.0.0.0:3001/admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Статус процессов:" -ForegroundColor Yellow
pm2 list


