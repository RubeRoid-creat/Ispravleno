import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import { config } from './config.js';
import { initDatabase, query } from './database/db.js';
import { initWebSocket } from './websocket.js';

// Импорт маршрутов
import authRoutes from './routes/auth.js';
import ordersRoutes from './routes/orders.js';
import mastersRoutes from './routes/masters.js';
import assignmentsRoutes from './routes/assignments.js';
import servicesRoutes from './routes/services.js';
import reviewsRoutes from './routes/reviews.js';
import fcmRoutes from './routes/fcm.js';
import chatRoutes from './routes/chat.js';
import reportsRoutes from './routes/reports.js';
import versionRoutes from './routes/version.js';
import verificationRoutes from './routes/verification.js';
import complaintsRoutes from './routes/complaints.js';
import adminRoutes from './routes/admin.js';
import paymentsRoutes from './routes/payments.js';
import loyaltyRoutes from './routes/loyalty.js';
import routeOptimizationRoutes from './routes/route-optimization.js';
import mlmRoutes from './routes/mlm.js';
import verificationCodesRoutes from './routes/verification-codes.js';
import newsRoutes from './routes/news.js';
import remoteConfigRoutes from './routes/remote-config.js';
import adminChatRoutes from './routes/admin-chat.js';
import feedbackRoutes from './routes/feedback.js';
import pricesRoutes from './routes/prices.js';
// Импортируем push-notification-service для инициализации Firebase Admin SDK
import './services/push-notification-service.js';
// Инициализируем Redis для кэширования
import { initRedis } from './services/cache-service.js';

// Импорт security middleware
import { rateLimiter, strictRateLimiter, verificationRateLimiter, statsRateLimiter, verificationMasterRateLimiter } from './middleware/rate-limiter.js';
import { httpsRedirect, securityHeaders, sanitizeRequest, securityAuditLogger } from './middleware/security.js';

// Инициализация Express
const app = express();
const server = createServer(app);

// Security Middleware (применяется первым)
app.use(httpsRedirect); // HTTPS редирект в production
app.use(securityHeaders); // Заголовки безопасности
app.use(securityAuditLogger); // Аудит безопасности
app.use(rateLimiter()); // Rate limiting для всех запросов

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Ограничение размера JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequest); // Санитизация входных данных

// Статические файлы (для доступа к загруженным медиа)
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use('/uploads', express.static(join(__dirname, 'uploads')));
// Статичные файлы приложений (APK) для скачивания
app.use('/apps', express.static(join(__dirname, 'public', 'updates')));
// Оставляем /updates для обратной совместимости
app.use('/updates', express.static(join(__dirname, 'public', 'updates')));

