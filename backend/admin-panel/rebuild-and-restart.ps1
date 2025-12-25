# Скрипт для пересборки и перезапуска админ-панели

Write-Host "🔄 Пересборка админ-панели..." -ForegroundColor Green

# Переходим в директорию админ-панели
Set-Location $PSScriptRoot

# Пересобираем проект
Write-Host "📦 Сборка проекта..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "✅ Админ-панель пересобрана!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Важно: Перезапустите backend сервер для применения изменений!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Или если админ-панель запущена отдельно через PM2:" -ForegroundColor Cyan
Write-Host "  pm2 restart admin-panel" -ForegroundColor White
Write-Host ""
Write-Host "Если админ-панель отдается через основной backend сервер:" -ForegroundColor Cyan
Write-Host "  pm2 restart bestapp-backend" -ForegroundColor White
Write-Host "  или" -ForegroundColor White
Write-Host "  pm2 restart server" -ForegroundColor White
