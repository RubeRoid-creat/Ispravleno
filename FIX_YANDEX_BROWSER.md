# Исправление проблемы с Яндекс браузером

## Проблема
Сайт не открывается в Яндекс браузере, но работает в Chrome.

## Решение
Добавлены настройки кодировки UTF-8 и улучшенные заголовки для совместимости с Яндекс браузером.

## Применение на сервере

### Вариант 1: Автоматический скрипт (РЕКОМЕНДУЕТСЯ)

```bash
# 1. Подключитесь к серверу
ssh root@212.74.227.208

# 2. Перейдите в директорию проекта
cd /var/www/ispravleno-website

# 3. Обновите код из репозитория (если нужно)
git pull

# 4. Примените исправления
sudo bash apply-nginx-fix.sh
```

Скрипт автоматически:
- Создаст резервную копию текущей конфигурации
- Применит обновленную конфигурацию
- Проверит корректность
- Перезагрузит nginx

### Вариант 2: Ручное обновление

```bash
# 1. Подключитесь к серверу
ssh root@212.74.227.208

# 2. Создайте резервную копию
sudo cp /etc/nginx/sites-available/ispravleno-website /etc/nginx/sites-available/ispravleno-website.backup

# 3. Откройте конфигурацию
sudo nano /etc/nginx/sites-available/ispravleno-website

# 4. Найдите строку:
#    listen 443 ssl;
# И замените на:
#    listen 443 ssl http2;

# 5. После server_name добавьте:
#    charset utf-8;
#    source_charset utf-8;

# 6. После client_max_body_size добавьте:
#    add_header X-Content-Type-Options "nosniff" always;
#    add_header X-Frame-Options "SAMEORIGIN" always;
#    add_header X-XSS-Protection "1; mode=block" always;

# 7. В блоке location / добавьте после proxy_set_header X-Forwarded-Proto:
#    proxy_set_header Accept-Charset "utf-8";
#    proxy_set_header Accept-Language "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7";
#
#    proxy_buffering on;
#    proxy_buffer_size 4k;
#    proxy_buffers 8 4k;
#    proxy_busy_buffers_size 8k;

# 8. Сохраните файл (Ctrl+O, Enter, Ctrl+X)

# 9. Проверьте конфигурацию
sudo nginx -t

# 10. Если все ОК, перезагрузите nginx
sudo systemctl reload nginx
```

### Вариант 3: Копирование готовой конфигурации (БЫСТРЫЙ СПОСОБ)

```bash
# 1. Подключитесь к серверу
ssh root@212.74.227.208

# 2. Перейдите в директорию проекта
cd /var/www/ispravleno-website

# 3. Создайте резервную копию
sudo cp /etc/nginx/sites-available/ispravleno-website /etc/nginx/sites-available/ispravleno-website.backup

# 4. Скопируйте обновленную конфигурацию
sudo cp nginx-ispravleno-website-full.conf /etc/nginx/sites-available/ispravleno-website

# 5. Проверьте конфигурацию
sudo nginx -t

# 6. Если проверка прошла успешно, перезагрузите nginx
sudo systemctl reload nginx

# 7. Проверьте сайт в Яндекс браузере
```

## Что было исправлено

1. **Добавлена кодировка UTF-8**:
   - `charset utf-8;`
   - `source_charset utf-8;`

2. **Добавлены заголовки безопасности**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-XSS-Protection: 1; mode=block`

3. **Улучшены заголовки прокси**:
   - `Accept-Charset: utf-8`
   - `Accept-Language: ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7`

4. **Настроена буферизация**:
   - `proxy_buffering on`
   - Оптимизированы размеры буферов

5. **Включен HTTP/2**:
   - `listen 443 ssl http2;`

## Проверка

После применения изменений:

1. Проверьте сайт в Яндекс браузере: https://ispravleno.pro
2. Проверьте логи nginx на ошибки:
   ```bash
   sudo tail -f /var/log/nginx/ispravleno-website-error.log
   ```
3. Проверьте доступность:
   ```bash
   curl -I https://ispravleno.pro
   ```

## Откат изменений

Если что-то пошло не так:

```bash
# Восстановите из резервной копии
sudo cp /etc/nginx/sites-available/ispravleno-website.backup /etc/nginx/sites-available/ispravleno-website

# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите nginx
sudo systemctl reload nginx
```
