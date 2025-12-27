#!/bin/bash
# Скрипт для применения исправлений nginx на сервере
# Запустите на сервере: sudo bash apply-nginx-fix.sh

echo "🔧 Применение исправлений nginx для Яндекс браузера..."

# Создание резервной копии
BACKUP_FILE="/etc/nginx/sites-available/ispravleno-website.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp /etc/nginx/sites-available/ispravleno-website "$BACKUP_FILE"
echo "✓ Резервная копия создана: $BACKUP_FILE"

# Копирование обновленной конфигурации
CONFIG_SOURCE="/var/www/ispravleno-website/nginx-ispravleno-website-full.conf"
CONFIG_TARGET="/etc/nginx/sites-available/ispravleno-website"

if [ -f "$CONFIG_SOURCE" ]; then
    sudo cp "$CONFIG_SOURCE" "$CONFIG_TARGET"
    echo "✓ Конфигурация обновлена"
else
    echo "❌ Файл конфигурации не найден: $CONFIG_SOURCE"
    echo "Проверьте путь к файлу конфигурации"
    exit 1
fi

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
    sudo cp "$BACKUP_FILE" "$CONFIG_TARGET"
    echo "✓ Конфигурация восстановлена из резервной копии"
    exit 1
fi
