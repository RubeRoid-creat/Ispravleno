import nodemailer from 'nodemailer';
import { config } from '../config.js';

// Создаем транспортер для отправки email
// В продакшене используйте реальные настройки SMTP
const createTransporter = () => {
  // Для разработки или если SMTP не настроен - используем консольный вывод
  if (!config.email?.smtp) {
    console.log('⚠️ [EMAIL SERVICE] SMTP не настроен, используется режим разработки (console)');
    return {
      sendMail: async (options) => {
        console.log('📧 [EMAIL SERVICE] Отправка email (DEV MODE):');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);
        console.log('   Text:', options.text);
        if (options.html) {
          console.log('   HTML:', options.html.substring(0, 200) + '...');
        }
        return { messageId: `dev-${Date.now()}` };
      },
      verify: async () => {
        console.log('✅ [EMAIL SERVICE] Email транспортер работает в режиме разработки');
        return true;
      }
    };
  }
  
  // Для продакшена используем реальный SMTP
  console.log(`📧 [EMAIL SERVICE] Инициализация SMTP: ${config.email.smtp.host}:${config.email.smtp.port}`);
  
  const transporter = nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.secure, // true для 465, false для других портов
    auth: {
      user: config.email.smtp.user,
      pass: config.email.smtp.password
    },
    // Дополнительные настройки для надежности
    pool: true, // Использование пула соединений
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // Интервал между сообщениями
    rateLimit: 5 // Максимум 5 сообщений в секунду
  });
  
  // Проверка соединения при запуске
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ [EMAIL SERVICE] Ошибка подключения к SMTP:', error.message);
      console.error('   Проверьте настройки EMAIL_SMTP_* в .env файле');
    } else {
      console.log('✅ [EMAIL SERVICE] SMTP сервер готов к отправке писем');
    }
  });
  
  return transporter;
};

const transporter = createTransporter();

/**
 * Проверка работоспособности email сервиса
 */
export async function verifyEmailService() {
  try {
    if (transporter.verify) {
      await transporter.verify();
      return { success: true, message: 'Email сервис работает' };
    }
    return { success: true, message: 'Email сервис в режиме разработки' };
  } catch (error) {
    console.error('❌ Ошибка проверки email сервиса:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Отправка кода подтверждения на email
 * @param {string} email - Email получателя
 * @param {string} code - 6-значный код подтверждения
 * @param {string} name - Имя пользователя (опционально)
 */
export async function sendVerificationEmail(email, code, name = 'Пользователь') {
  try {
    const subject = 'Код подтверждения BestApp';
    const text = `Здравствуйте, ${name}!\n\nВаш код подтверждения: ${code}\n\nКод действителен в течение 10 минут.\n\nЕсли вы не запрашивали этот код, проигнорируйте это сообщение.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Код подтверждения BestApp</h2>
        <p>Здравствуйте, ${name}!</p>
        <p>Ваш код подтверждения:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>Код действителен в течение <strong>10 минут</strong>.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">Если вы не запрашивали этот код, проигнорируйте это сообщение.</p>
      </div>
    `;
    
    const info = await transporter.sendMail({
      from: config.email?.from || 'noreply@bestapp.ru',
      to: email,
      subject: subject,
      text: text,
      html: html
    });
    
    console.log(`✅ Email отправлен на ${email}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error);
    throw error;
  }
}

/**
 * Отправка уведомления об успешном подтверждении
 */
export async function sendConfirmationEmail(email, name = 'Пользователь', type = 'email') {
  try {
    const subject = type === 'email' 
      ? 'Email успешно подтвержден - BestApp'
      : 'Телефон успешно подтвержден - BestApp';
    
    const text = `Здравствуйте, ${name}!\n\nВаш ${type === 'email' ? 'email' : 'телефон'} успешно подтвержден.\n\nСпасибо за использование BestApp!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">✅ Подтверждение успешно</h2>
        <p>Здравствуйте, ${name}!</p>
        <p>Ваш ${type === 'email' ? 'email' : 'телефон'} успешно подтвержден.</p>
        <p>Спасибо за использование BestApp!</p>
      </div>
    `;
    
    await transporter.sendMail({
      from: config.email?.from || 'noreply@bestapp.ru',
      to: email,
      subject: subject,
      text: text,
      html: html
    });
    
    console.log(`✅ Email подтверждения отправлен на ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Ошибка отправки email подтверждения:', error);
    // Не бросаем ошибку, так как это не критично
    return { success: false };
  }
}

/**
 * Отправка уведомления о новой обратной связи администратору
 */
export async function sendFeedbackNotification(feedbackData) {
  try {
    const adminEmail = 'ispravleno.pro@mail.ru';
    const subject = `Новая обратная связь: ${feedbackData.subject}`;
    
    const text = `Поступила новая обратная связь от пользователя ${feedbackData.user_name} (${feedbackData.user_email}).\n\nТип: ${feedbackData.feedback_type}\nТема: ${feedbackData.subject}\nСообщение: ${feedbackData.message}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">📩 Новая обратная связь</h2>
        <p><strong>От кого:</strong> ${feedbackData.user_name} (${feedbackData.user_email})</p>
        <p><strong>Тип:</strong> ${feedbackData.feedback_type}</p>
        <p><strong>Тема:</strong> ${feedbackData.subject}</p>
        <hr />
        <p><strong>Сообщение:</strong></p>
        <p style="white-space: pre-wrap;">${feedbackData.message}</p>
      </div>
    `;
    
    await transporter.sendMail({
      from: config.email?.from || 'noreply@bestapp.ru',
      to: adminEmail,
      subject: subject,
      text: text,
      html: html
    });
    
    console.log(`✅ Уведомление о фидбеке отправлено на ${adminEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о фидбеке:', error);
    return { success: false };
  }
}


