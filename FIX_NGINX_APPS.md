# Исправление конфигурации Nginx для /apps

## Проблема

Nginx не настроен для проксирования `/apps` на backend, поэтому APK файлы недоступны через `https://ispravleno.pro/apps/`.

## Решение

### Вариант 1: Исправить конфигурацию Nginx вручную

1. **Подключитесь к серверу:**
```bash
ssh root@212.74.227.208
```

2. **Откройте конфигурацию:**
```bash
nano /etc/nginx/sites-available/ispravleno-website
```

3. **Найдите блок `location /public/` и добавьте ПЕРЕД закрывающей скобкой `}` блока `server`:**

```nginx
    # Кэширование публичных файлов
    location /public/ {
        proxy_pass http://localhost:3003;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600";
    }

    # Проксирование APK файлов через backend
    location /apps/ {
        proxy_pass http://localhost:3000/apps/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Для больших файлов
        proxy_buffering off;
        proxy_request_buffering off;
        client_max_body_size 200M;
    }
}
```

4. **Проверьте конфигурацию:**
```bash
nginx -t
```

5. **Перезагрузите Nginx:**
```bash
systemctl reload nginx
```

6. **Проверьте доступность:**
```bash
curl -I https://ispravleno.pro/apps/masterprofi-master.apk
```

### Вариант 2: Использовать прямой доступ через backend (временно)

Пока Nginx не настроен, можно использовать прямой доступ:

- **URL:** `http://212.74.227.208:3000/apps/masterprofi-master.apk`

Но это не рекомендуется для production, так как:
- Нет SSL
- Прямой доступ к порту backend

### Вариант 3: Обновить version-config.json для использования прямого URL

Временно измените `download_url` в `version-config.json`:

```json
{
  "android_master": {
    "download_url": "http://212.74.227.208:3000/apps/masterprofi-master.apk"
  }
}
```

Но лучше исправить Nginx конфигурацию.

## Проверка

После исправления конфигурации:

```bash
# Проверка через curl
curl -I https://ispravleno.pro/apps/masterprofi-master.apk

# Должен вернуться:
# HTTP/2 200
# Content-Type: application/vnd.android.package-archive
# Content-Length: [размер файла]
```

## Важно

Файл уже загружен на сервер:
- Путь: `/var/www/ispravleno-website/backend/public/updates/masterprofi-master.apk`
- Размер: 116MB
- Права: 644

Нужно только настроить Nginx для доступа через веб.
