@echo off
REM Скрипт для загрузки APK файлов на сервер
REM Использование: upload-apk-to-server.bat master или upload-apk-to-server.bat client

if "%1"=="" (
    echo ========================================
    echo Загрузка APK на сервер
    echo ========================================
    echo.
    echo Использование:
    echo   upload-apk-to-server.bat master  - для приложения мастера
    echo   upload-apk-to-server.bat client - для клиентского приложения
    echo.
    exit /b 1
)

set APP_TYPE=%1
set SERVER_IP=212.74.227.208
set SERVER_USER=root
set SERVER_PATH=/var/www/ispravleno-website/backend/public/updates

if "%APP_TYPE%"=="master" (
    set APK_NAME=masterprofi-master.apk
    set LOCAL_APK_PATH=app\build\outputs\apk\debug\app-debug.apk
    echo Приложение: Master App
) else if "%APP_TYPE%"=="client" (
    set APK_NAME=masterprofi-client.apk
    set LOCAL_APK_PATH=ClientApp\app\build\outputs\apk\debug\app-debug.apk
    echo Приложение: Client App
) else (
    echo ОШИБКА: Неизвестный тип приложения. Используйте master или client
    exit /b 1
)

echo ========================================
echo Загрузка APK на сервер
echo ========================================
echo.
echo APK файл: %LOCAL_APK_PATH%
echo Сервер: %SERVER_USER%@%SERVER_IP%
echo Путь на сервере: %SERVER_PATH%/%APK_NAME%
echo.

REM Проверяем существование APK файла
if not exist "%LOCAL_APK_PATH%" (
    echo ОШИБКА: APK файл не найден: %LOCAL_APK_PATH%
    echo.
    echo Сначала соберите приложение:
    if "%APP_TYPE%"=="master" (
        echo   gradlew.bat :app:assembleDebug
    ) else (
        echo   cd ClientApp
        echo   gradlew.bat :app:assembleDebug
    )
    pause
    exit /b 1
)

echo Загрузка APK на сервер...
echo.

REM Загружаем через SCP
scp "%LOCAL_APK_PATH%" %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/%APK_NAME%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo APK успешно загружен на сервер!
    echo.
    echo Следующие шаги:
    echo 1. Подключитесь к серверу: ssh %SERVER_USER%@%SERVER_IP%
    echo 2. Проверьте файл: ls -lh %SERVER_PATH%/%APK_NAME%
    echo 3. Проверьте доступность: curl -I https://ispravleno.pro/apps/%APK_NAME%
    echo 4. Обновите version-config.json если нужно изменить версию
    echo 5. Перезапустите backend: pm2 restart bestapp-backend
) else (
    echo.
    echo ОШИБКА при загрузке APK
    echo.
    echo Альтернативные способы загрузки:
    echo 1. Используйте SFTP клиент (FileZilla, WinSCP)
    echo    Сервер: %SERVER_IP%
    echo    Путь: %SERVER_PATH%
    echo    Имя файла: %APK_NAME%
    echo.
    echo 2. Или используйте команду вручную:
    echo    scp %LOCAL_APK_PATH% %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/%APK_NAME%
)

echo.
pause
