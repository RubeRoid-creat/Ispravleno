# Скрипт для принудительной пересборки админ-панели

Write-Host "🔄 Принудительная пересборка админ-панели..." -ForegroundColor Green

# Переходим в директорию админ-панели
Set-Location $PSScriptRoot

# Удаляем старую сборку
if (Test-Path "dist") {
    Write-Host "🗑️  Удаление старой сборки..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force dist
}

# Пересобираем проект
Write-Host "📦 Сборка проекта..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "✅ Админ-панель пересобрана!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  ВАЖНО: Перезапустите backend сервер!" -ForegroundColor Red
Write-Host ""
Write-Host "Выполните команду:" -ForegroundColor Cyan
Write-Host "  pm2 restart bestapp-backend" -ForegroundColor White
Write-Host "  или" -ForegroundColor White
Write-Host "  pm2 restart server" -ForegroundColor White
Write-Host ""
Write-Host "Затем в браузере:" -ForegroundColor Cyan
Write-Host "  1. Нажмите Ctrl+Shift+Delete и очистите кэш" -ForegroundColor White
Write-Host "  2. Или откройте в режиме инкогнито (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "  3. Или сделайте жесткое обновление (Ctrl+F5)" -ForegroundColor White


