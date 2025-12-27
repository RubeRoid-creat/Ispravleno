# Диагностика проблем с сайтом

## Сайт не открывается

### Шаг 1: Проверьте, запущен ли процесс

```bash
# Проверьте PM2 процессы
pm2 list

# Должен быть процесс ispravleno-website со статусом "online"
```

Если процесса нет:
```bash
cd /var/www/ispravleno-website/website
pm2 start ecosystem.config.js
pm2 save
```

### Шаг 2: Проверьте логи

```bash
# Посмотрите последние логи
pm2 logs ispravleno-website --lines 50

# Ищите ошибки:
# - EADDRINUSE (порт занят)
# - ENOENT (файл не найден)
# - DATABASE (проблемы с БД)
# - Cannot find module (проблемы с зависимостями)
```

### Шаг 3: Проверьте, что порт прослушивается

```bash
# Проверьте, что процесс слушает порт 3003
sudo netstat -tlnp | grep 3003

# Или
sudo ss -tlnp | grep 3003

# Или
sudo lsof -i :3003
```

Должно быть что-то вроде:
```
tcp6  0  0  :::3003  :::*  LISTEN  12345/node
```

Если ничего не выводится - процесс не запущен или не слушает порт.

### Шаг 4: Проверьте файрвол

```bash
# Проверьте статус ufw
sudo ufw status

# Если файрвол активен, убедитесь, что порт 3003 открыт
sudo ufw allow 3003/tcp
sudo ufw reload
```

### Шаг 5: Проверьте доступность с сервера

```bash
# Попробуйте подключиться локально
curl http://localhost:3003

# Или
wget http://localhost:3003
```

Если работает локально, но не работает извне - проблема в файрволе или настройках сети.

### Шаг 6: Проверьте конфигурацию

```bash
cd /var/www/ispravleno-website/website

# Проверьте .env файл
cat .env

# Убедитесь, что указан правильный порт
grep PORT .env
# Должно быть: PORT=3003
```

### Шаг 7: Проверьте, что проект собран

```bash
# Проверьте наличие standalone файла
ls -la .next/standalone/server.js

# Если файла нет - нужно пересобрать
npm run build
```

### Шаг 8: Перезапустите процесс

```bash
# Остановите процесс
pm2 stop ispravleno-website

# Удалите из PM2
pm2 delete ispravleno-website

# Запустите заново
cd /var/www/ispravleno-website/website
pm2 start ecosystem.config.js

# Проверьте статус
pm2 list
pm2 logs ispravleno-website
```

## Частые проблемы и решения

### Проблема: "Cannot find module" или ошибки импорта

**Решение:**
```bash
cd /var/www/ispravleno-website/website
rm -rf node_modules .next
npm install --legacy-peer-deps
npm run build
pm2 restart ispravleno-website
```

### Проблема: "EADDRINUSE" - порт занят

**Решение:**
```bash
# Найдите процесс на порту 3003
sudo lsof -i :3003

# Убейте процесс
sudo kill -9 <PID>

# Или остановите PM2 процесс
pm2 stop ispravleno-website
pm2 delete ispravleno-website

# Запустите заново
pm2 start ecosystem.config.js
```

### Проблема: Ошибки подключения к базе данных

**Решение:**
```bash
# Проверьте DATABASE_URL в .env
cat .env | grep DATABASE_URL

# Проверьте доступность PostgreSQL
sudo systemctl status postgresql

# Проверьте подключение к БД
psql "$DATABASE_URL" -c "SELECT 1;"
```

### Проблема: "Standalone server.js not found"

**Решение:**
```bash
cd /var/www/ispravleno-website/website
npm run build

# Проверьте, что файл создан
ls -la .next/standalone/server.js

# Если файла нет - проверьте next.config.js
cat next.config.js
# Должно быть: output: 'standalone'
```

### Проблема: Сайт открывается, но показывает ошибку

**Решение:**
```bash
# Посмотрите логи браузера (F12 -> Console)
# Посмотрите логи сервера
pm2 logs ispravleno-website --lines 100

# Проверьте переменные окружения
pm2 env 0
```

### Проблема: Сайт работает локально, но не доступен извне

**Решение:**
```bash
# 1. Проверьте файрвол
sudo ufw status
sudo ufw allow 3003/tcp

# 2. Проверьте, что приложение слушает 0.0.0.0, а не 127.0.0.1
netstat -tlnp | grep 3003
# Должно быть: 0.0.0.0:3003 или :::3003, НЕ 127.0.0.1:3003

# 3. Если слушает только localhost, проверьте ecosystem.config.js
cat ecosystem.config.js | grep HOSTNAME
# Должно быть: HOSTNAME: '0.0.0.0'
```

## Быстрая диагностика (все в одном)

```bash
#!/bin/bash
echo "=== Диагностика сайта ==="
echo ""

echo "1. PM2 процессы:"
pm2 list
echo ""

echo "2. Порт 3003:"
sudo lsof -i :3003 || echo "Порт 3003 не используется"
echo ""

echo "3. Локальная доступность:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 || echo "Не доступен"
echo ""

echo "4. Последние логи:"
pm2 logs ispravleno-website --lines 20 --nostream
echo ""

echo "5. Конфигурация:"
cd /var/www/ispravleno-website/website 2>/dev/null && cat .env | grep -E "PORT|SITE_URL" || echo "Не найдено"
echo ""

echo "6. Standalone файл:"
ls -la /var/www/ispravleno-website/website/.next/standalone/server.js 2>/dev/null || echo "Файл не найден - нужно пересобрать"
echo ""

echo "=== Конец диагностики ==="
```

Сохраните как `diagnose.sh` и запустите: `bash diagnose.sh`
