# Как загрузить APK приложения на сервер

## Быстрый способ (Windows)

### 1. Соберите APK файл

**Для приложения мастера:**
```bash
.\gradlew.bat :app:assembleDebug
```

**Для клиентского приложения:**
```bash
cd ClientApp
.\gradlew.bat :app:assembleDebug
cd ..
```

### 2. Загрузите на сервер

**Используйте готовый скрипт:**

```bash
# Для приложения мастера
.\upload-apk-to-server.bat master

# Для клиентского приложения
.\upload-apk-to-server.bat client
```

Или через PowerShell:
```powershell
.\upload-apk-to-server.ps1 -AppType master
.\upload-apk-to-server.ps1 -AppType client
```

## Ручной способ

### Вариант 1: Через SCP (командная строка)

```bash
# Для приложения мастера
scp app\build\outputs\apk\debug\app-debug.apk root@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-master.apk

# Для клиентского приложения
scp ClientApp\app\build\outputs\apk\debug\app-debug.apk root@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-client.apk
```

### Вариант 2: Через SFTP клиент (FileZilla, WinSCP)

📖 **Подробная инструкция:** См. файл `UPLOAD_APK_FILEZILLA.md`

**Краткая инструкция:**

1. Подключитесь к серверу:
   - **Хост:** `212.74.227.208`
   - **Пользователь:** `root` (или ваш пользователь)
   - **Пароль:** (ваш пароль)
   - **Порт:** `22`
   - **Протокол:** SFTP - SSH File Transfer Protocol

2. Перейдите в директорию:
   ```
   /var/www/ispravleno-website/backend/public/updates/
   ```

3. Загрузите APK файл из:
   - `app\build\outputs\apk\debug\app-debug.apk` (для мастера)
   - `ClientApp\app\build\outputs\apk\debug\app-debug.apk` (для клиента)

4. **Переименуйте файл после загрузки:**
   - `masterprofi-master.apk` для приложения мастера
   - `masterprofi-client.apk` для клиентского приложения

### Вариант 3: Через SSH на сервере

```bash
# Подключитесь к серверу
ssh root@212.74.227.208

# Перейдите в директорию
cd /var/www/ispravleno-website/backend/public/updates/

# Создайте директорию, если её нет
mkdir -p /var/www/ispravleno-website/backend/public/updates/

# Загрузите APK через SCP с локального компьютера:
# (выполните на локальном компьютере)
scp app\build\outputs\apk\debug\app-debug.apk root@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-master.apk
```

## После загрузки

### 1. Проверьте доступность APK

```bash
# На сервере или локально
curl -I https://ispravleno.pro/apps/masterprofi-master.apk
curl -I https://ispravleno.pro/apps/masterprofi-client.apk
```

Должен вернуться HTTP 200 OK.

### 2. Обновите версию (если нужно)

Подключитесь к серверу и отредактируйте `version-config.json`:

```bash
ssh root@212.74.227.208
cd /var/www/ispravleno-website/backend
nano version-config.json
```

Обновите версию:
```json
{
  "android_master": {
    "current_version": "1.2.0",  // Увеличьте версию
    "min_required_version": "1.0.0",
    "force_update": false,
    "release_notes": "Что нового в этой версии...",
    "download_url": "https://ispravleno.pro/apps/masterprofi-master.apk",
    "supported_os_versions": ["8.0", "9.0", "10", "11", "12", "13"]
  }
}
```

### 3. Перезапустите backend

```bash
pm2 restart bestapp-backend
```

## Проверка работы

1. Откройте в браузере:
   - https://ispravleno.pro/apps/masterprofi-master.apk
   - https://ispravleno.pro/apps/masterprofi-client.apk

2. Должно начаться скачивание APK файла.

3. В приложении проверьте обновления - должно появиться уведомление о новой версии.

## Важные замечания

⚠️ **APK файлы НЕ хранятся в Git** - они добавлены в `.gitignore`

⚠️ **Имена файлов должны быть точными:**
- `masterprofi-master.apk` (не `app-debug.apk`)
- `masterprofi-client.apk` (не `client-app-debug.apk`)

⚠️ **Для production используйте release APK**, а не debug:
```bash
.\gradlew.bat :app:assembleRelease
```

## Устранение проблем

### Ошибка "Permission denied"
```bash
# На сервере проверьте права доступа
chmod 644 /var/www/ispravleno-website/backend/public/updates/*.apk
chown www-data:www-data /var/www/ispravleno-website/backend/public/updates/*.apk
```

### Ошибка 404 при скачивании
1. Проверьте, что файл загружен в правильную директорию
2. Проверьте имя файла (должно быть точно `masterprofi-master.apk`)
3. Перезапустите backend: `pm2 restart bestapp-backend`

### Приложение не видит обновление
1. Проверьте версию в `version-config.json` - она должна быть больше текущей
2. Проверьте URL в `download_url`
3. Проверьте логи: `pm2 logs bestapp-backend`
