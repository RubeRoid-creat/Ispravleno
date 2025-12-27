# Исправление ошибки подключения к базе данных

## Проблема

В логах сайта видна ошибка:
```
Authentication failed against database server at `localhost`, the provided database credentials for `user` are not valid.
```

## Решение

### Шаг 1: Проверьте учетные данные в .env

```bash
ssh root@212.74.227.208
cd /root/Ispravleno/ispravleno-website/website
cat .env | grep DATABASE_URL
```

### Шаг 2: Проверьте существование базы данных и пользователя

```bash
# Подключитесь к PostgreSQL
sudo -u postgres psql

# Проверьте базы данных
\l

# Проверьте пользователей
\du

# Выйдите
\q
```

### Шаг 3: Создайте пользователя и базу данных (если их нет)

```bash
sudo -u postgres psql << EOF
-- Создайте пользователя (если его нет)
CREATE USER "user" WITH PASSWORD 'password';

-- Создайте базу данных (если её нет)
CREATE DATABASE ispravleno OWNER "user";

-- Дайте права
GRANT ALL PRIVILEGES ON DATABASE ispravleno TO "user";

-- Выйдите
\q
EOF
```

### Шаг 4: Или обновите пароль существующего пользователя

```bash
sudo -u postgres psql << EOF
ALTER USER "user" WITH PASSWORD 'новый_пароль';
\q
EOF
```

Затем обновите `.env` файл с новым паролем.

### Шаг 5: Перезапустите приложение

```bash
pm2 restart ispravleno-website
```

### Шаг 6: Проверьте логи

```bash
pm2 logs ispravleno-website --lines 20
```

## Альтернатива: Использовать другого пользователя

Если пользователь `user` не работает, используйте `postgres`:

```bash
cd /root/Ispravleno/ispravleno-website/website
nano .env
```

Измените:
```
DATABASE_URL="postgresql://postgres:ваш_пароль@localhost:5432/ispravleno"
```

## Важно

⚠️ После изменения `.env` файла обязательно перезапустите приложение:
```bash
pm2 restart ispravleno-website --update-env
```

Флаг `--update-env` обновит переменные окружения.
