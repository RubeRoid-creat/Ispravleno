# Загрузка APK с Google Drive на сервер

## Проблема

Google Drive не позволяет скачивать файлы напрямую через `wget` по обычной ссылке. Нужна специальная ссылка для прямого скачивания.

## Решение: Получение прямой ссылки для скачивания

### Способ 1: Изменить ссылку вручную

Ваша ссылка:
```
https://drive.google.com/file/d/1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z/view?usp=drive_link
```

**Измените её на:**
```
https://drive.google.com/uc?export=download&id=1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z
```

**Формат:** `https://drive.google.com/uc?export=download&id=FILE_ID`

Где `FILE_ID` - это ID файла из вашей ссылки (часть между `/d/` и `/view`)

### Способ 2: Через Google Drive API (для больших файлов)

Если файл больше 100MB, используйте:

```bash
# Для файлов больше 100MB
wget --load-cookies /tmp/cookies.txt "https://docs.google.com/uc?export=download&confirm=$(wget --quiet --save-cookies /tmp/cookies.txt --keep-session-cookies --no-check-certificate 'https://docs.google.com/uc?export=download&id=1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z' -O- | sed -rn 's/.*confirm=([0-9A-Za-z_]+).*/\1\n/p')&id=1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z" -O masterprofi-master.apk && rm -rf /tmp/cookies.txt
```

### Способ 3: Сделать файл публичным и использовать прямую ссылку

1. **В Google Drive:**
   - Правой кнопкой на файле → "Настройки доступа"
   - Измените доступ на "Все, у кого есть ссылка"
   - Скопируйте ID файла: `1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z`

2. **Используйте прямую ссылку:**
```bash
wget "https://drive.google.com/uc?export=download&id=1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z" -O masterprofi-master.apk
```

## Команда для вашего случая

Выполните на сервере:

```bash
cd /var/www/ispravleno-website/backend/public/updates/
wget "https://drive.google.com/uc?export=download&id=1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z" -O masterprofi-master.apk
chmod 644 masterprofi-master.apk
```

## Альтернативные способы

### Вариант 1: Использовать gdown (специальный инструмент для Google Drive)

```bash
# Установите gdown
pip install gdown

# Скачайте файл
gdown "https://drive.google.com/uc?id=1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z" -O masterprofi-master.apk
```

### Вариант 2: Использовать другой файлообменник

Вместо Google Drive используйте:
- **Dropbox** - дает прямые ссылки для скачивания
- **Яндекс.Диск** - поддерживает прямые ссылки
- **GitHub Releases** - отличный вариант для APK файлов
- **Ваш собственный хостинг** - загрузите APK на ваш сайт

### Вариант 3: Загрузить напрямую через SCP (если SSH работает)

Если SSH ключи настроены:

```bash
# С вашего компьютера
scp app\build\outputs\apk\debug\app-debug.apk root@212.74.227.208:/var/www/ispravleno-website/backend/public/updates/masterprofi-master.apk
```

## Проверка после загрузки

```bash
# Проверьте, что файл загружен
ls -lh masterprofi-master.apk

# Проверьте размер (должен быть примерно 20-50 MB)
du -h masterprofi-master.apk

# Проверьте права доступа
chmod 644 masterprofi-master.apk

# Проверьте доступность через веб
curl -I https://ispravleno.pro/apps/masterprofi-master.apk
```

## Если файл не скачивается

### Проблема: Файл слишком большой (>100MB)

Используйте gdown:
```bash
pip install gdown
gdown "https://drive.google.com/uc?id=1XfpqJ0R5ZdFEIMNvKK-s39Pv-OXSEc0Z" -O masterprofi-master.apk
```

### Проблема: Файл требует подтверждения

Google Drive может показывать предупреждение о вирусах. В этом случае:

1. Откройте ссылку в браузере
2. Нажмите "Все равно скачать"
3. Скопируйте прямую ссылку из браузера
4. Используйте её в wget

### Проблема: Ограничения доступа

Убедитесь, что файл доступен для всех (или для вашего аккаунта Google).

## Рекомендация

**Лучший способ:** Используйте GitHub Releases для хранения APK:

1. Создайте релиз в GitHub репозитории
2. Загрузите APK как asset
3. Используйте прямую ссылку:
```bash
wget "https://github.com/username/repo/releases/download/v1.0.0/masterprofi-master.apk" -O masterprofi-master.apk
```

Это самый надежный способ для автоматизации.
