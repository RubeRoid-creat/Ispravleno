# Установка приложений на телефон

## Способ 1: Прямая установка через браузер

### Для приложения Мастера:
1. Откройте на телефоне браузер
2. Перейдите по ссылке: **https://ispravleno.pro/apps/masterprofi-master.apk**
3. Нажмите "Скачать" или "Установить"
4. После скачивания откройте файл и установите

### Для приложения Клиента:
1. Откройте на телефоне браузер
2. Перейдите по ссылке: **https://ispravleno.pro/apps/masterprofi-client.apk**
3. Нажмите "Скачать" или "Установить"
4. После скачивания откройте файл и установите

## Способ 2: Через QR-код

Откройте QR-код сканер на телефоне и отсканируйте:

**Master App:**
```
https://ispravleno.pro/apps/masterprofi-master.apk
```

**Client App:**
```
https://ispravleno.pro/apps/masterprofi-client.apk
```

## Способ 3: Через ADB (для разработчиков)

Если у вас установлен Android SDK и включена отладка по USB:

```bash
# Установка Master App
adb install app\build\outputs\apk\debug\app-debug.apk

# Установка Client App
adb install ClientApp\app\build\outputs\apk\debug\app-debug.apk
```

## Важно!

**Для Android 8.0+** необходимо разрешить установку из неизвестных источников:
1. Настройки → Безопасность → Неизвестные источники
2. Или при установке система предложит разрешить установку для конкретного приложения

## Текущие версии:

- **Master App**: 1.2.4 (versionCode: 16)
- **Client App**: 1.0.3 (versionCode: 4)
