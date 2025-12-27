# Решение конфликта Git при pull

## Проблема

При выполнении `git pull origin main` возникает ошибка:
```
error: Your local changes to the following files would be overwritten by merge:
website/setup-ispravleno-pro.sh
```

И команда `git checkout -- website/setup-ispravleno-pro.sh` не работает, потому что вы уже находитесь в директории `website`.

## Решение

### Вариант 1: Использовать stash (рекомендуется)

```bash
# Вы находитесь в директории website, поэтому используйте относительный путь
# 1. Сохраните локальные изменения
git stash

# 2. Обновите код из репозитория
git pull origin main

# 3. Примените сохраненные изменения (если нужны)
# git stash pop
# Или просто удалите stash, если изменения не нужны
git stash drop
```

### Вариант 2: Отменить изменения правильной командой

```bash
# Вы в директории website, поэтому путь без префикса website/
git checkout -- setup-ispravleno-pro.sh

# Или сбросить все локальные изменения
git reset --hard HEAD

# Затем обновить код
git pull origin main
```

### Вариант 3: Удалить файл и обновить из репозитория

```bash
# Удалить файл локально
rm setup-ispravleno-pro.sh

# Обновить код из репозитория
git pull origin main

# Файл будет восстановлен из репозитория
```

## Рекомендуемая последовательность команд

```bash
# 1. Убедитесь, что вы в правильной директории
pwd  # Должно быть: ~/Ispravleno/ispravleno-website/website

# 2. Сохраните изменения (если нужны) или просто сбросьте их
git stash
# или
git reset --hard HEAD

# 3. Обновите код
git pull origin main

# 4. Запустите скрипт
chmod +x setup-ispravleno-pro.sh
./setup-ispravleno-pro.sh
```
