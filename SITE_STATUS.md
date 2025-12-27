# Статус сайта

## Текущее состояние

✅ **HTTP работает:** `http://ispravleno.pro` - сайт загружается нормально
❌ **HTTPS не работает:** `https://ispravleno.pro` - возвращает "Домен не привязан к хостингу"

## Проблема

HTTPS запросы идут через Cloudflare или другой прокси-сервис, который не настроен для вашего сервера.

## Решение

### Вариант 1: Настроить Cloudflare (если используется)

1. Войдите в панель Cloudflare
2. Выберите домен `ispravleno.pro`
3. Перейдите в DNS → Записи
4. Убедитесь, что A-запись указывает на `212.74.227.208`
5. Включите "Прокси" (оранжевое облако) для записи
6. В SSL/TLS выберите режим "Полный" или "Полный (строгий)"

### Вариант 2: Настроить SSL в Nginx напрямую

Если не используете Cloudflare, настройте SSL сертификат:

```bash
# Установите certbot
apt install certbot python3-certbot-nginx -y

# Получите сертификат
certbot --nginx -d ispravleno.pro -d www.ispravleno.pro

# Certbot автоматически настроит Nginx
```

### Вариант 3: Временно использовать HTTP

Пока HTTPS не настроен, сайт доступен по HTTP:
- `http://ispravleno.pro` ✅ Работает

## Проблема с базой данных

Также есть ошибка подключения к базе данных. Пользователь `user` не существует.

### Быстрое исправление:

```bash
ssh root@212.74.227.208
sudo -u postgres psql
```

Затем выполните:
```sql
CREATE USER "user" WITH PASSWORD 'password';
CREATE DATABASE ispravleno OWNER "user";
GRANT ALL PRIVILEGES ON DATABASE ispravleno TO "user";
\q
```

Или используйте существующего пользователя `masterprofi`:
```bash
cd /root/Ispravleno/ispravleno-website/website
nano .env
```

Измените:
```
DATABASE_URL="postgresql://masterprofi:пароль@localhost:5432/ispravleno"
```

Затем:
```bash
pm2 restart ispravleno-website --update-env
```

## Проверка

После исправления проверьте:
```bash
# HTTP
curl -I http://ispravleno.pro

# HTTPS (после настройки SSL)
curl -I https://ispravleno.pro

# Локально
curl -I http://localhost:3003
```
