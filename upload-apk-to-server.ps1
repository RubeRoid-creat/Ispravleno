# Скрипт для загрузки APK файлов на сервер
# Использование: .\upload-apk-to-server.ps1 -AppType master|client

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("master", "client")]
    [string]$AppType
)

$SERVER_IP = "212.74.227.208"
$SERVER_USER = "root"  # Измените на вашего пользователя
$SERVER_PATH = "/var/www/ispravleno-website/backend/public/updates"
$LOCAL_APK_PATH = ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Загрузка APK на сервер" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Определяем путь к APK файлу
if ($AppType -eq "master") {
    $APK_NAME = "masterprofi-master.apk"
    $LOCAL_APK_PATH = "app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "Приложение: Master App" -ForegroundColor Yellow
} else {
    $APK_NAME = "masterprofi-client.apk"
    $LOCAL_APK_PATH = "ClientApp\app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "Приложение: Client App" -ForegroundColor Yellow
}

Write-Host "APK файл: $LOCAL_APK_PATH" -ForegroundColor Yellow
Write-Host "Сервер: $SERVER_USER@$SERVER_IP" -ForegroundColor Yellow
Write-Host "Путь на сервере: $SERVER_PATH/$APK_NAME" -ForegroundColor Yellow
Write-Host ""

# Проверяем существование APK файла
if (-not (Test-Path $LOCAL_APK_PATH)) {
    Write-Host "❌ ОШИБКА: APK файл не найден: $LOCAL_APK_PATH" -ForegroundColor Red
    Write-Host "Сначала соберите приложение:" -ForegroundColor Yellow
    if ($AppType -eq "master") {
        Write-Host "  .\gradlew.bat :app:assembleDebug" -ForegroundColor Cyan
    } else {
        Write-Host "  cd ClientApp" -ForegroundColor Cyan
        Write-Host "  .\gradlew.bat :app:assembleDebug" -ForegroundColor Cyan
    }
    exit 1
}

$apkSize = (Get-Item $LOCAL_APK_PATH).Length / 1MB
Write-Host "Размер APK: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
Write-Host ""

# Запрашиваем подтверждение
$confirm = Read-Host "Продолжить загрузку? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Отменено пользователем" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Загрузка APK на сервер..." -ForegroundColor Cyan

try {
    # Загружаем через SCP
    $remotePath = "$SERVER_USER" + "@" + "$SERVER_IP" + ":" + "$SERVER_PATH/$APK_NAME"
    
    # Используем scp (должен быть установлен OpenSSH или WinSCP)
    scp $LOCAL_APK_PATH $remotePath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "APK успешно загружен на сервер!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Следующие шаги:" -ForegroundColor Yellow
        Write-Host "1. Подключитесь к серверу: ssh $SERVER_USER@$SERVER_IP" -ForegroundColor Cyan
        Write-Host "2. Проверьте файл: ls -lh $SERVER_PATH/$APK_NAME" -ForegroundColor Cyan
        Write-Host "3. Проверьте доступность: curl -I https://ispravleno.pro/apps/$APK_NAME" -ForegroundColor Cyan
        Write-Host "4. Обновите version-config.json если нужно изменить версию" -ForegroundColor Cyan
        Write-Host "5. Перезапустите backend: pm2 restart bestapp-backend" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "ОШИБКА при загрузке APK" -ForegroundColor Red
        Write-Host ""
        Write-Host "Альтернативные способы загрузки:" -ForegroundColor Yellow
        Write-Host "1. Используйте SFTP клиент (FileZilla, WinSCP)" -ForegroundColor Cyan
        Write-Host "   Сервер: $SERVER_IP" -ForegroundColor Cyan
        Write-Host "   Путь: $SERVER_PATH" -ForegroundColor Cyan
        Write-Host "   Имя файла: $APK_NAME" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Или используйте команду вручную:" -ForegroundColor Cyan
        Write-Host "   scp $LOCAL_APK_PATH $remotePath" -ForegroundColor Cyan
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "ОШИБКА: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Убедитесь, что:" -ForegroundColor Yellow
    Write-Host "- Установлен OpenSSH или WinSCP" -ForegroundColor Cyan
    Write-Host "- Настроен SSH доступ к серверу" -ForegroundColor Cyan
    Write-Host "- У вас есть права на запись в $SERVER_PATH" -ForegroundColor Cyan
    exit 1
}
