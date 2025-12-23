import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './database/db.js';

let wss = null;
const clients = new Map(); // userId -> WebSocket connection
const orderRooms = new Map(); // orderId -> Set of userIds
const masterSubscriptions = new Map(); // userId -> { subscribed: boolean, lastPing: Date }

// Инициализация WebSocket сервера
export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    console.log('🔌 Новое WebSocket подключение');
    
    let userId = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Аутентификация
        if (data.type === 'auth') {
          try {
            const decoded = jwt.verify(data.token, config.jwtSecret);
            userId = decoded.userId;
            
            // Сохраняем подключение
            clients.set(userId, ws);
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              message: 'Аутентификация успешна'
            }));
            
            console.log(`✅ WebSocket аутентификация: пользователь #${userId}`);
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Неверный токен'
            }));
            ws.close();
          }
        }
        
        // Ping-pong для поддержания соединения
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          
          // Обновляем время последнего ping для мастера
          if (userId && masterSubscriptions.has(userId)) {
            const subscription = masterSubscriptions.get(userId);
            subscription.lastPing = new Date();
          }
        }
        
        // Подписка мастера на получение заявок
        if (data.type === 'subscribe_assignments') {
          if (!userId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Требуется аутентификация'
            }));
            return;
          }
          
          // Проверяем, что это мастер
          const master = query.get(`
            SELECT m.id, m.user_id, m.status, m.is_on_shift
            FROM masters m
            WHERE m.user_id = ?
          `, [userId]);
          
          if (!master) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Пользователь не является мастером'
            }));
            return;
          }
          
          // Добавляем подписку
          masterSubscriptions.set(userId, {
            subscribed: true,
            lastPing: new Date(),
            masterId: master.id,
            onShift: master.is_on_shift === 1
          });
          
          ws.send(JSON.stringify({
            type: 'subscribed_assignments',
            message: 'Подписка на заявки активирована'
          }));
          
          console.log(`📋 Мастер #${master.id} подписался на заявки через WebSocket`);
        }
        
        // Отписка от получения заявок
        if (data.type === 'unsubscribe_assignments') {
          if (userId && masterSubscriptions.has(userId)) {
            masterSubscriptions.delete(userId);
            ws.send(JSON.stringify({
              type: 'unsubscribed_assignments',
              message: 'Подписка на заявки отменена'
            }));
            console.log(`📋 Мастер #${userId} отписался от заявок`);
          }
        }
        
        // Подписка на чат заказа
        if (data.type === 'join_order_chat') {
          if (!userId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Требуется аутентификация'
            }));
            return;
          }
          
          const orderId = data.orderId;
          if (!orderId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'orderId обязателен'
            }));
            return;
          }
          
          // Проверяем, что пользователь имеет доступ к заказу
          const order = query.get(`
            SELECT o.id, o.client_id, o.assigned_master_id, c.user_id as client_user_id, m.user_id as master_user_id
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN masters m ON o.assigned_master_id = m.id
            WHERE o.id = ?
          `, [orderId]);
          
          if (!order) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Заказ не найден'
            }));
            return;
          }
          
          // Проверяем доступ: клиент или назначенный мастер
          const hasAccess = order.client_user_id === userId || 
                           (order.assigned_master_id && order.master_user_id === userId);
          
          if (!hasAccess) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Нет доступа к этому заказу'
            }));
            return;
          }
          
          // Добавляем в комнату заказа
          if (!orderRooms.has(orderId)) {
            orderRooms.set(orderId, new Set());
          }
          orderRooms.get(orderId).add(userId);
          
          ws.send(JSON.stringify({
            type: 'joined_order_chat',
            orderId: orderId
          }));
        }
        
        // Отправка сообщения в чат заказа
        if (data.type === 'chat_message') {
          if (!userId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Требуется аутентификация'
            }));
            return;
          }
          
          const { orderId, message, messageType = 'text', imageUrl, imageThumbnailUrl } = data;
          
          if (!orderId || (!message && !imageUrl)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'orderId и message/imageUrl обязательны'
            }));
            return;
          }
          
          // Проверяем доступ к заказу
          const order = query.get(`
            SELECT o.id, o.client_id, o.assigned_master_id, c.user_id as client_user_id, m.user_id as master_user_id
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN masters m ON o.assigned_master_id = m.id
            WHERE o.id = ?
          `, [orderId]);
          
          if (!order) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Заказ не найден'
            }));
            return;
          }
          
          const hasAccess = order.client_user_id === userId || 
                           (order.assigned_master_id && order.master_user_id === userId);
          
          if (!hasAccess) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Нет доступа к этому заказу'
            }));
            return;
          }
          
          // Сохраняем сообщение в БД
          const result = query.run(`
            INSERT INTO chat_messages (order_id, sender_id, message_type, message_text, image_url, image_thumbnail_url)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [orderId, userId, messageType, message || null, imageUrl || null, imageThumbnailUrl || null]);
          
          const messageId = result.lastInsertRowid;
          
          // Получаем информацию об отправителе
          const sender = query.get('SELECT id, name FROM users WHERE id = ?', [userId]);
          
          // Формируем сообщение для отправки
          const chatMessage = {
            type: 'chat_message',
            orderId: orderId,
            messageId: messageId,
            senderId: userId,
            senderName: sender?.name || 'Неизвестный',
            messageType: messageType,
            message: message,
            imageUrl: imageUrl,
            imageThumbnailUrl: imageThumbnailUrl,
            createdAt: new Date().toISOString()
          };
          
          // Отправляем всем участникам чата этого заказа
          const room = orderRooms.get(orderId);
          if (room) {
            room.forEach(participantId => {
              sendToUser(participantId, chatMessage);
            });
          }
          
          // Также отправляем клиенту и мастеру, даже если они не в комнате
          if (order.client_user_id && order.client_user_id !== userId) {
            sendToUser(order.client_user_id, chatMessage);
          }
          if (order.master_user_id && order.master_user_id !== userId) {
            sendToUser(order.master_user_id, chatMessage);
          }
        }
        
        // Выход из чата заказа
        if (data.type === 'leave_order_chat') {
          const orderId = data.orderId;
          if (orderId && userId) {
            const room = orderRooms.get(orderId);
            if (room) {
              room.delete(userId);
              if (room.size === 0) {
                orderRooms.delete(orderId);
              }
            }
          }
        }
      } catch (error) {
        console.error('Ошибка обработки WebSocket сообщения:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        masterSubscriptions.delete(userId);
        
        // Удаляем из всех комнат заказов
        orderRooms.forEach((room, orderId) => {
          room.delete(userId);
          if (room.size === 0) {
            orderRooms.delete(orderId);
          }
        });
        
        console.log(`❌ WebSocket отключен: пользователь #${userId}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket ошибка:', error);
    });
  });
  
  console.log('✅ WebSocket сервер запущен на /ws');
}

