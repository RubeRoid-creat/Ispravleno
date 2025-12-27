# Исправление запуска сайта в PM2

## Проблема

При запуске сайта через PM2 возникают ошибки:
1. ❌ Порт 3001 уже занят (админ-панель)
2. ⚠️ Предупреждение: `"next start" does not work with "output: standalone"`

## Решение

### Шаг 1: Остановите текущий процесс

```bash
pm2 stop ispravleno-website
pm2 delete ispravleno-website
```

### Шаг 2: Обновите код

```bash
cd /var/www/ispravleno-website/website
git pull origin main
```

### Шаг 3: Пересоберите проект

```bash
npm install --legacy-peer-deps
npx prisma generate
npm run build
```

### Шаг 4: Запустите с правильной командой

**Вариант 1: Используя ecosystem.config.js (рекомендуется)**

```bash
# Создайте директорию для логов
mkdir -p logs

# Запустите через ecosystem.config.js
pm2 start ecosystem.config.js

# Сохраните конфигурацию
pm2 save
```

**Вариант 2: Напрямую через PM2**

```bash
PORT=3002 pm2 start npm --name "ispravleno-website" -- run start:standalone
pm2 save
```

### Шаг 5: Проверьте статус

```bash
# Проверьте список процессов
pm2 list

# Проверьте логи
pm2 logs ispravleno-website

# Должно быть:
# - Local: http://localhost:3002 (не 3001!)
# - Ready in XXXms
```

### Шаг 6: Откройте сайт

Откройте в браузере: `http://212.74.227.208:3002`

## Проверка конфигурации

Убедитесь, что в `.env` файле указан правильный порт:

```bash
cat .env | grep PORT
# Должно быть: PORT=3002
```

## Если все еще не работает

1. Проверьте, что порт 3002 свободен:
```bash
sudo lsof -i :3002
```

2. Проверьте логи на ошибки:
```bash
pm2 logs ispravleno-website --lines 50
```

3. Убедитесь, что проект собран:
```bash
ls -la .next/standalone/server.js
# Файл должен существовать
```

4. Если файла нет, пересоберите:
```bash
npm run build
```
