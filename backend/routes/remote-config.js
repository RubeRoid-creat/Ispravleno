import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, '..', 'remote-config.json');

/**
 * Загрузить конфигурацию Remote Config
 */
function loadRemoteConfig() {
  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Remote config file not found, using defaults');
    return {
      maintenance_mode: false,
      min_app_version: '1.0.0',
      feature_flags: {},
      app_config: {}
    };
  }
}

/**
 * GET /api/remote-config
 * Получить удаленную конфигурацию приложения
 */
router.get('/', (req, res) => {
  try {
    const { platform = 'android_master', app_version } = req.query;
    
    const config = loadRemoteConfig();
    const platformConfig = config[platform] || config['android_master'] || {};
    
    // Объединяем общую конфигурацию с платформенной
    const response = {
      maintenance_mode: platformConfig.maintenance_mode || config.maintenance_mode || false,
      min_app_version: platformConfig.min_app_version || config.min_app_version || '1.0.0',
      feature_flags: {
        ...config.feature_flags,
        ...platformConfig.feature_flags
      },
      app_config: {
        ...config.app_config,
        ...platformConfig.app_config
      },
      messages: platformConfig.messages || config.messages || {},
      updated_at: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Ошибка получения Remote Config:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