// Отправка сообщения конкретному пользователю
export function sendToUser(userId, message) {
  const client = clients.get(userId);
  
  if (client && client.readyState === client.OPEN) {
    client.send(JSON.stringify(message));
    return true;
  }
  
  return false;
}

// Отправка сообщения мастеру
export function broadcastToMaster(userId, data) {
  return sendToUser(userId, data);
}

// Отправка сообщения клиенту
export function broadcastToClient(userId, data) {
  return sendToUser(userId, data);
}

// Отправка сообщения всем подключенным клиентам
export function broadcastToAll(message) {
  let sentCount = 0;
  
  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
      sentCount++;
    }
  });
  
  return sentCount;
}

// Получить количество подключенных клиентов
export function getConnectedClientsCount() {
  return clients.size;
}

// Отправка нового назначения мастеру через WebSocket
export function notifyMasterAssignment(masterId, assignmentData) {
  // Находим userId мастера
  const master = query.get('SELECT user_id FROM masters WHERE id = ?', [masterId]);
  if (!master) {
    console.warn(`⚠️ Мастер #${masterId} не найден для WebSocket уведомления`);
    return false;
  }
  
  const userId = master.user_id;
  
  // Проверяем подписку мастера
  const subscription = masterSubscriptions.get(userId);
  if (!subscription || !subscription.subscribed) {
    console.log(`📋 Мастер #${masterId} не подписан на WebSocket уведомления`);
    return false;
  }
  
  // Отправляем уведомление о новом назначении
  const message = {
    type: 'new_assignment',
    assignment: assignmentData
  };
  
  const sent = sendToUser(userId, message);
  
  if (sent) {
    console.log(`📋 ✅ Отправлено WebSocket уведомление мастеру #${masterId} о новом назначении #${assignmentData.id}`);
  } else {
    console.log(`📋 ❌ Не удалось отправить WebSocket уведомление мастеру #${masterId}`);
  }
  
  return sent;
}

