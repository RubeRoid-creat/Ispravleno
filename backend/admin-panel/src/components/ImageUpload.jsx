import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { uploadAPI } from '../api/api';

export default function ImageUpload({ value, onChange, label = 'Изображение', disabled = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(value || '');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      setError('Разрешены только изображения');
      return;
    }

    // Проверка размера (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await uploadAPI.uploadImage(formData);
      
      if (response.data.success) {
        const imageUrl = response.data.imageUrl;
        setPreview(imageUrl);
        onChange(imageUrl);
        setError('');
      } else {
        setError(response.data.error || 'Ошибка загрузки изображения');
      }
    } catch (err) {
      console.error('Ошибка загрузки изображения:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки изображения');
    } finally {
      setUploading(false);
      // Сбрасываем input для возможности повторной загрузки того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
    setError('');
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        {label}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {preview ? (
        <Paper
          elevation={2}
          sx={{
            position: 'relative',
            p: 2,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            component="img"
            src={preview.startsWith('http') ? preview : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://212.74.227.208:3000'}${preview}`}
            alt="Preview"
            sx={{
              maxWidth: 200,
              maxHeight: 200,
              objectFit: 'contain',
              borderRadius: 1,
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {preview}
            </Typography>
            {!disabled && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleRemove}
                sx={{ mt: 1 }}
              >
                Удалить
              </Button>
            )}
          </Box>
        </Paper>
      ) : (
        <Paper
          elevation={1}
          sx={{
            p: 3,
            border: '2px dashed',
            borderColor: 'grey.300',
            borderRadius: 2,
            textAlign: 'center',
            cursor: disabled ? 'default' : 'pointer',
            '&:hover': {
              borderColor: disabled ? 'grey.300' : 'primary.main',
              bgcolor: disabled ? 'transparent' : 'action.hover',
            },
            mb: 2,
          }}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={disabled || uploading}
          />
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Загрузка...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Нажмите для загрузки изображения
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JPG, PNG, WEBP (макс. 10MB)
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {!preview && !uploading && (
        <Button
          variant="outlined"
          startIcon={<ImageIcon />}
          onClick={handleClick}
          disabled={disabled}
          fullWidth
        >
          Выбрать изображение
        </Button>
      )}
    </Box>
  );
}

