# Исправлено - Сервис вызова мастеров по ремонту техники

Полнофункциональная платформа для вызова мастеров по ремонту бытовой техники с мобильным приложением и веб-бэкендом.

## 📋 Структура проекта

- **[backend/](./backend/)** - REST API сервер на Node.js/Express
- **[ClientApp/](./ClientApp/)** - Мобильное приложение для клиентов (Android, Kotlin + Jetpack Compose)
- **[app/](./app/)** - Мобильное приложение для мастеров (React Native)
- **[website/](./website/)** - Веб-сайт проекта

## 🚀 Быстрый старт

### Backend

```bash
cd backend
npm install
npm run init-db
npm run dev
```

Сервер будет доступен по адресу: `http://localhost:3000`

### Client App (Android)

```bash
cd ClientApp
./gradlew assembleDebug
```

APK будет создан в `ClientApp/app/build/outputs/apk/debug/`

## 🛠️ Технологии

### Backend
- Node.js + Express.js
- SQLite (better-sqlite3)
- JWT аутентификация
- WebSocket для real-time уведомлений

### Client App
- Kotlin
- Jetpack Compose
- Material Design 3
- Retrofit + Hilt

### Master App
- React Native
- Redux
- CodePush для автообновлений

## 📱 Основной функционал

- Регистрация и авторизация клиентов и мастеров
- Создание заявок на ремонт техники
- Система уведомлений
- Отслеживание статуса заказа
- Рейтинги и отзывы
- MLM-система для мастеров
- Автоматическое распределение заказов

## 📄 Документация

- [Backend API](./backend/README.md)
- [Client App](./ClientApp/README.md)
- [Инструкции по загрузке APK](./HOW_TO_UPLOAD_APK.md)
- [Настройка SSH ключей](./SETUP_SSH_KEYS.md)

## 🔒 Безопасность

- JWT токены для аутентификации
- bcrypt для хеширования паролей
- HTTPS для production окружения
- Регулярное сканирование уязвимостей (Trivy)

## 📝 Лицензия

Проект разработан для внутреннего использования.
