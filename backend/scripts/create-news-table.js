import { initDatabase, query } from '../database/db.js';

/**
 * Скрипт для создания таблицы news
 */
async function createNewsTable() {
  try {
    console.log('🔄 Инициализация базы данных...');
    await initDatabase();
    
    console.log('📝 Создание таблицы news...');
    
    // SQL для создания таблицы news
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT NOT NULL,
        image_url TEXT,
        category TEXT DEFAULT 'general',
        is_active INTEGER DEFAULT 1,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    try {
      query.run(createTableSql);
      console.log('✅ Таблица news успешно создана или уже существует');
      
      // Создаем индексы
      query.run('CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at)');
      query.run('CREATE INDEX IF NOT EXISTS idx_news_active ON news(is_active)');
      console.log('✅ Индексы для таблицы news созданы');
      
      // Добавляем тестовые данные, если таблица пуста
      const newsCount = query.get('SELECT COUNT(*) as count FROM news');
      if (newsCount.count === 0) {
        console.log('📝 Добавление начальных новостей...');
        const initialNews = [
          {
            title: "5 признаков того, что смартфон нуждается в ремонте",
            summary: "Узнайте основные сигналы, указывающие на необходимость профессионального ремонта вашего устройства",
            content: "Быстрая разрядка батареи, перегрев устройства, медленная работа, проблемы с сенсором и странные звуки - все это может указывать на серьезные проблемы.",
            category: "tips"
          },
          {
            title: "Новые стандарты USB-C в 2025 году",
            summary: "Европейский союз вводит обязательное использование USB-C для всех мобильных устройств",
            content: "С 2025 года все новые смартфоны, планшеты и ноутбуки должны поддерживать стандарт зарядки USB-C.",
            category: "industry"
          }
        ];
        
        const insertStmt = 'INSERT INTO news (title, summary, content, category) VALUES (?, ?, ?, ?)';
        for (const item of initialNews) {
          query.run(insertStmt, [item.title, item.summary, item.content, item.category]);
        }
        console.log('✅ Начальные новости добавлены');
      }
      
    } catch (e) {
      console.error('❌ Ошибка при работе с таблицей news:', e.message);
      throw e;
    }
    
    console.log('✅ Скрипт завершен успешно');
  } catch (error) {
    console.error('❌ Ошибка скрипта:', error);
    process.exit(1);
  }
}

createNewsTable();


