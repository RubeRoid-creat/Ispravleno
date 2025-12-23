import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Получить список всех новостей
 *     tags: [News]
 */
router.get('/', async (req, res) => {
  try {
    const news = query.all(
      'SELECT * FROM news WHERE is_active = 1 ORDER BY published_at DESC'
    );
    res.json(news);
  } catch (error) {
    console.error('Ошибка при получении новостей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/news/{id}:
 *   get:
 *     summary: Получить новость по ID
 *     tags: [News]
 */
router.get('/:id', async (req, res) => {
  try {
    const item = query.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
    if (!item) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }
    res.json(item);
  } catch (error) {
    console.error('Ошибка при получении новости:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Админские эндпоинты
/**
 * @swagger
 * /api/news:
 *   post:
 *     summary: Создать новую новость (только админ)
 *     tags: [News]
 */
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { title, summary, content, image_url, category } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Заголовок и содержание обязательны' });
  }

  try {
    const result = query.run(
      'INSERT INTO news (title, summary, content, image_url, category) VALUES (?, ?, ?, ?, ?)',
      [title, summary, content, image_url, category || 'general']
    );
    
    const newItem = query.get('SELECT * FROM news WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Ошибка при создании новости:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/news/{id}:
 *   put:
 *     summary: Обновить новость (только админ)
 *     tags: [News]
 */
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { title, summary, content, image_url, category, is_active } = req.body;
  
  try {
    const existing = query.get('SELECT id FROM news WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }

    query.run(
      `UPDATE news SET 
        title = COALESCE(?, title), 
        summary = COALESCE(?, summary), 
        content = COALESCE(?, content), 
        image_url = COALESCE(?, image_url), 
        category = COALESCE(?, category), 
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [title, summary, content, image_url, category, is_active, req.params.id]
    );
    
    const updated = query.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Ошибка при обновлении новости:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/news/{id}:
 *   delete:
 *     summary: Удалить новость (только админ)
 *     tags: [News]
 */
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = query.run('DELETE FROM news WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }
    res.json({ message: 'Новость удалена' });
  } catch (error) {
    console.error('Ошибка при удалении новости:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
