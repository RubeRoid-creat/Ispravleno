# Альтернативные способы загрузки APK на сервер

Если FileZilla не подключается, используйте эти методы:

## Метод 1: Через SSH и команду scp (рекомендуется)

### Шаг 1: Проверьте SSH подключение

```bash
ssh root@212.74.227.208
```

Если SSH работает, переходите к шагу 2.

### Шаг 2: Загрузите APK через scp

**Для приложения мастера:**
```bash
scp app\build\outputs\apk\debug\app-debug.apk root@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-master.apk
```

**Для клиентского приложения:**
```bash
scp ClientApp\app\build\outputs\apk\debug\app-debug.apk root@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-client.apk
```

### Шаг 3: Переименуйте файл (если нужно)

Если файл загрузился как `app-debug.apk`, подключитесь по SSH и переименуйте:

```bash
ssh root@212.74.227.208
cd /var/www/ispravleno-website/backend/public/updates/
mv app-debug.apk masterprofi-master.apk
chmod 644 masterprofi-master.apk
```

## Метод 2: Через SSH + загрузку файла в два этапа

### Шаг 1: Подключитесь по SSH

```bash
ssh root@212.74.227.208
```

### Шаг 2: Создайте директорию (если её нет)

```bash
mkdir -p /var/www/ispravleno-website/backend/public/updates/
cd /var/www/ispravleno-website/backend/public/updates/
```

### Шаг 3: Загрузите файл через другой способ

**Вариант A: Через wget (если APK доступен по URL)**

1. Загрузите APK на временный хостинг (например, Google Drive, Dropbox, или ваш сайт)
2. На сервере выполните:
```bash
wget https://ваш-временный-url.com/app.apk -O masterprofi-master.apk
chmod 644 masterprofi-master.apk
```

**Вариант B: Через base64 (для небольших файлов)**

1. На локальном компьютере:
```powershell
# Конвертируйте APK в base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("app\build\outputs\apk\debug\app-debug.apk")) | Out-File -Encoding ASCII apk-base64.txt
```

2. Скопируйте содержимое файла `apk-base64.txt`

3. На сервере:
```bash
# Вставьте base64 строку и сохраните
echo "ВАША_BASE64_СТРОКА" | base64 -d > masterprofi-master.apk
chmod 644 masterprofi-master.apk
```

## Метод 3: Через веб-интерфейс (если доступен)

Если на сервере есть веб-интерфейс для управления файлами (например, cPanel, Plesk, или веб-FTP):

1. Войдите в веб-интерфейс
2. Найдите файловый менеджер
3. Перейдите в `/var/www/ispravleno-website/backend/public/updates/`
4. Загрузите APK файл через веб-интерфейс
5. Переименуйте файл

## Метод 4: Через облачное хранилище как промежуточный вариант

### Шаг 1: Загрузите APK в облако

1. Загрузите APK в Google Drive, Dropbox, или Яндекс.Диск
2. Получите прямую ссылку на скачивание

### Шаг 2: Скачайте на сервер

```bash
ssh root@212.74.227.208
cd /var/www/ispravleno-website/backend/public/updates/
wget "ВАША_ССЫЛКА_НА_APK" -O masterprofi-master.apk
chmod 644 masterprofi-master.apk
```

## Метод 5: Через другой SFTP клиент (WinSCP)

WinSCP иногда работает лучше, чем FileZilla:

1. Скачайте WinSCP: https://winscp.net/
2. Подключитесь:
   - **Протокол:** SFTP
   - **Хост:** `212.74.227.208`
   - **Порт:** `22`
   - **Имя пользователя:** `root`
   - **Пароль:** (ваш пароль)

## Метод 6: Через другой порт (если порт 22 заблокирован)

Возможно, на сервере настроен другой порт для SSH:

```bash
# Попробуйте подключиться с указанием другого порта
ssh -p 2222 root@212.74.227.208
# или
ssh -p 2200 root@212.74.227.208
```

В FileZilla укажите этот порт вместо 22.

## Диагностика проблемы

### Проверка SSH подключения

```bash
# Проверьте, доступен ли SSH
ssh -v root@212.74.227.208

# Проверьте, открыт ли порт 22
telnet 212.74.227.208 22
```

### Проверка на сервере

Если у вас есть доступ к серверу другим способом, проверьте:

```bash
# Проверьте, запущен ли SSH сервис
systemctl status sshd
# или
systemctl status ssh

# Проверьте, слушает ли SSH порт 22
netstat -tlnp | grep :22
# или
ss -tlnp | grep :22

# Проверьте файрвол
ufw status
# или
iptables -L
```

## Рекомендации

1. **Сначала попробуйте SSH** - если SSH работает, используйте `scp`
2. **Если SSH не работает** - проверьте, есть ли у вас доступ к серверу другим способом
3. **Если нет доступа** - обратитесь к администратору сервера для настройки SSH/SFTP

## Быстрая проверка

Выполните эти команды для диагностики:

```bash
# 1. Проверка ping
ping 212.74.227.208

# 2. Проверка SSH
ssh -o ConnectTimeout=5 root@212.74.227.208 "echo 'SSH OK'"

# 3. Проверка порта 22
Test-NetConnection -ComputerName 212.74.227.208 -Port 22
```

Если все команды работают, но FileZilla не подключается - попробуйте WinSCP или используйте `scp` напрямую.
