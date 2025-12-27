# Быстрая загрузка APK на сервер (рекомендуется)

## Самый простой способ: Прямая загрузка через SCP

Если у вас есть SSH доступ к серверу, это самый надежный способ.

### Шаг 1: Убедитесь, что APK собран

```bash
# Для приложения мастера
.\gradlew.bat :app:assembleDebug

# Для клиентского приложения
cd ClientApp
.\gradlew.bat :app:assembleDebug
cd ..
```

### Шаг 2: Загрузите APK напрямую

**Для приложения мастера:**
```powershell
scp app\build\outputs\apk\debug\app-debug.apk root@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-master.apk
```

**Для клиентского приложения:**
```powershell
scp ClientApp\app\build\outputs\apk\debug\app-debug.apk root@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-client.apk
```

### Шаг 3: Проверьте на сервере

```bash
ssh root@212.74.227.208
cd /var/www/ispravleno-website/backend/public/updates/
ls -lh masterprofi-master.apk
chmod 644 masterprofi-master.apk
```

## Если SCP не работает (требует SSH ключ)

### Вариант 1: Использовать готовый скрипт

Создайте файл `upload-direct.ps1`:

```powershell
# Загрузка APK напрямую через SCP
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("master", "client")]
    [string]$AppType
)

$SERVER = "root@212.74.227.208"
$SERVER_PATH = "/var/www/ispravleno-website/backend/public/updates"

if ($AppType -eq "master") {
    $LOCAL_FILE = "app\build\outputs\apk\debug\app-debug.apk"
    $REMOTE_FILE = "$SERVER_PATH/masterprofi-master.apk"
} else {
    $LOCAL_FILE = "ClientApp\app\build\outputs\apk\debug\app-debug.apk"
    $REMOTE_FILE = "$SERVER_PATH/masterprofi-client.apk"
}

Write-Host "Загрузка $LOCAL_FILE на сервер..." -ForegroundColor Cyan
scp $LOCAL_FILE "$SERVER`:$REMOTE_FILE"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Успешно загружено!" -ForegroundColor Green
    Write-Host "Проверьте на сервере: ssh $SERVER 'ls -lh $REMOTE_FILE'" -ForegroundColor Yellow
} else {
    Write-Host "Ошибка загрузки. Проверьте SSH ключи." -ForegroundColor Red
}
```

Использование:
```powershell
.\upload-direct.ps1 -AppType master
```

### Вариант 2: Загрузить через другой файлообменник

**Используйте Dropbox (дает прямые ссылки):**

1. Загрузите APK в Dropbox
2. Правой кнопкой → "Копировать ссылку"
3. Измените `www.dropbox.com` на `dl.dropboxusercontent.com` в ссылке
4. На сервере:
```bash
wget "ИЗМЕНЕННАЯ_ССЫЛКА" -O masterprofi-master.apk
```

**Или используйте GitHub Releases:**

1. Создайте релиз в GitHub
2. Загрузите APK как asset
3. Используйте прямую ссылку:
```bash
wget "https://github.com/username/repo/releases/download/v1.0.0/masterprofi-master.apk" -O masterprofi-master.apk
```

### Вариант 3: Временный HTTP сервер

Если у вас есть доступ к серверу по SSH, но нет SSH ключей:

1. **На вашем компьютере** запустите простой HTTP сервер:
```powershell
# В директории с APK файлом
cd app\build\outputs\apk\debug
python -m http.server 8000
```

2. **На сервере** скачайте файл:
```bash
wget "http://ВАШ_IP:8000/app-debug.apk" -O masterprofi-master.apk
```

⚠️ **Важно:** Откройте порт 8000 в файрволе или используйте ngrok для туннеля.

## Рекомендация

**Лучший способ:** Настройте SSH ключи один раз, и потом используйте SCP для всех загрузок. Это самый быстрый и надежный способ.

См. файл `SETUP_SSH_KEYS.md` для настройки SSH ключей.
