import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
} from '@mui/material';
import { Send as SendIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { telegramAPI } from '../api/api';

export default function TelegramSettings() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState({
    botToken: '',
    channelId: '',
    isConfigured: false,
  });
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await telegramAPI.getConfig();
      setConfig(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.botToken || !config.channelId) {
      setError('Заполните все поля');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const response = await telegramAPI.updateConfig(config.botToken, config.channelId);
      setSuccess('Настройки успешно сохранены!');
      setConfig({ ...config, isConfigured: true });
      setTestResult(null);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || 'Ошибка сохранения настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setError('');
      setSuccess('');
      const response = await telegramAPI.testConnection();
      setTestResult(response.data);
      if (response.data.success) {
        setSuccess('Тест успешно пройден! Проверьте канал Telegram.');
      } else {
        setError(response.data.error || 'Ошибка при тестировании');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || 'Ошибка при тестировании');
      setTestResult({ success: false, error: err.response?.data?.error || 'Ошибка подключения' });
    } finally {
      setTesting(false);
    }
  };

  if (loading && !config.botToken) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Настройки Telegram бота
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Настройте Telegram бота для автоматической публикации новостей в канал
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Параметры подключения
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Токен бота"
            fullWidth
            type="password"
            value={config.botToken}
            onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            helperText="Получите токен у @BotFather в Telegram"
          />

          <TextField
            label="ID канала"
            fullWidth
            value={config.channelId}
            onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
            placeholder="@ispravlenorbt или -1001234567890"
            helperText="Имя канала с @ или числовой ID (начинается с -100)"
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Сохранить настройки
            </Button>
            <Button
              variant="outlined"
              onClick={handleTest}
              disabled={testing || !config.botToken || !config.channelId}
              startIcon={testing ? <CircularProgress size={20} /> : <SendIcon />}
            >
              Тест подключения
            </Button>
          </Box>
        </Box>
      </Paper>

      {testResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {testResult.success ? (
                <>
                  <CheckCircleIcon color="success" />
                  <Typography variant="h6" color="success.main">
                    Тест пройден успешно
                  </Typography>
                </>
              ) : (
                <>
                  <ErrorIcon color="error" />
                  <Typography variant="h6" color="error.main">
                    Ошибка подключения
                  </Typography>
                </>
              )}
            </Box>

            {testResult.bot && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Информация о боте:
                </Typography>
                <Typography variant="body2">
                  <strong>Имя:</strong> {testResult.bot.first_name} {testResult.bot.last_name || ''}
                </Typography>
                <Typography variant="body2">
                  <strong>Username:</strong> @{testResult.bot.username}
                </Typography>
                <Typography variant="body2">
                  <strong>ID:</strong> {testResult.bot.id}
                </Typography>
              </Box>
            )}

            {testResult.channel && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Информация о канале:
                </Typography>
                <Typography variant="body2">
                  <strong>Название:</strong> {testResult.channel.title}
                </Typography>
                <Typography variant="body2">
                  <strong>Тип:</strong> {testResult.channel.type}
                </Typography>
                {testResult.channel.username && (
                  <Typography variant="body2">
                    <strong>Username:</strong> @{testResult.channel.username}
                  </Typography>
                )}
              </Box>
            )}

            {testResult.testMessage && (
              <Box>
                <Chip
                  label={testResult.testMessage.success ? 'Тестовое сообщение отправлено' : 'Ошибка отправки'}
                  color={testResult.testMessage.success ? 'success' : 'error'}
                  sx={{ mt: 1 }}
                />
              </Box>
            )}

            {testResult.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {testResult.error}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Инструкция по настройке
        </Typography>
        <Typography variant="body2" component="div" sx={{ mt: 2 }}>
          <ol>
            <li>
              <strong>Создайте бота:</strong>
              <ul>
                <li>Откройте Telegram и найдите @BotFather</li>
                <li>Отправьте команду /newbot</li>
                <li>Следуйте инструкциям и получите токен бота</li>
              </ul>
            </li>
            <li>
              <strong>Создайте канал:</strong>
              <ul>
                <li>Создайте новый канал в Telegram</li>
                <li>Добавьте бота в канал как администратора</li>
                <li>Получите ID канала (можно использовать @username или числовой ID)</li>
              </ul>
            </li>
            <li>
              <strong>Настройте бота:</strong>
              <ul>
                <li>Введите токен бота в поле выше</li>
                <li>Введите ID канала (например: @ispravlenorbt)</li>
                <li>Нажмите "Сохранить настройки"</li>
                <li>Нажмите "Тест подключения" для проверки</li>
              </ul>
            </li>
          </ol>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            После настройки все новые и обновленные активные новости будут автоматически публиковаться в Telegram канал.
          </Typography>
        </Typography>
      </Paper>
    </Box>
  );
}

