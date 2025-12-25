import express from 'express';
import { query } from '../database/db.js';

const router = express.Router();

// Получить весь прайс-лист
router.get('/', (req, res) => {
  try {
    const { category, type } = req.query;
    
    let sql = 'SELECT * FROM prices WHERE 1=1';
    const params = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY category, name';
    
    const prices = query.all(sql, params);
    
    res.json(prices);
  } catch (error) {
    console.error('Ошибка при получении прайс-листа:', error);
    res.status(500).json({ error: 'Ошибка при получении прайс-листа' });
  }
});

// Получить работы (type = 'service')
router.get('/services', (req, res) => {
  try {
    const { category } = req.query;
    
    let sql = "SELECT * FROM prices WHERE type = 'service'";
    const params = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    sql += ' ORDER BY category, name';
    
    const services = query.all(sql, params);
    
    res.json(services);
  } catch (error) {
    console.error('Ошибка при получении работ:', error);
    res.status(500).json({ error: 'Ошибка при получении работ' });
  }
});

// Получить запчасти (type = 'part')
router.get('/parts', (req, res) => {
  try {
    const { category } = req.query;
    
    let sql = "SELECT * FROM prices WHERE type = 'part'";
    const params = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    sql += ' ORDER BY category, name';
    
    const parts = query.all(sql, params);
    
    res.json(parts);
  } catch (error) {
    console.error('Ошибка при получении запчастей:', error);
    res.status(500).json({ error: 'Ошибка при получении запчастей' });
  }
});

// Получить категории
router.get('/categories', (req, res) => {
  try {
    const { type } = req.query;
    
    let sql = 'SELECT DISTINCT category FROM prices WHERE 1=1';
    const params = [];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY category';
    
    const categories = query.all(sql, params).map(row => row.category);
    
    res.json(categories);
  } catch (error) {
    console.error('Ошибка при получении категорий:', error);
    res.status(500).json({ error: 'Ошибка при получении категорий' });
  }
});

export default router;