// Уведомление об истечении назначения
export function notifyAssignmentExpired(masterId, assignmentId) {
  const master = query.get('SELECT user_id FROM masters WHERE id = ?', [masterId]);
  if (!master) return false;
  
  const message = {
    type: 'assignment_expired',
    assignmentId: assignmentId
  };
  
  return sendToUser(master.user_id, message);
}

// Уведомление об обновлении статуса заказа
export function notifyOrderStatusUpdate(orderId, newStatus) {
  // Получаем участников заказа
  const order = query.get(`
    SELECT o.id, o.client_id, o.assigned_master_id, 
           c.user_id as client_user_id, m.user_id as master_user_id
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN masters m ON o.assigned_master_id = m.id
    WHERE o.id = ?
  `, [orderId]);
  
  if (!order) return 0;
  
  const message = {
    type: 'order_status_update',
    orderId: orderId,
    newStatus: newStatus,
    timestamp: new Date().toISOString()
  };
  
  let sentCount = 0;
  
  // Уведомляем клиента
  if (order.client_user_id) {
    if (sendToUser(order.client_user_id, message)) sentCount++;
  }
  
  // Уведомляем мастера
  if (order.master_user_id) {
    if (sendToUser(order.master_user_id, message)) sentCount++;
  }
  
  return sentCount;
}

// Получить статистику подписок мастеров
export function getMasterSubscriptionsStats() {
  const stats = {
    totalSubscribed: masterSubscriptions.size,
    activeSubscriptions: 0,
    onShiftSubscriptions: 0,
    subscriptions: []
  };
  
  const now = new Date();
  
  masterSubscriptions.forEach((subscription, userId) => {
    const timeSinceLastPing = now - subscription.lastPing;
    const isActive = timeSinceLastPing < 60000; // активен если ping был менее минуты назад
    
    if (isActive) stats.activeSubscriptions++;
    if (subscription.onShift) stats.onShiftSubscriptions++;
    
    stats.subscriptions.push({
      userId,
      masterId: subscription.masterId,
      subscribed: subscription.subscribed,
      onShift: subscription.onShift,
      lastPing: subscription.lastPing,
      isActive
    });
  });
  
  return stats;
}

// Периодическая очистка неактивных подписок
setInterval(() => {
  const now = new Date();
  const timeout = 5 * 60 * 1000; // 5 минут без ping
  
  masterSubscriptions.forEach((subscription, userId) => {
    const timeSinceLastPing = now - subscription.lastPing;
    if (timeSinceLastPing > timeout) {
      console.log(`⏰ Удаление неактивной подписки мастера #${userId} (${Math.floor(timeSinceLastPing / 1000)}s без ping)`);
      masterSubscriptions.delete(userId);
    }
  });
}, 60000); // Проверка каждую минуту

export default {
  initWebSocket,
  sendToUser,
  broadcastToMaster,
  broadcastToClient,
  broadcastToAll,
  getConnectedClientsCount,
  notifyMasterAssignment,
  notifyAssignmentExpired,
  notifyOrderStatusUpdate,
  getMasterSubscriptionsStats
};





