import express from 'express';
import { query } from '../database/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createBackup, listBackups, restoreBackup } from '../services/backup-service.js';
import { notifyMasters } from '../services/assignment-service.js';
import { verifySMSService, checkSMSRuBalance } from '../services/sms-service.js';
import { verifyEmailService } from '../services/email-service.js';
import { getRateLimitStats, unblockIP, resetIPCounter } from '../middleware/rate-limiter.js';

const router = express.Router();

// Все маршруты требуют авторизации и роли admin
router.use(authenticate);
router.use(authorize('admin'));

// ============= Статистика =============

// Общая статистика для дашборда
router.get('/stats', (req, res) => {
  try {
    // Статистика заказов
    const ordersStats = {
      total: query.get('SELECT COUNT(*) as count FROM orders').count,
      new: query.get('SELECT COUNT(*) as count FROM orders WHERE repair_status = ?', ['new']).count,
      inProgress: query.get('SELECT COUNT(*) as count FROM orders WHERE repair_status = ?', ['in_progress']).count,
      completed: query.get('SELECT COUNT(*) as count FROM orders WHERE repair_status = ?', ['completed']).count,
      cancelled: query.get('SELECT COUNT(*) as count FROM orders WHERE repair_status = ?', ['cancelled']).count,
      today: query.get(`
        SELECT COUNT(*) as count FROM orders 
        WHERE DATE(created_at) = DATE('now')
      `).count,
      thisWeek: query.get(`
        SELECT COUNT(*) as count FROM orders 
        WHERE created_at >= datetime('now', '-7 days')
      `).count,
      thisMonth: query.get(`
        SELECT COUNT(*) as count FROM orders 
        WHERE created_at >= datetime('now', '-30 days')
      `).count
    };
    
    // Статистика мастеров
    const mastersStats = {
      total: query.get('SELECT COUNT(*) as count FROM masters').count,
      verified: query.get('SELECT COUNT(*) as count FROM masters WHERE verification_status = ?', ['verified']).count,
      pending: query.get('SELECT COUNT(*) as count FROM masters WHERE verification_status = ?', ['pending']).count,
      onShift: query.get('SELECT COUNT(*) as count FROM masters WHERE is_on_shift = 1').count,
      available: query.get('SELECT COUNT(*) as count FROM masters WHERE status = ?', ['available']).count
    };
    
    // Статистика клиентов
    const clientsStats = {
      total: query.get('SELECT COUNT(*) as count FROM clients').count,
      active: query.get(`
        SELECT COUNT(DISTINCT client_id) as count 
        FROM orders 
        WHERE created_at >= datetime('now', '-30 days')
      `).count
    };
    
    // Статистика доходов платформы
    const revenueStats = {
      total: query.get(`
        SELECT COALESCE(SUM(commission_amount), 0) as total 
        FROM master_transactions 
        WHERE transaction_type = 'commission' AND status = 'completed'
      `).total || 0,
      thisMonth: query.get(`
        SELECT COALESCE(SUM(commission_amount), 0) as total 
        FROM master_transactions 
        WHERE transaction_type = 'commission' 
        AND status = 'completed'
        AND created_at >= datetime('now', '-30 days')
      `).total || 0,
      today: query.get(`
        SELECT COALESCE(SUM(commission_amount), 0) as total 
        FROM master_transactions 
        WHERE transaction_type = 'commission' 
        AND status = 'completed'
        AND DATE(created_at) = DATE('now')
      `).total || 0
    };
    
    // Статистика жалоб
    const complaintsStats = {
      total: query.get('SELECT COUNT(*) as count FROM complaints').count,
      pending: query.get('SELECT COUNT(*) as count FROM complaints WHERE status = ?', ['pending']).count,
      resolved: query.get('SELECT COUNT(*) as count FROM complaints WHERE status = ?', ['resolved']).count
    };
    
    // Статистика документов верификации
    const verificationStats = {
      pending: query.get('SELECT COUNT(*) as count FROM master_verification_documents WHERE status = ?', ['pending']).count,
      approved: query.get('SELECT COUNT(*) as count FROM master_verification_documents WHERE status = ?', ['approved']).count,
      rejected: query.get('SELECT COUNT(*) as count FROM master_verification_documents WHERE status = ?', ['rejected']).count
    };
    
    res.json({
      orders: ordersStats,
      masters: mastersStats,
      clients: clientsStats,
      revenue: revenueStats,
      complaints: complaintsStats,
      verification: verificationStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Статистика по заказам с детализацией
router.get('/stats/orders', (req, res) => {
  try {
    const { period = 'all' } = req.query; // 'day', 'week', 'month', 'all'
    
    let dateFilter = '';
    if (period === 'day') {
      dateFilter = "WHERE DATE(created_at) = DATE('now')";
    } else if (period === 'week') {
      dateFilter = "WHERE created_at >= datetime('now', '-7 days')";
    } else if (period === 'month') {
      dateFilter = "WHERE created_at >= datetime('now', '-30 days')";
    }
    
    const stats = query.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(CASE WHEN repair_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN repair_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        AVG(estimated_cost) as avg_estimated_cost,
        AVG(final_cost) as avg_final_cost
      FROM orders
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);
    
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики заказов:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// ============= Управление заказами =============

// Получить список мастеров для назначения
router.get('/masters/list', (req, res) => {
  try {
    const { search, status, verified, device_type } = req.query;
    
    let sql = `
      SELECT 
        m.id,
        m.user_id,
        m.rating,
        m.completed_orders,
        m.status,
        m.verification_status,
        m.is_on_shift,
        m.specialization,
        u.name,
        u.email,
        u.phone
      FROM masters m
      JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    // Всегда показываем только верифицированных мастеров
    sql += ' AND m.verification_status = ?';
    params.push('verified');
    
    if (status) {
      sql += ' AND m.status = ?';
      params.push(status);
    }
    
    if (search) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    sql += ' ORDER BY u.name ASC';
    
    let masters = query.all(sql, params);
    
    console.log(`[GET /api/admin/masters/list] Найдено мастеров до фильтрации: ${masters.length}, device_type: ${device_type || 'не указан'}`);
    
    // Фильтруем по специализации, если указан device_type
    if (device_type) {
      const beforeCount = masters.length;
      masters = masters.filter(master => {
        try {
          const specializationStr = master.specialization || '[]';
          const specializations = JSON.parse(specializationStr);
          
          if (!Array.isArray(specializations)) {
            console.log(`[GET /api/admin/masters/list] Мастер #${master.id}: специализация не массив`);
            return false;
          }
          
          if (specializations.length === 0) {
            console.log(`[GET /api/admin/masters/list] Мастер #${master.id}: пустая специализация`);
            return false;
          }
          
          // Сравниваем без учета регистра и пробелов
          const normalizedDeviceType = device_type.trim().toLowerCase();
          const hasSpecialization = specializations.some(spec => 
            spec && spec.toString().trim().toLowerCase() === normalizedDeviceType
          );
          
          if (!hasSpecialization) {
            console.log(`[GET /api/admin/masters/list] Мастер #${master.id} (${master.name}): специализации [${specializations.join(', ')}] не содержат "${device_type}" (нормализовано: "${normalizedDeviceType}")`);
          } else {
            console.log(`[GET /api/admin/masters/list] ✅ Мастер #${master.id} (${master.name}) подходит: специализации [${specializations.join(', ')}] содержат "${device_type}"`);
          }
          
          return hasSpecialization;
        } catch (e) {
          console.error(`[GET /api/admin/masters/list] Ошибка парсинга специализации мастера #${master.id}:`, e, 'Значение:', master.specialization);
          return false;
        }
      });
      
      console.log(`[GET /api/admin/masters/list] После фильтрации по специализации "${device_type}": ${beforeCount} -> ${masters.length} мастеров`);
    } else {
      console.log(`[GET /api/admin/masters/list] device_type не указан, показываем всех верифицированных мастеров`);
    }
    
    // Удаляем поле specialization из ответа (не нужно на фронтенде)
    masters = masters.map(({ specialization, ...rest }) => rest);
    
    console.log(`[GET /api/admin/masters/list] Возвращаем ${masters.length} мастеров`);
    res.json(masters);
  } catch (error) {
    console.error('Ошибка получения списка мастеров:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Ручное назначение заказа мастеру
router.post('/orders/:orderId/assign', (req, res) => {
  try {
    const { orderId } = req.params;
    const { masterId } = req.body;
    
    if (!masterId) {
      return res.status(400).json({ error: 'Необходимо указать masterId' });
    }
    
    // Проверяем заказ
    const order = query.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    if (order.repair_status !== 'new') {
      return res.status(400).json({ error: 'Заказ уже обработан' });
    }
    
    // Проверяем мастера
    const master = query.get('SELECT * FROM masters WHERE id = ?', [masterId]);
    if (!master) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }
    
    // Назначаем заказ мастеру
    query.run(
      'UPDATE orders SET repair_status = ?, assigned_master_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['in_progress', masterId, orderId]
    );
    
    // Записываем в историю
    query.run(
      'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
      [orderId, 'new', 'in_progress', req.user.id, `Заказ назначен вручную администратором`]
    );
    
    res.json({ message: 'Заказ успешно назначен мастеру' });
  } catch (error) {
    console.error('Ошибка назначения заказа:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Отменить заказ
router.post('/orders/:orderId/cancel', (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const order = query.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    if (order.repair_status === 'cancelled') {
      return res.status(400).json({ error: 'Заказ уже отменен' });
    }
    
    const oldStatus = order.repair_status;
    
    // Отменяем заказ
    query.run(
      'UPDATE orders SET repair_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', orderId]
    );
    
    // Записываем в историю
    query.run(
      'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
      [orderId, oldStatus, 'cancelled', req.user.id, reason || 'Заказ отменен администратором']
    );
    
    res.json({ message: 'Заказ отменен' });
  } catch (error) {
    console.error('Ошибка отмены заказа:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// ============= Управление пользователями =============

// Блокировать/разблокировать пользователя
router.post('/users/:userId/block', (req, res) => {
  try {
    const { userId } = req.params;
    const { blocked, reason } = req.body;
    
    // Проверяем, есть ли поле is_blocked в таблице users
    const tableInfo = query.all("PRAGMA table_info(users)");
    const hasIsBlocked = tableInfo.some(col => col.name === 'is_blocked');
    
    if (!hasIsBlocked) {
      // Добавляем поле, если его нет
      query.run('ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0');
      query.run('ALTER TABLE users ADD COLUMN block_reason TEXT');
      query.run('ALTER TABLE users ADD COLUMN blocked_at DATETIME');
      query.run('ALTER TABLE users ADD COLUMN blocked_by INTEGER');
    }
    
    // Обновляем статус блокировки
    if (blocked) {
      query.run(
        'UPDATE users SET is_blocked = 1, block_reason = ?, blocked_at = CURRENT_TIMESTAMP, blocked_by = ? WHERE id = ?',
        [reason || 'Заблокирован администратором', req.user.id, userId]
      );
      
      // Если это мастер, обновляем его статус
      const master = query.get('SELECT id FROM masters WHERE user_id = ?', [userId]);
      if (master) {
        query.run('UPDATE masters SET status = ? WHERE id = ?', ['offline', master.id]);
      }
    } else {
      query.run(
        'UPDATE users SET is_blocked = 0, block_reason = NULL, blocked_at = NULL, blocked_by = NULL WHERE id = ?',
        [userId]
      );
    }
    
    res.json({ 
      message: blocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован' 
    });
  } catch (error) {
    console.error('Ошибка блокировки пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Получить список всех пользователей
router.get('/users', (req, res) => {
  try {
    const { role, blocked } = req.query;
    
    let sql = `
      SELECT 
        u.*,
        CASE WHEN m.id IS NOT NULL THEN m.id ELSE NULL END as master_id,
        CASE WHEN c.id IS NOT NULL THEN c.id ELSE NULL END as client_id,
        m.verification_status,
        m.rating,
        m.completed_orders
      FROM users u
      LEFT JOIN masters m ON u.id = m.user_id
      LEFT JOIN clients c ON u.id = c.user_id
      WHERE 1=1
    `;
    const params = [];
    
    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }
    
    if (blocked !== undefined) {
      const tableInfo = query.all("PRAGMA table_info(users)");
      const hasIsBlocked = tableInfo.some(col => col.name === 'is_blocked');
      if (hasIsBlocked) {
        sql += ' AND u.is_blocked = ?';
        params.push(blocked === 'true' ? 1 : 0);
      }
    }
    
    sql += ' ORDER BY u.created_at DESC';
    
    const users = query.all(sql, params);
    
    res.json(users);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Удалить аккаунт мастера
router.delete('/masters/:masterId', (req, res) => {
  try {
    const { masterId } = req.params;
    
    // Проверяем существование мастера
    const master = query.get('SELECT id, user_id FROM masters WHERE id = ?', [masterId]);
    if (!master) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }
    
    // Проверяем, нет ли активных заказов у мастера
    const activeOrders = query.all(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE assigned_master_id = ? 
        AND repair_status IN ('new', 'in_progress', 'diagnostics', 'waiting_parts')
    `, [masterId]);
    
    if (activeOrders.length > 0 && activeOrders[0].count > 0) {
      return res.status(400).json({ 
        error: 'Невозможно удалить мастера с активными заказами',
        activeOrdersCount: activeOrders[0].count
      });
    }
    
    // Получаем информацию о мастере для логирования
    const masterInfo = query.get(`
      SELECT m.*, u.name, u.email 
      FROM masters m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.id = ?
    `, [masterId]);
    
    // Удаляем мастера (CASCADE удалит связанные записи)
    // Сначала удаляем мастера, потом пользователя
    // Это безопаснее, так как многие таблицы ссылаются на masters.id
    
    // Удаляем назначения мастера
    query.run('DELETE FROM order_assignments WHERE master_id = ?', [masterId]);
    
    // Обнуляем назначения в заказах
    query.run('UPDATE orders SET assigned_master_id = NULL WHERE assigned_master_id = ?', [masterId]);
    query.run('UPDATE orders SET preferred_master_id = NULL WHERE preferred_master_id = ?', [masterId]);
    
    // Удаляем мастера
    query.run('DELETE FROM masters WHERE id = ?', [masterId]);
    
    // Удаляем пользователя (CASCADE удалит связанные записи)
    query.run('DELETE FROM users WHERE id = ?', [master.user_id]);
    
    console.log(`🗑️ Администратор ${req.user.id} удалил мастера #${masterId} (${masterInfo.name}, ${masterInfo.email})`);
    
    res.json({ 
      message: 'Аккаунт мастера успешно удален',
      deletedMaster: {
        id: masterId,
        name: masterInfo.name,
        email: masterInfo.email
      }
    });
  } catch (error) {
    console.error('Ошибка удаления мастера:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Удалить пользователя
router.delete('/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Проверяем существование пользователя
    const user = query.get('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Если это мастер, проверяем активные заказы
    if (user.role === 'master') {
      const master = query.get('SELECT id FROM masters WHERE user_id = ?', [userId]);
      if (master) {
        const activeOrders = query.all(`
          SELECT COUNT(*) as count 
          FROM orders 
          WHERE assigned_master_id = ? 
            AND repair_status IN ('new', 'in_progress', 'diagnostics', 'waiting_parts')
        `, [master.id]);
        
        if (activeOrders.length > 0 && activeOrders[0].count > 0) {
          return res.status(400).json({ 
            error: 'Невозможно удалить мастера с активными заказами',
            activeOrdersCount: activeOrders[0].count
          });
        }
        
        // Удаляем назначения мастера
        query.run('DELETE FROM order_assignments WHERE master_id = ?', [master.id]);
        query.run('UPDATE orders SET assigned_master_id = NULL WHERE assigned_master_id = ?', [master.id]);
        query.run('UPDATE orders SET preferred_master_id = NULL WHERE preferred_master_id = ?', [master.id]);
        
        // Удаляем мастера
        query.run('DELETE FROM masters WHERE id = ?', [master.id]);
      }
    }
    
    // Если это клиент, удаляем связанные данные
    if (user.role === 'client') {
      const client = query.get('SELECT id FROM clients WHERE user_id = ?', [userId]);
      if (client) {
        // Обнуляем заказы клиента (или можно удалить, в зависимости от бизнес-логики)
        query.run('UPDATE orders SET client_id = NULL WHERE client_id = ?', [client.id]);
        query.run('DELETE FROM clients WHERE id = ?', [client.id]);
      }
    }
    
    // Удаляем пользователя (CASCADE удалит связанные записи)
    query.run('DELETE FROM users WHERE id = ?', [userId]);
    
    console.log(`🗑️ Администратор ${req.user.id} удалил пользователя #${userId} (${user.name}, ${user.email}, роль: ${user.role})`);
    
    res.json({ 
      message: 'Пользователь успешно удален',
      deletedUser: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// ============= Резервное копирование =============

// Создать бэкап
router.post('/backup/create', (req, res) => {
  try {
    const backup = createBackup();
    res.json({
      message: 'Бэкап успешно создан',
      backup: backup
    });
  } catch (error) {
    console.error('Ошибка создания бэкапа:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Получить список бэкапов
router.get('/backup/list', (req, res) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (error) {
    console.error('Ошибка получения списка бэкапов:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Восстановить из бэкапа
router.post('/backup/restore', (req, res) => {
  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.status(400).json({ error: 'Необходимо указать fileName' });
    }
    
    const result = restoreBackup(fileName);
    res.json({
      message: 'База данных успешно восстановлена',
      result: result
    });
  } catch (error) {
    console.error('Ошибка восстановления бэкапа:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// ============= Проверка сервисов =============

// Проверка SMS сервиса
router.get('/services/sms/status', async (req, res) => {
  try {
    const status = await verifySMSService();
    res.json(status);
  } catch (error) {
    console.error('Ошибка проверки SMS сервиса:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера', 
      details: error.message 
    });
  }
});

// Проверка баланса SMS.ru
router.get('/services/sms/balance', async (req, res) => {
  try {
    const balance = await checkSMSRuBalance();
    res.json(balance);
  } catch (error) {
    console.error('Ошибка проверки баланса SMS:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера', 
      details: error.message 
    });
  }
});

// Проверка Email сервиса
router.get('/services/email/status', async (req, res) => {
  try {
    const status = await verifyEmailService();
    res.json(status);
  } catch (error) {
    console.error('Ошибка проверки Email сервиса:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера', 
      details: error.message 
    });
  }
});

// Проверка всех сервисов сразу
router.get('/services/health', async (req, res) => {
  try {
    const [smsStatus, emailStatus] = await Promise.all([
      verifySMSService().catch(e => ({ success: false, error: e.message })),
      verifyEmailService().catch(e => ({ success: false, error: e.message }))
    ]);
    
    let smsBalance = null;
    if (smsStatus.success && smsStatus.provider === 'smsru') {
      try {
        smsBalance = await checkSMSRuBalance();
      } catch (e) {
        console.warn('Не удалось получить баланс SMS:', e.message);
      }
    }
    
    res.json({
      services: {
        sms: {
          ...smsStatus,
          balance: smsBalance
        },
        email: emailStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ошибка проверки сервисов:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера', 
      details: error.message 
    });
  }
});

// ============= WebSocket мониторинг =============
router.get('/websocket/stats', async (req, res) => {
  try {
    const { getMasterSubscriptionsStats, getConnectedClientsCount } = await import('../websocket.js');
    
    const stats = getMasterSubscriptionsStats();
    const totalConnected = getConnectedClientsCount();
    
    res.json({
      ...stats,
      totalConnected
    });
  } catch (error) {
    console.error('Ошибка получения статистики WebSocket:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// ============= Rate Limiting управление =============

// Получить статистику rate limiting
router.get('/rate-limit/stats', (req, res) => {
  try {
    const stats = getRateLimitStats();
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики rate limiting:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Разблокировать IP адрес
router.post('/rate-limit/unblock', (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'Необходимо указать IP адрес' });
    }
    
    const unblocked = unblockIP(ip);
    
    if (unblocked) {
      res.json({ 
        message: `IP ${ip} успешно разблокирован`,
        ip: ip
      });
    } else {
      res.status(404).json({ 
        error: `IP ${ip} не найден в списке заблокированных` 
      });
    }
  } catch (error) {
    console.error('Ошибка разблокировки IP:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Сбросить счетчик запросов для IP
router.post('/rate-limit/reset', (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'Необходимо указать IP адрес' });
    }
    
    resetIPCounter(ip);
    
    res.json({ 
      message: `Счетчик запросов для IP ${ip} сброшен`,
      ip: ip
    });
  } catch (error) {
    console.error('Ошибка сброса счетчика IP:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// ============= Чат с администрацией =============

/**
 * GET /api/admin/admin-chat/messages/:userId
 * Получить сообщения чата с конкретным пользователем
 */
router.get('/admin-chat/messages/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const messages = query.all(`
      SELECT 
        acm.id,
        acm.user_id,
        acm.sender_id,
        acm.sender_role,
        acm.message_type,
        acm.message_text,
        acm.image_url,
        acm.image_thumbnail_url,
        acm.file_url,
        acm.file_name,
        acm.read_at,
        acm.created_at,
        u.name as sender_name,
        u.role as sender_user_role
      FROM admin_chat_messages acm
      JOIN users u ON acm.sender_id = u.id
      WHERE acm.user_id = ?
      ORDER BY acm.created_at ASC
    `, [userId]);
    
    res.json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/admin/admin-chat/messages/:userId
 * Отправить сообщение пользователю от администрации
 */
router.post('/admin-chat/messages/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user.id;
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }
    
    const result = query.run(`
      INSERT INTO admin_chat_messages (user_id, sender_id, sender_role, message_type, message_text)
      VALUES (?, ?, 'admin', 'text', ?)
    `, [userId, adminId, message.trim()]);
    
    const createdMessage = query.get(`
      SELECT 
        acm.id,
        acm.user_id,
        acm.sender_id,
        acm.sender_role,
        acm.message_type,
        acm.message_text,
        acm.image_url,
        acm.image_thumbnail_url,
        acm.file_url,
        acm.file_name,
        acm.read_at,
        acm.created_at,
        u.name as sender_name,
        u.role as sender_user_role
      FROM admin_chat_messages acm
      JOIN users u ON acm.sender_id = u.id
      WHERE acm.id = ?
    `, [result.lastInsertRowid]);
    
    res.status(201).json(createdMessage);
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/admin/admin-chat/users
 * Получить список пользователей с активными чатами
 */
router.get('/admin-chat/users', (req, res) => {
  try {
    const users = query.all(`
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        (SELECT COUNT(*) FROM admin_chat_messages 
         WHERE user_id = u.id AND sender_role = 'user' AND read_at IS NULL) as unread_count,
        (SELECT MAX(created_at) FROM admin_chat_messages 
         WHERE user_id = u.id) as last_message_at
      FROM users u
      INNER JOIN admin_chat_messages acm ON u.id = acm.user_id
      WHERE u.role IN ('master', 'client')
      ORDER BY last_message_at DESC
    `);
    
    res.json(users);
  } catch (error) {
    console.error('Ошибка получения списка пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============= Обратная связь =============

/**
 * GET /api/admin/feedback
 * Получить список обратной связи
 */
router.get('/feedback', (req, res) => {
  try {
    const { status, feedback_type } = req.query;
    
    let sql = `
      SELECT 
        f.id,
        f.user_id,
        f.feedback_type,
        f.subject,
        f.message,
        f.attachments,
        f.status,
        f.admin_response,
        f.responded_by,
        f.responded_at,
        f.created_at,
        f.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      sql += ' AND f.status = ?';
      params.push(status);
    }
    
    if (feedback_type) {
      sql += ' AND f.feedback_type = ?';
      params.push(feedback_type);
    }
    
    sql += ' ORDER BY f.created_at DESC';
    
    const feedbackList = query.all(sql, params);
    res.json(feedbackList);
  } catch (error) {
    console.error('Ошибка получения обратной связи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/admin/feedback/:id
 * Получить детали обратной связи
 */
router.get('/feedback/:id', (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    
    const feedback = query.get(`
      SELECT 
        f.id,
        f.user_id,
        f.feedback_type,
        f.subject,
        f.message,
        f.attachments,
        f.status,
        f.admin_response,
        f.responded_by,
        f.responded_at,
        f.created_at,
        f.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `, [feedbackId]);
    
    if (!feedback) {
      return res.status(404).json({ error: 'Обратная связь не найдена' });
    }
    
    res.json(feedback);
  } catch (error) {
    console.error('Ошибка получения обратной связи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/admin/feedback/:id/respond
 * Ответить на обратную связь
 */
router.put('/feedback/:id/respond', async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const adminId = req.user.id;
    const { admin_response, status } = req.body;
    
    if (!admin_response || admin_response.trim().length === 0) {
      return res.status(400).json({ error: 'Ответ не может быть пустым' });
    }
    
    // Получаем информацию о пользователе перед обновлением
    const feedbackBefore = query.get(`
      SELECT user_id, subject FROM feedback WHERE id = ?
    `, [feedbackId]);
    
    if (!feedbackBefore) {
      return res.status(404).json({ error: 'Обратная связь не найдена' });
    }
    
    query.run(`
      UPDATE feedback
      SET admin_response = ?,
          status = ?,
          responded_by = ?,
          responded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [admin_response.trim(), status || 'resolved', adminId, feedbackId]);
    
    const updatedFeedback = query.get(`
      SELECT 
        f.id,
        f.user_id,
        f.feedback_type,
        f.subject,
        f.message,
        f.attachments,
        f.status,
        f.admin_response,
        f.responded_by,
        f.responded_at,
        f.created_at,
        f.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `, [feedbackId]);
    
    // Отправляем push-уведомление пользователю
    try {
      const { sendPushNotification } = await import('../services/push-notification-service.js');
      await sendPushNotification(feedbackBefore.user_id, {
        title: 'Ответ на вашу обратную связь',
        body: `По обращению "${feedbackBefore.subject}" получен ответ от администрации`,
        data: {
          type: 'feedback_response',
          feedbackId: feedbackId.toString(),
          subject: feedbackBefore.subject
        }
      });
      console.log(`📱 Push-уведомление отправлено пользователю #${feedbackBefore.user_id} о ответе на обратную связь`);
    } catch (notifError) {
      console.error('Ошибка отправки push-уведомления:', notifError);
      // Не прерываем выполнение, если уведомление не отправилось
    }
    
    res.json(updatedFeedback);
  } catch (error) {
    console.error('Ошибка ответа на обратную связь:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/admin/feedback/:id/status
 * Изменить статус обратной связи
 */
router.put('/feedback/:id/status', (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !['new', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }
    
    query.run(`
      UPDATE feedback
      SET status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, feedbackId]);
    
    res.json({ message: 'Статус обновлен', status });
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============= Telegram Bot =============

// Получить настройки Telegram бота
router.get('/telegram/config', authenticateToken, isAdmin, (req, res) => {
  try {
    let botToken = '';
    let channelId = '';

    // Пытаемся загрузить из БД
    try {
      const botTokenSetting = query.get('SELECT value FROM settings WHERE key = ?', ['telegram_bot_token']);
      const channelIdSetting = query.get('SELECT value FROM settings WHERE key = ?', ['telegram_channel_id']);
      
      botToken = botTokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN || '';
      channelId = channelIdSetting?.value || process.env.TELEGRAM_CHANNEL_ID || '';
    } catch (error) {
      // Если таблицы нет, используем только переменные окружения
      botToken = process.env.TELEGRAM_BOT_TOKEN || '';
      channelId = process.env.TELEGRAM_CHANNEL_ID || '';
    }

    res.json({
      botToken: botToken,
      channelId: channelId,
      isConfigured: !!(botToken && channelId)
    });
  } catch (error) {
    console.error('Ошибка получения настроек Telegram:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить настройки Telegram бота
router.post('/telegram/config', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { botToken, channelId } = req.body;

    if (!botToken || !channelId) {
      return res.status(400).json({ error: 'Токен бота и ID канала обязательны' });
    }

    // Обновляем настройки в сервисе
    const telegramBot = (await import('../services/telegram-bot.js')).default;
    telegramBot.updateConfig(botToken, channelId);

    // Проверяем подключение
    const connectionTest = await telegramBot.testConnection();
    if (!connectionTest.success) {
      return res.status(400).json({ 
        error: 'Не удалось подключиться к боту', 
        details: connectionTest.error 
      });
    }

    // Проверяем доступ к каналу
    const channelTest = await telegramBot.testChannel();
    if (!channelTest.success) {
      return res.status(400).json({ 
        error: 'Не удалось получить доступ к каналу', 
        details: channelTest.error 
      });
    }

    // Сохраняем в переменные окружения (в реальном проекте лучше использовать БД или конфиг файл)
    // Для простоты сохраняем в .env файл или используем БД для хранения настроек
    // Здесь мы просто обновляем в памяти, для постоянного хранения нужно использовать БД
    
    res.json({ 
      message: 'Настройки Telegram бота обновлены',
      bot: connectionTest.bot,
      channel: channelTest.chat
    });
  } catch (error) {
    console.error('Ошибка обновления настроек Telegram:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Тест подключения к Telegram боту
router.post('/telegram/test', authenticateToken, isAdmin, async (req, res) => {
  try {
    const telegramBot = (await import('../services/telegram-bot.js')).default;
    
    const connectionTest = await telegramBot.testConnection();
    if (!connectionTest.success) {
      return res.status(400).json({ 
        success: false,
        error: connectionTest.error 
      });
    }

    const channelTest = await telegramBot.testChannel();
    if (!channelTest.success) {
      return res.status(400).json({ 
        success: false,
        error: channelTest.error 
      });
    }

    // Отправляем тестовое сообщение
    const testMessage = await telegramBot.sendMessage(
      '✅ <b>Тестовое сообщение</b>\n\nБот успешно настроен и готов к работе!',
      null,
      { parse_mode: 'HTML' }
    );

    res.json({ 
      success: true,
      bot: connectionTest.bot,
      channel: channelTest.chat,
      testMessage: testMessage
    });
  } catch (error) {
    console.error('Ошибка тестирования Telegram:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

export default router;

