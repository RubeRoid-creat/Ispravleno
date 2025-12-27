# Загрузка APK файлов для обновлений

## Структура директорий

APK файлы должны храниться в директории:
```
backend/public/updates/
```

Файлы будут доступны по адресам:
- Master App: `https://ispravleno.pro/apps/masterprofi-master.apk`
- Client App: `https://ispravleno.pro/apps/masterprofi-client.apk`

## Названия файлов

Используйте следующие стандартные имена:
- **Master App**: `masterprofi-master.apk`
- **Client App**: `masterprofi-client.apk`

## Как загрузить новый APK

### Вариант 1: Через SSH на сервер

```bash
# Подключитесь к серверу
ssh user@212.74.227.208

# Перейдите в директорию проекта
cd /var/www/ispravleno-website/backend

# Обновите код
git pull origin main

# Создайте директорию, если её нет
mkdir -p public/updates

# Загрузите APK файл (замените путь на ваш)
scp /path/to/your/app.apk user@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-master.apk

# Или для клиентского приложения
scp /path/to/client-app.apk user@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-client.apk
```

### Вариант 2: Через SFTP клиент

1. Подключитесь к серверу через SFTP (например, FileZilla, WinSCP)
2. Перейдите в директорию: `/var/www/ispravleno-website/backend/public/updates/`
3. Загрузите APK файл с нужным именем

### Вариант 3: Через Git (не рекомендуется для больших файлов)

```bash
# Скопируйте APK в директорию
cp your-app.apk backend/public/updates/masterprofi-master.apk

# Добавьте в git (если .gitignore позволяет)
git add backend/public/updates/masterprofi-master.apk
git commit -m "Update master app APK to version X.X.X"
git push
```

⚠️ **Важно:** APK файлы могут быть большими. Рекомендуется использовать SFTP или SCP для загрузки.

## Обновление конфигурации версий

После загрузки APK обновите `version-config.json`:

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

## Проверка доступности APK

После загрузки проверьте, что APK доступен:

```bash
# Проверка через curl
curl -I https://ispravleno.pro/apps/masterprofi-master.apk

# Должен вернуть HTTP 200 OK
```

Или откройте в браузере:
- https://ispravleno.pro/apps/masterprofi-master.apk
- https://ispravleno.pro/apps/masterprofi-client.apk

## Как работают обновления

1. Приложение при запуске вызывает `/api/version/check`
2. Сервер возвращает информацию об обновлении, включая `download_url`
3. Приложение **автоматически скачивает APK** по URL без открытия браузера
4. После скачивания приложение предлагает установить обновление
5. Пользователь подтверждает установку
6. APK устанавливается через системный инсталлятор Android

## Важно

✅ APK файлы должны быть правильно подписаны  
✅ Файлы должны иметь правильные имена: `masterprofi-master.apk` и `masterprofi-client.apk`  
✅ После загрузки нового APK обновите версию в `version-config.json`  
✅ Приложения скачивают APK напрямую, без открытия браузера  
✅ URL в конфигурации должен указывать на `https://ispravleno.pro/apps/...`
