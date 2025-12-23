@echo off
chcp 65001 >nul
echo ========================================
echo  Коммит переименования приложений
echo ========================================
echo.

cd /d "%~dp0"

echo Текущая директория: %CD%
echo.

echo Добавление файлов в Git...
git add -A

echo.
echo Статус репозитория:
git status --short

echo.
echo Создание коммита...
git commit -m "refactor: rename apps to 'Исправлено мастер' and 'Исправлено'" -m "- Master app: 'Ремонт Техники' → 'Исправлено мастер'" -m "- Client app: 'BestApp Client' → 'Исправлено'" -m "- Updated backend/README.md, admin-panel/README.md" -m "- Updated backend/package.json and server.js" -m "- Created ПЕРЕИМЕНОВАНИЕ_ПРИЛОЖЕНИЙ.md documentation"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Коммит создан успешно!
    echo.
    echo Отправка в GitHub...
    git push origin main
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✓✓✓ Успешно отправлено в GitHub!
        echo     https://github.com/RubeRoid-creat/Ispravleno
    ) else (
        echo.
        echo ✗ Ошибка при отправке в GitHub
        echo   Проверьте подключение к интернету
    )
) else (
    echo.
    echo ℹ Нет изменений для коммита или коммит уже создан
)

echo.
echo ========================================
echo  Готово!
echo ========================================
pause
