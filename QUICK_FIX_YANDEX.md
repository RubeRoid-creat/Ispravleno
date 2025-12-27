# Быстрое исправление для Яндекс браузера

## Команды для применения на сервере

```bash
# Подключитесь к серверу
ssh root@212.74.227.208

# Перейдите в директорию проекта
cd /var/www/ispravleno-website

# Обновите код (если нужно)
git pull

# Примените исправления
sudo bash apply-nginx-fix.sh
```

Готово! Сайт должен работать в Яндекс браузере.

## Если скрипт не работает, используйте ручной способ:

```bash
# Резервная копия
sudo cp /etc/nginx/sites-available/ispravleno-website /etc/nginx/sites-available/ispravleno-website.backup

# Копирование конфигурации
sudo cp nginx-ispravleno-website-full.conf /etc/nginx/sites-available/ispravleno-website

# Проверка
sudo nginx -t

# Перезагрузка
sudo systemctl reload nginx
```

## Что исправлено:

✅ Добавлена кодировка UTF-8  
✅ Добавлены заголовки для совместимости с Яндекс браузером  
✅ Улучшена буферизация  
✅ Включен HTTP/2  
