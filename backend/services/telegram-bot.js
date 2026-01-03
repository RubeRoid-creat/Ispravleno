import axios from 'axios';
import { query } from '../database/db.js';

/**
 * Сервис для работы с Telegram Bot API
 * Отправляет новости в Telegram канал
 */
class TelegramBotService {
  constructor() {
    this.botToken = null;
    this.channelId = null;
    this.apiUrl = 'https://api.telegram.org/bot';
    this.loadSettings();
  }

  /**
   * Загрузка настроек из БД или переменных окружения
   */
  loadSettings() {
    try {
      // Пытаемся загрузить из БД
      const botTokenSetting = query.get('SELECT value FROM settings WHERE key = ?', ['telegram_bot_token']);
      const channelIdSetting = query.get('SELECT value FROM settings WHERE key = ?', ['telegram_channel_id']);

      this.botToken = botTokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN || null;
      this.channelId = channelIdSetting?.value || process.env.TELEGRAM_CHANNEL_ID || null;
    } catch (error) {
      // Если таблицы settings нет, используем только переменные окружения
      console.log('[TELEGRAM] Таблица settings не найдена, используем переменные окружения');
      this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
      this.channelId = process.env.TELEGRAM_CHANNEL_ID || null;
    }
  }

  /**
   * Проверка настроек бота
   */
  isConfigured() {
    return !!(this.botToken && this.channelId);
  }

  /**
   * Отправка сообщения в канал
   * @param {string} text - Текст сообщения
   * @param {string} imageUrl - URL изображения (опционально)
   * @param {object} options - Дополнительные опции (parse_mode, disable_web_page_preview)
   */
  async sendMessage(text, imageUrl = null, options = {}) {
    if (!this.isConfigured()) {
      console.warn('[TELEGRAM] Бот не настроен. Пропуск отправки сообщения.');
      return { success: false, error: 'Бот не настроен' };
    }

    try {
      // Если есть изображение, отправляем как фото с подписью
      if (imageUrl) {
        return await this.sendPhoto(imageUrl, text, options);
      }

      // Отправляем текстовое сообщение
      const url = `${this.apiUrl}${this.botToken}/sendMessage`;
      const payload = {
        chat_id: this.channelId,
        text: text,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: options.disable_web_page_preview !== false,
        ...options
      };

      const response = await axios.post(url, payload);
      
      if (response.data.ok) {
        console.log('[TELEGRAM] ✅ Сообщение успешно отправлено в канал');
        return { success: true, messageId: response.data.result.message_id };
      } else {
        console.error('[TELEGRAM] ❌ Ошибка отправки:', response.data);
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      console.error('[TELEGRAM] ❌ Ошибка при отправке сообщения:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }

  /**
   * Отправка фото с подписью
   * @param {string} photoUrl - URL изображения
   * @param {string} caption - Подпись к фото
   * @param {object} options - Дополнительные опции
   */
  async sendPhoto(photoUrl, caption = '', options = {}) {
    if (!this.isConfigured()) {
      console.warn('[TELEGRAM] Бот не настроен. Пропуск отправки фото.');
      return { success: false, error: 'Бот не настроен' };
    }

    try {
      const url = `${this.apiUrl}${this.botToken}/sendPhoto`;
      const payload = {
        chat_id: this.channelId,
        photo: photoUrl,
        caption: caption,
        parse_mode: options.parse_mode || 'HTML',
        ...options
      };

      const response = await axios.post(url, payload);
      
      if (response.data.ok) {
        console.log('[TELEGRAM] ✅ Фото успешно отправлено в канал');
        return { success: true, messageId: response.data.result.message_id };
      } else {
        console.error('[TELEGRAM] ❌ Ошибка отправки фото:', response.data);
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      console.error('[TELEGRAM] ❌ Ошибка при отправке фото:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }

  /**
   * Форматирование новости для Telegram
   * @param {object} news - Объект новости
   * @returns {string} - Отформатированный текст
   */
  formatNews(news) {
    const title = `<b>${this.escapeHtml(news.title)}</b>`;
    const summary = news.summary ? `\n\n${this.escapeHtml(news.summary)}` : '';
    const content = news.content ? `\n\n${this.escapeHtml(news.content)}` : '';
    
    // Ограничиваем длину контента для Telegram (максимум 1024 символа для подписи к фото)
    const maxLength = 1024;
    let fullText = title + summary + content;
    
    if (fullText.length > maxLength) {
      fullText = title + summary;
      if (fullText.length > maxLength) {
        fullText = title;
      }
      // Обрезаем и добавляем ссылку на полную новость
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ispravleno.pro';
      fullText += `\n\n<a href="${siteUrl}/news/${news.id}">Читать полностью →</a>`;
    }

    return fullText;
  }

  /**
   * Экранирование HTML символов для Telegram
   */
  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Отправка новости в Telegram
   * @param {object} news - Объект новости
   * @param {boolean} isUpdate - Обновление существующей новости
   */
  async postNews(news, isUpdate = false) {
    if (!this.isConfigured()) {
      console.warn('[TELEGRAM] Бот не настроен. Пропуск публикации новости.');
      return { success: false, error: 'Бот не настроен' };
    }

    // Отправляем только активные новости
    if (!news.is_active) {
      console.log('[TELEGRAM] Новость неактивна, пропуск публикации');
      return { success: false, error: 'Новость неактивна' };
    }

    try {
      const formattedText = this.formatNews(news);
      const prefix = isUpdate ? '🔄 <i>Обновлено:</i>\n\n' : '📰 <i>Новая новость:</i>\n\n';
      const message = prefix + formattedText;

      const result = await this.sendMessage(
        message,
        news.image_url || null,
        { parse_mode: 'HTML' }
      );

      return result;
    } catch (error) {
      console.error('[TELEGRAM] Ошибка при публикации новости:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Обновление настроек бота
   * @param {string} botToken - Токен бота
   * @param {string} channelId - ID канала
   */
  updateConfig(botToken, channelId) {
    this.botToken = botToken;
    this.channelId = channelId;
    
    // Сохраняем в БД
    try {
      // Создаем таблицу если её нет
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

      // Сохраняем токен
      query.run(`
        INSERT OR REPLACE INTO settings (key, value, description, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, ['telegram_bot_token', botToken, 'Токен Telegram бота']);

      // Сохраняем ID канала
      query.run(`
        INSERT OR REPLACE INTO settings (key, value, description, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, ['telegram_channel_id', channelId, 'ID Telegram канала']);

      console.log('[TELEGRAM] Настройки бота обновлены и сохранены в БД');
    } catch (error) {
      console.warn('[TELEGRAM] Не удалось сохранить настройки в БД, используем только в памяти:', error.message);
      // Продолжаем работу с настройками в памяти
    }
  }

  /**
   * Проверка подключения к боту
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, error: 'Бот не настроен' };
    }

    try {
      const url = `${this.apiUrl}${this.botToken}/getMe`;
      const response = await axios.get(url);
      
      if (response.data.ok) {
        return { 
          success: true, 
          bot: response.data.result 
        };
      } else {
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }

  /**
   * Проверка доступа к каналу
   */
  async testChannel() {
    if (!this.isConfigured()) {
      return { success: false, error: 'Бот не настроен' };
    }

    try {
      // Пытаемся получить информацию о канале
      const url = `${this.apiUrl}${this.botToken}/getChat`;
      const response = await axios.post(url, {
        chat_id: this.channelId
      });
      
      if (response.data.ok) {
        return { 
          success: true, 
          chat: response.data.result 
        };
      } else {
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }
}

// Экспортируем singleton
const telegramBot = new TelegramBotService();
export default telegramBot;

