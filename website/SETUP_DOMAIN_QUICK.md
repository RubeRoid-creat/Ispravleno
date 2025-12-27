# Быстрая настройка домена

## Если DNS уже настроен, выполните на сервере:

### Вариант 1: Автоматический скрипт (рекомендуется)

```bash
# Подключитесь к серверу
ssh user@212.74.227.208

# Перейдите в директорию проекта
cd /var/www/ispravleno-website/website

# Обновите код из репозитория
git pull origin main

# Сделайте скрипт исполняемым
chmod +x setup-domain.sh

# Запустите скрипт (замените your-domain.com на ваше доменное имя)
./setup-domain.sh your-domain.com

# После выполнения скрипта пересоберите проект
npm run build

# Перезапустите PM2
pm2 restart ispravleno-website
```

### Вариант 2: Ручная настройка

#### 1. Установите Nginx (если не установлен)

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 2. Создайте конфигурацию Nginx

```bash
cd /var/www/ispravleno-website/website

# Скопируйте конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/ispravleno-website

# Отредактируйте (замените "ваш-домен.ru" на ваше доменное имя)
sudo nano /etc/nginx/sites-available/ispravleno-website
```

В файле замените:
```nginx
server_name ваш-домен.ru www.ваш-домен.ru;
```
на ваше доменное имя, например:
```nginx
server_name ispravleno.ru www.ispravleno.ru;
```

#### 3. Активируйте конфигурацию

```bash
# Создайте симлинк
sudo ln -s /etc/nginx/sites-available/ispravleno-website /etc/nginx/sites-enabled/

# Проверьте конфигурацию
sudo nginx -t

# Если ОК, перезагрузите Nginx
sudo systemctl reload nginx
```

#### 4. Установите SSL сертификат

```bash
# Установите Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получите SSL сертификат (замените на ваше доменное имя)
sudo certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru
```

#### 5. Обновите .env файл

```bash
cd /var/www/ispravleno-website/website
nano .env
```

Измените:
```env
NEXT_PUBLIC_SITE_URL="https://ваш-домен.ru"
```

#### 6. Обновите next.config.js (если нужно)

```bash
nano next.config.js
```

Добавьте домен в массив domains:
```javascript
images: {
  domains: ['localhost', '212.74.227.208', 'ваш-домен.ru', 'www.ваш-домен.ru'],
},
```

#### 7. Пересоберите и перезапустите

```bash
npm run build
pm2 restart ispravleno-website
```

## Проверка

Откройте в браузере:
- http://ваш-домен.ru (должен перенаправить на https)
- https://ваш-домен.ru

## Если что-то пошло не так

1. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/ispravleno-website-error.log`
2. Проверьте статус PM2: `pm2 logs ispravleno-website`
3. Проверьте, что приложение работает: `curl http://localhost:3003`
