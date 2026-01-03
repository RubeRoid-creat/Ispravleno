import { query } from '../database/db.js';

/**
 * Создание таблицы для хранения настроек системы
 */
function createSettingsTable() {
  try {
    // Создаем таблицу настроек
    query.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Таблица settings создана');

    // Создаем индексы
    query.run('CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)');

    console.log('✅ Индексы для settings созданы');

    return true;
  } catch (error) {
    console.error('❌ Ошибка при создании таблицы settings:', error);
    return false;
  }
}

// Запуск миграции
if (import.meta.url === `file://${process.argv[1]}`) {
  createSettingsTable();
  process.exit(0);
}

export { createSettingsTable };

