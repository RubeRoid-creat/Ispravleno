# Установка Icons8 MCP для Cursor

## Шаги установки:

1. **Установите icons8 MCP сервер:**
```bash
npm install -g @icons8/mcp-server
```

2. **Добавьте конфигурацию в Cursor:**

Откройте файл конфигурации MCP в Cursor:
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp-settings.json`
- или через настройки Cursor: Settings → MCP Servers

Добавьте:
```json
{
  "mcpServers": {
    "icons8": {
      "command": "npx",
      "args": ["-y", "@icons8/mcp-server"]
    }
  }
}
```

3. **Перезапустите Cursor**

4. **Проверьте подключение:**
После перезапуска icons8 будет доступен в списке MCP серверов

## Использование:

После установки можно будет генерировать иконки командами типа:
- "Создай иконку гаечного ключа 512x512"
- "Сгенерируй app icon с домом"
