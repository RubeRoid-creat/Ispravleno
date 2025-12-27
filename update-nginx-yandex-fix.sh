#!/bin/bash

# Скрипт для обновления конфигурации nginx для совместимости с Яндекс браузером
# Запустите на сервере: sudo bash update-nginx-yandex-fix.sh

echo "🔧 Обновление конфигурации nginx для совместимости с Яндекс браузером..."

# Путь к конфигурации
CONFIG_FILE="/etc/nginx/sites-available/ispravleno-website"

# Проверка существования файла
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Файл конфигурации не найден: $CONFIG_FILE"
    exit 1
fi

# Создание резервной копии
BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "✓ Создана резервная копия: $BACKUP_FILE"

# Обновление конфигурации
sudo tee "$CONFIG_FILE" > /dev/null <<'EOF'
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/ispravleno.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ispravleno.pro/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    server_name ispravleno.pro www.ispravleno.pro;

    # Кодировка UTF-8 для совместимости с Яндекс браузером
    charset utf-8;
    source_charset utf-8;

    # Логи
    access_log /var/log/nginx/ispravleno-website-access.log;
    error_log /var/log/nginx/ispravleno-website-error.log;

    # Максимальный размер загружаемых файлов
    client_max_body_size 200M;
    
    # Улучшенные заголовки для совместимости с браузерами
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Проксирование на Next.js приложение
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Заголовки для кодировки (важно для Яндекс браузера)
        proxy_set_header Accept-Charset "utf-8";
        proxy_set_header Accept-Language "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7";
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Буферизация для лучшей совместимости
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Кэширование статических файлов Next.js
    location /_next/static/ {
        proxy_pass http://localhost:3003;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
        expires 1y;
        charset utf-8;
    }

    # Кэширование публичных файлов
    location /public/ {
        proxy_pass http://localhost:3003;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600";
        charset utf-8;
    }

    # Проксирование APK файлов через backend (только файлы .apk) - должно быть ПЕРЕД другими правилами
    location ~ ^/apps/.*\.apk$ {
        proxy_pass http://127.0.0.1:3000;
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

    # Редирект /apps/ на /apps (страница приложений)
    location = /apps/ {
        return 301 /apps;
    }

    # Проксирование страницы приложений на Next.js (без слеша)
    location = /apps {
        proxy_pass http://localhost:3003/apps;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header Accept-Charset "utf-8";
    }
}

server {
    if ($host = www.ispravleno.pro) {
        return 301 https://$host$request_uri;
    }
    if ($host = ispravleno.pro) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name ispravleno.pro www.ispravleno.pro;
    return 404;
}
EOF

echo "✓ Конфигурация обновлена"

# Проверка конфигурации
echo ""
echo "🔍 Проверка конфигурации..."
if sudo nginx -t; then
    echo "✓ Конфигурация корректна"
    echo ""
    echo "🔄 Перезагрузка nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен успешно!"
    echo ""
    echo "📝 Проверьте сайт в Яндекс браузере: https://ispravleno.pro"
else
    echo "❌ Ошибка в конфигурации!"
    echo "Восстановление из резервной копии..."
    sudo cp "$BACKUP_FILE" "$CONFIG_FILE"
    echo "✓ Конфигурация восстановлена из резервной копии"
    exit 1
fi
