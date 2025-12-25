import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { pricesAPI } from '../api/api';

const CATEGORIES = [
  'холодильник',
  'стиральная машина',
  'посудомоечная машина',
  'духовой шкаф',
  'варочная панель',
  'кондиционер',
  'кофемашина',
  'ноутбук',
  'телевизор',
  'микроволновка',
];

export default function Prices() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState({ open: false, mode: 'create', data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');

  const initialForm = {
    category: '',
    name: '',
    price: '',
    type: 'service',
    description: '',
    unit: 'шт',
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadPrices();
  }, [filterCategory, filterType]);

  const loadPrices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterType) params.type = filterType;
      const response = await pricesAPI.getAll(params);
      setPrices(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки прайса');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, data = null) => {
    setDialog({ open: true, mode, data });
    if (mode === 'edit' && data) {
      setForm({
        category: data.category || '',
        name: data.name || '',
        price: data.price || '',
        type: data.type || 'service',
        description: data.description || '',
        unit: data.unit || 'шт',
      });
    } else {
      setForm(initialForm);
    }
  };

  const handleCloseDialog = () => {
    setDialog({ open: false, mode: 'create', data: null });
    setForm(initialForm);
  };

  const handleSubmit = async () => {
    // Валидация на клиенте
    if (!form.category || form.category.trim().length === 0) {
      setError('Категория обязательна');
      return;
    }
    
    if (!form.name || form.name.trim().length === 0) {
      setError('Название обязательно');
      return;
    }

    if (!form.price || parseFloat(form.price) <= 0) {
      setError('Цена должна быть положительным числом');
      return;
    }

    try {
      // Подготовка данных для отправки
      const dataToSend = {
        category: form.category.trim(),
        name: form.name.trim(),
        price: parseFloat(form.price),
        type: form.type,
        description: form.description?.trim() || null,
        unit: form.unit?.trim() || 'шт',
      };

      if (dialog.mode === 'create') {
        await pricesAPI.create(dataToSend);
      } else {
        await pricesAPI.update(dialog.data.id, dataToSend);
      }
      handleCloseDialog();
      loadPrices();
      setError(''); // Очищаем ошибки при успехе
    } catch (err) {
      console.error('Ошибка при сохранении позиции:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Ошибка при сохранении позиции';
      setError(errorMessage);
    }
  };

  const handleDelete = async () => {
    try {
      await pricesAPI.delete(deleteDialog.id);
      setDeleteDialog({ open: false, id: null });
      loadPrices();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при удалении позиции');
    }
  };

  const filteredPrices = prices;

  if (loading && prices.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Управление прайс-листом</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
        >
          Добавить позицию
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Фильтры */}
      <Box display="flex" gap={2} mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Категория</InputLabel>
          <Select
            value={filterCategory}
            label="Категория"
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <MenuItem value="">Все категории</MenuItem>
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Тип</InputLabel>
          <Select
            value={filterType}
            label="Тип"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">Все типы</MenuItem>
            <MenuItem value="service">Услуги</MenuItem>
            <MenuItem value="part">Запчасти</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Цена</TableCell>
              <TableCell>Ед. изм.</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPrices.map((item) => (
              <TableRow key={item.id}>
                <TableCell>#{item.id}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  <Typography variant="subtitle2">{item.name}</Typography>
                  {item.description && (
                    <Typography variant="body2" color="textSecondary" noWrap sx={{ maxWidth: 300 }}>
                      {item.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.type === 'service' ? 'Услуга' : 'Запчасть'}
                    color={item.type === 'service' ? 'primary' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {parseFloat(item.price).toLocaleString('ru-RU')} ₽
                  </Typography>
                </TableCell>
                <TableCell>{item.unit || 'шт'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenDialog('edit', item)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setDeleteDialog({ open: true, id: item.id })} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredPrices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Позиций не найдено
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания/редактирования */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialog.mode === 'create' ? 'Добавить позицию прайса' : 'Редактировать позицию прайса'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Категория</InputLabel>
              <Select
                value={form.category}
                label="Категория"
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Название"
              fullWidth
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Тип</InputLabel>
                <Select
                  value={form.type}
                  label="Тип"
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <MenuItem value="service">Услуга</MenuItem>
                  <MenuItem value="part">Запчасть</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Цена (₽)"
                type="number"
                fullWidth
                required
                inputProps={{ step: '0.01', min: '0' }}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Box>
            <TextField
              label="Единица измерения"
              fullWidth
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="шт, час, услуга и т.д."
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialog.mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог удаления */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Удалить позицию?</DialogTitle>
        <DialogContent>
          Вы уверены, что хотите безвозвратно удалить эту позицию из прайса?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Отмена</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
