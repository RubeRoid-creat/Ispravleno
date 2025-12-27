# Загрузка APK файлов для обновлений

## Структура директорий

APK файлы должны храниться в директории:
```
backend/public/updates/
```

Файлы будут доступны по адресам:
- Master App: `https://ispravleno.pro/apps/masterprofi-master.apk`
- Client App: `https://ispravleno.pro/apps/masterprofi-client.apk`

Также доступны через старый маршрут `/updates` для обратной совместимости.

## Названия файлов

Используйте следующие стандартные имена:
- **Master App**: `masterprofi-master.apk`
- **Client App**: `masterprofi-client.apk`

## Как работает система обновлений

✅ **Обновления скачиваются напрямую внутри приложения** - без открытия браузера!

1. Приложение при запуске вызывает `/api/version/check`
2. Сервер возвращает информацию об обновлении, включая `download_url` (например: `https://ispravleno.pro/apps/masterprofi-master.apk`)
3. Приложение **автоматически скачивает APK** по URL напрямую (используя `URL.openConnection()` или `DownloadManager`)
4. После скачивания приложение предлагает установить обновление
5. Пользователь подтверждает установку
6. APK устанавливается через системный инсталлятор Android

**Важно:** Приложения НЕ открывают браузер - всё происходит внутри приложения!

## Как загрузить новый APK

### Вариант 1: Через SSH на сервер (рекомендуется)

```bash
# Подключитесь к серверу
ssh user@212.74.227.208

# Перейдите в директорию проекта
cd /var/www/ispravleno-website/backend

# Обновите код
git pull origin main

# Создайте директорию, если её нет
mkdir -p public/updates

# Загрузите APK файл через SCP с другого компьютера:
# scp /path/to/your/app.apk user@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-master.apk

# Или для клиентского приложения
# scp /path/to/client-app.apk user@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-client.apk
```

### Вариант 2: Через SFTP клиент (рекомендуется для больших файлов)

1. Подключитесь к серверу через SFTP (например, FileZilla, WinSCP)
2. Перейдите в директорию: `/var/www/ispravleno-website/backend/public/updates/`
3. Загрузите APK файл с нужным именем:
   - `masterprofi-master.apk` для приложения мастера
   - `masterprofi-client.apk` для клиентского приложения

### Вариант 3: Прямая загрузка на сервер

```bash
# На сервере, в директории backend/public/updates/
cd /var/www/ispravleno-website/backend/public/updates/

# Если у вас есть APK локально на сервере
cp /path/to/app.apk masterprofi-master.apk

# Или используйте wget/curl если APK доступен по URL
wget https://example.com/app.apk -O masterprofi-master.apk
```

⚠️ **Важно:** APK файлы могут быть большими (20-50 MB). Рекомендуется использовать SFTP или SCP для загрузки. APK файлы НЕ хранятся в Git репозитории (добавлены в .gitignore).

## Обновление конфигурации версий

После загрузки APK обновите `version-config.json`:

```bash
cd /var/www/ispravleno-website/backend
nano version-config.json
```

Обновите версию и release notes:

```json
{
  "android_master": {
    "current_version": "1.2.0",
    "min_required_version": "1.0.0",
    "force_update": false,
    "release_notes": "Что нового в этой версии...",
    "download_url": "https://ispravleno.pro/apps/masterprofi-master.apk",
    "supported_os_versions": ["8.0", "9.0", "10", "11", "12", "13"]
  },
  "android_client": {
    "current_version": "1.1.0",
    "min_required_version": "1.0.0",
    "force_update": false,
    "release_notes": "Что нового в этой версии...",
    "download_url": "https://ispravleno.pro/apps/masterprofi-client.apk",
    "supported_os_versions": ["8.0", "9.0", "10", "11", "12", "13"]
  }
}
```

После изменения конфигурации перезапустите backend:
```bash
pm2 restart bestapp-backend
```

## Проверка доступности APK

После загрузки проверьте, что APK доступен:

```bash
# Проверка через curl
curl -I https://ispravleno.pro/apps/masterprofi-master.apk

# Должен вернуть HTTP 200 OK и Content-Type: application/vnd.android.package-archive
```

Или откройте в браузере:
- https://ispravleno.pro/apps/masterprofi-master.apk (должен начать скачивание)
- https://ispravleno.pro/apps/masterprofi-client.apk (должен начать скачивание)

## Процесс обновления приложения

### Для пользователя:

1. Приложение проверяет обновления при запуске
2. Если есть обновление, показывается диалог с описанием изменений
3. Пользователь нажимает "Обновить"
4. **Внутри приложения** начинается загрузка APK (показывается прогресс)
5. После загрузки система Android предлагает установить обновление
6. После установки приложение перезапускается с новой версией

### Важные моменты:

✅ APK скачивается напрямую, без открытия браузера  
✅ Весь процесс происходит внутри приложения  
✅ Показывается прогресс загрузки  
✅ Поддерживается принудительное обновление (force_update: true)  
✅ Можно отложить обновление (если не force_update)  

## Устранение проблем

### APK не скачивается

1. Проверьте доступность файла: `curl -I https://ispravleno.pro/apps/masterprofi-master.apk`
2. Проверьте права доступа к файлу: `ls -la public/updates/masterprofi-master.apk`
3. Убедитесь, что файл существует: `ls public/updates/`

### Ошибка 404

1. Проверьте, что файл загружен в правильную директорию: `backend/public/updates/`
2. Проверьте имя файла (должно быть точно `masterprofi-master.apk` или `masterprofi-client.apk`)
3. Перезапустите backend: `pm2 restart bestapp-backend`

### Приложение не видит обновление

1. Проверьте версию в `version-config.json` - она должна быть больше текущей версии приложения
2. Проверьте, что URL в `download_url` правильный: `https://ispravleno.pro/apps/...`
3. Проверьте логи backend: `pm2 logs bestapp-backend`