// Админ-панель (SPA на React/Vite), собирается в backend/admin-panel/dist
app.use('/admin', express.static(join(__dirname, 'admin-panel', 'dist')));
app.get('/admin/*', (req, res) => {
  res.sendFile(join(__dirname, 'admin-panel', 'dist', 'index.html'));
});

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  if (req.path.includes('wallet') || req.path.includes('reorder')) {
    console.log(`[API DEBUG] Request: ${req.method} ${req.path}`);
    console.log(`[API DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
  }
  next();
});

// Инициализация базы данных и Redis
(async () => {
  try {
    await initDatabase();
    
    // Проверяем и добавляем поле inn, если его нет
    try {
      const tableInfo = query.all("PRAGMA table_info(masters)");
      const hasInn = tableInfo && Array.isArray(tableInfo) && tableInfo.some(col => col && col.name === 'inn');
      
      if (!hasInn) {
        console.log('📝 Добавление поля inn в таблицу masters...');
        try {
          query.run('ALTER TABLE masters ADD COLUMN inn TEXT');
          console.log('✅ Поле inn успешно добавлено в таблицу masters');
        } catch (e) {
          if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
            console.log('ℹ️ Поле inn уже существует');
          } else {
            console.error('⚠️ Ошибка добавления поля inn:', e.message);
          }
        }
      } else {
        console.log('✅ Поле inn присутствует в таблице masters');
      }
    } catch (e) {
      console.error('⚠️ Ошибка проверки поля inn:', e.message);
      // При ошибке проверки все равно пытаемся добавить поле
      try {
        query.run('ALTER TABLE masters ADD COLUMN inn TEXT');
        console.log('✅ Поле inn добавлено после ошибки проверки');
      } catch (e2) {
        if (!e2.message.includes('duplicate column') && !e2.message.includes('already exists')) {
          console.error('⚠️ Критическая ошибка добавления поля inn:', e2.message);
        }
      }
    }
    
    // Проверяем и добавляем поле sponsor_id в таблицу users, если его нет
    try {
      const usersTableInfo = query.all("PRAGMA table_info(users)");
      const hasSponsorId = usersTableInfo && Array.isArray(usersTableInfo) && usersTableInfo.some(col => col && col.name === 'sponsor_id');
      
      if (!hasSponsorId) {
        console.log('📝 Добавление поля sponsor_id в таблицу users...');
        try {
          query.run('ALTER TABLE users ADD COLUMN sponsor_id INTEGER');
          console.log('✅ Поле sponsor_id успешно добавлено в таблицу users');
          
          // Создаем индекс после добавления колонки
          try {
            query.run('CREATE INDEX IF NOT EXISTS idx_users_sponsor_id ON users(sponsor_id)');
            console.log('✅ Индекс idx_users_sponsor_id создан');
          } catch (indexError) {
            if (!indexError.message.includes('already exists')) {
              console.warn('⚠️ Ошибка создания индекса idx_users_sponsor_id:', indexError.message);
            }
          }
        } catch (e) {
          if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
            console.log('ℹ️ Поле sponsor_id уже существует');
          } else {
            console.error('⚠️ Ошибка добавления поля sponsor_id:', e.message);
          }
        }
      } else {
        console.log('✅ Поле sponsor_id присутствует в таблице users');
        
        // Проверяем наличие индекса
        try {
          query.run('CREATE INDEX IF NOT EXISTS idx_users_sponsor_id ON users(sponsor_id)');
          console.log('✅ Индекс idx_users_sponsor_id проверен');
        } catch (indexError) {
          if (!indexError.message.includes('already exists')) {
            console.warn('⚠️ Ошибка создания индекса idx_users_sponsor_id:', indexError.message);
          }
        }
        
        // Проверяем наличие колонки rank и индекса
        try {
          const hasRank = usersTableInfo && Array.isArray(usersTableInfo) && usersTableInfo.some(col => col && col.name === 'rank');
          if (hasRank) {
            try {
              query.run('CREATE INDEX IF NOT EXISTS idx_users_rank ON users(rank)');
              console.log('✅ Индекс idx_users_rank проверен');
            } catch (indexError) {
              if (!indexError.message.includes('already exists') && !indexError.message.includes('no such column')) {
                console.warn('⚠️ Ошибка создания индекса idx_users_rank:', indexError.message);
              }
            }
          } else {
            console.log('⚠️ Колонка rank отсутствует в таблице users, индекс не создается');
          }
        } catch (e) {
          console.warn('⚠️ Ошибка проверки колонки rank:', e.message);
        }
      }
    } catch (e) {
      console.error('⚠️ Ошибка проверки поля sponsor_id:', e.message);
      // При ошибке проверки все равно пытаемся добавить поле
      try {
        query.run('ALTER TABLE users ADD COLUMN sponsor_id INTEGER');
        console.log('✅ Поле sponsor_id добавлено после ошибки проверки');
        
        // Создаем индекс
        try {
          query.run('CREATE INDEX IF NOT EXISTS idx_users_sponsor_id ON users(sponsor_id)');
        } catch (indexError) {
          // Игнорируем ошибки индекса
        }
      } catch (e2) {
        if (!e2.message.includes('duplicate column') && !e2.message.includes('already exists')) {
          console.error('⚠️ Критическая ошибка добавления поля sponsor_id:', e2.message);
        }
      }
    }
    
    // Проверяем и добавляем поле photo_url в таблицу masters, если его нет
    try {
      const mastersTableInfo = query.all("PRAGMA table_info(masters)");
      const hasPhotoUrl = mastersTableInfo && Array.isArray(mastersTableInfo) && mastersTableInfo.some(col => col && col.name === 'photo_url');
      
      if (!hasPhotoUrl) {
        console.log('📝 Добавление поля photo_url в таблицу masters...');
        try {
          query.run('ALTER TABLE masters ADD COLUMN photo_url TEXT');
          console.log('✅ Поле photo_url успешно добавлено в таблицу masters');
        } catch (e) {
          if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
            console.log('ℹ️ Поле photo_url уже существует');
          } else {
            console.error('⚠️ Ошибка добавления поля photo_url:', e.message);
          }
        }
      } else {
        console.log('✅ Поле photo_url присутствует в таблице masters');
      }
    } catch (e) {
      console.error('⚠️ Ошибка проверки поля photo_url:', e.message);
      // При ошибке проверки все равно пытаемся добавить поле
      try {
        query.run('ALTER TABLE masters ADD COLUMN photo_url TEXT');
        console.log('✅ Поле photo_url добавлено после ошибки проверки');
      } catch (e2) {
        if (!e2.message.includes('duplicate column') && !e2.message.includes('already exists')) {
          console.error('⚠️ Критическая ошибка добавления поля photo_url:', e2.message);
        }
      }
    }
    
    // Проверяем и добавляем поля email_verified и phone_verified в таблицу users
    try {
      const usersTableInfo = query.all("PRAGMA table_info(users)");
      const hasEmailVerified = usersTableInfo && Array.isArray(usersTableInfo) && usersTableInfo.some(col => col && col.name === 'email_verified');
      const hasPhoneVerified = usersTableInfo && Array.isArray(usersTableInfo) && usersTableInfo.some(col => col && col.name === 'phone_verified');
      
      if (!hasEmailVerified) {
        console.log('📝 Добавление поля email_verified в таблицу users...');
        try {
          query.run('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0');
          console.log('✅ Поле email_verified успешно добавлено в таблицу users');
        } catch (e) {
          if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
            console.log('ℹ️ Поле email_verified уже существует');
          } else {
            console.error('⚠️ Ошибка добавления поля email_verified:', e.message);
          }
        }
      } else {
        console.log('✅ Поле email_verified присутствует в таблице users');
      }
      
      if (!hasPhoneVerified) {
        console.log('📝 Добавление поля phone_verified в таблицу users...');
        try {
          query.run('ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0');
          console.log('✅ Поле phone_verified успешно добавлено в таблицу users');
        } catch (e) {
          if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
            console.log('ℹ️ Поле phone_verified уже существует');
          } else {
            console.error('⚠️ Ошибка добавления поля phone_verified:', e.message);
          }
        }
      } else {
        console.log('✅ Поле phone_verified присутствует в таблице users');
      }
    } catch (e) {
      console.error('⚠️ Ошибка проверки полей подтверждения:', e.message);
      try {
        query.run('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0');
        query.run('ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0');
        console.log('✅ Поля подтверждения добавлены после ошибки проверки');
      } catch (e2) {
        if (!e2.message.includes('duplicate column') && !e2.message.includes('already exists')) {
          console.error('⚠️ Критическая ошибка добавления полей подтверждения:', e2.message);
        }
      }
    }
    
    // Инициализация Redis (опционально, если доступен)
    await initRedis();
    
    // Запускаем миграцию для чата с администрацией и обратной связи
    try {
      const { migrateAdminChatAndFeedback } = await import('./scripts/migrate-admin-chat-feedback.js');
      await migrateAdminChatAndFeedback();
    } catch (error) {
      console.warn('⚠️ Ошибка миграции admin-chat и feedback:', error.message);
    }
    
    // Проверяем наличие тестового мастера
    const testMaster = query.get('SELECT id, email, name, role FROM users WHERE email = ?', ['master@test.com']);
    if (testMaster) {
      console.log(`✅ Test master found: id=${testMaster.id}, email=${testMaster.email}`);
    } else {
      console.log('⚠️ Test master not found. Run: node scripts/create-test-master.js');
    }
    
    // Инициализация автоматического резервного копирования
    if (config.backupEnabled) {
      const { createBackup } = await import('./services/backup-service.js');
      
      // Создаем первый бэкап при запуске
      try {
        createBackup();
      } catch (error) {
        console.error('⚠️ Ошибка создания начального бэкапа:', error.message);
      }
      
      // Настраиваем периодическое создание бэкапов
      setInterval(() => {
        try {
          createBackup();
        } catch (error) {
          console.error('⚠️ Ошибка автоматического бэкапа:', error.message);
        }
      }, config.backupInterval);
      
      const intervalHours = config.backupInterval / (60 * 60 * 1000);
      console.log(`💾 Автоматическое резервное копирование включено (каждые ${intervalHours} часов)`);
    }
    
    // Инициализация фоновой задачи для обработки истекших назначений
    const { checkAndProcessExpiredAssignments } = await import('./services/assignment-service.js');
    
    // Проверяем истекшие назначения при запуске сервера
    try {
      console.log('🔄 Проверка истекших назначений при запуске...');
      const processedCount = checkAndProcessExpiredAssignments();
      if (processedCount > 0) {
        console.log(`✅ Обработано ${processedCount} заказов с истекшими назначениями при запуске`);
      }
    } catch (error) {
      console.error('⚠️ Ошибка проверки истекших назначений при запуске:', error.message);
    }
    
    // Настраиваем периодическую проверку истекших назначений (каждую минуту)
    const EXPIRED_CHECK_INTERVAL = 60 * 1000; // 1 минута
    setInterval(() => {
      try {
        checkAndProcessExpiredAssignments();
      } catch (error) {
        console.error('⚠️ Ошибка проверки истекших назначений:', error.message);
      }
    }, EXPIRED_CHECK_INTERVAL);
    
    console.log(`⏰ Автоматическая проверка истекших назначений включена (каждую минуту)`);
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
    process.exit(1);
  }
})();

// Инициализация WebSocket
initWebSocket(server);

// Базовый маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Исправлено API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      masters: '/api/masters',
      assignments: '/api/assignments',
      services: '/api/services',
      chat: '/api/chat',
      verification: '/api/verification',
      complaints: '/api/complaints',
      admin: '/api/admin',
      payments: '/api/payments',
      loyalty: '/api/loyalty',
      mlm: '/api/mlm',
      version: '/api/version',
      adminChat: '/api/admin-chat',
      feedback: '/api/feedback',
      websocket: '/ws'
    }
  });
});

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'МастерПрофи API Documentation'
}));

// JSON спецификация для автоматизированных инструментов
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Маршруты API (с rate limiting для критичных эндпоинтов)
app.use('/api/auth', strictRateLimiter(30, 15 * 60 * 1000), authRoutes); // 30 попыток за 15 минут
app.use('/api/verification-codes', verificationRateLimiter(), verificationCodesRoutes); // 3 попытки за 10 минут
app.use('/api/orders', ordersRoutes);
app.use('/api/masters', statsRateLimiter(), mastersRoutes); // 200 запросов за 15 минут для статистики и других запросов мастеров
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/fcm', fcmRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/verification', verificationMasterRateLimiter(), verificationRoutes); // 100 запросов за 15 минут для верификации
app.use('/api/complaints', complaintsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/route-optimization', routeOptimizationRoutes);
app.use('/api/mlm', statsRateLimiter(), mlmRoutes); // 200 запросов за 15 минут для MLM статистики
app.use('/api/remote-config', remoteConfigRoutes); // Remote Config для обновления контента
app.use('/api/version', versionRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/admin-chat', adminChatRoutes); // Чат с администрацией
app.use('/api/feedback', feedbackRoutes); // Обратная связь
app.use('/api/prices', pricesRoutes); // Прайс-лист

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Маршрут не найден',
    path: req.path
  });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('❌ Ошибка сервера:', error);
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: config.nodeEnv === 'development' ? error.message : undefined
  });
});

// Запуск сервера
server.listen(config.port, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 =====================================================');
  console.log(`   Исправлено Backend Server запущен!`);
  console.log('   =====================================================');
  console.log(`   🌐 HTTP Server:  http://localhost:${config.port}`);
  console.log(`   🔌 WebSocket:    ws://localhost:${config.port}/ws`);
  console.log(`   📊 Окружение:    ${config.nodeEnv}`);
  console.log(`   💾 База данных:  ${config.databasePath}`);
  console.log('   =====================================================');
  console.log('');
  console.log('   📝 Доступные эндпоинты:');
  console.log('      POST   /api/auth/register       - Регистрация');
  console.log('      POST   /api/auth/login          - Вход');
  console.log('      GET    /api/orders              - Список заказов');
  console.log('      POST   /api/orders              - Создать заказ');
  console.log('      GET    /api/masters             - Список мастеров');
  console.log('      POST   /api/masters/shift/start - Начать смену');
  console.log('      POST   /api/masters/shift/end   - Завершить смену');
  console.log('      GET    /api/assignments/my      - Мои назначения');
  console.log('      POST   /api/assignments/:id/accept - Принять заказ');
  console.log('      POST   /api/assignments/:id/reject - Отклонить заказ');
  console.log('   =====================================================');
  console.log('');
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n👋 Завершение работы сервера...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Завершение работы сервера...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

export default app;

