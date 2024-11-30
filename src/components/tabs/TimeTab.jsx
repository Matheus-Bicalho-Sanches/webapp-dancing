import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export default function TimeTab() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [times, setTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(true);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [formData, setFormData] = useState({
    horario: '',
    diaSemana: '',
    duracao: ''
  });
  const [editingTime, setEditingTime] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [timeToDelete, setTimeToDelete] = useState(null);

  const diasSemana = [
    { value: 'segunda', label: 'Segunda-feira' },
    { value: 'terca', label: 'Terça-feira' },
    { value: 'quarta', label: 'Quarta-feira' },
    { value: 'quinta', label: 'Quinta-feira' },
    { value: 'sexta', label: 'Sexta-feira' },
    { value: 'sabado', label: 'Sábado' }
  ];

  // Carregar horários
  const loadTimes = async () => {
    try {
      setLoadingTimes(true);
      const timesQuery = query(collection(db, 'horarios'), orderBy('diaSemana'));
      const querySnapshot = await getDocs(timesQuery);
      const timesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      timesData.sort((a, b) => {
        if (a.diaSemana === b.diaSemana) {
          return a.horario.localeCompare(b.horario);
        }
        return 0;
      });
      setTimes(timesData);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      showNotification('Erro ao carregar horários.', 'error');
    } finally {
      setLoadingTimes(false);
    }
  };

  useEffect(() => {
    loadTimes();
  }, []);

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleOpen = () => setOpen(true);
  
  const handleClose = () => {
    setOpen(false);
    setEditingTime(null);
    setFormData({ horario: '', diaSemana: '', duracao: '' });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditClick = (time) => {
    setEditingTime(time);
    setFormData({
      horario: time.horario,
      diaSemana: time.diaSemana,
      duracao: time.duracao
    });
    setOpen(true);
  };

  const handleDeleteClick = (time) => {
    setTimeToDelete(time);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, 'horarios', timeToDelete.id));
      showNotification('Horário excluído com sucesso!');
      loadTimes();
    } catch (error) {
      console.error('Erro ao excluir horário:', error);
      showNotification('Erro ao excluir horário.', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setTimeToDelete(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (editingTime) {
        await updateDoc(doc(db, 'horarios', editingTime.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        showNotification('Horário atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'horarios'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        showNotification('Horário cadastrado com sucesso!');
      }
      handleClose();
      await loadTimes();
    } catch (error) {
      console.error('Erro ao salvar horário:', error);
      showNotification(`Erro ao ${editingTime ? 'atualizar' : 'cadastrar'} horário.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (newValue) => {
    setFormData(prev => ({
      ...prev,
      horario: newValue ? newValue.format('HH:mm') : ''
    }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{ marginLeft: 'auto' }}
        >
          Novo Horário
        </Button>
      </Box>

      {loadingTimes ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Dia da Semana</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {times.map((time) => (
                <TableRow key={time.id}>
                  <TableCell>{time.diaSemana}</TableCell>
                  <TableCell>{time.horario}</TableCell>
                  <TableCell>{time.duracao}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      color="primary"
                      onClick={() => handleEditClick(time)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color="error"
                      onClick={() => handleDeleteClick(time)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {times.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Nenhum horário cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTime ? 'Editar Horário' : 'Novo Horário'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Dia da Semana</InputLabel>
                <Select
                  name="diaSemana"
                  value={formData.diaSemana}
                  onChange={handleChange}
                  label="Dia da Semana"
                >
                  {diasSemana.map((dia) => (
                    <MenuItem key={dia.value} value={dia.value}>
                      {dia.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TimePicker
                label="Horário"
                value={formData.horario ? dayjs(formData.horario, 'HH:mm') : null}
                onChange={handleTimeChange}
                format="HH:mm"
                ampm={false}
                slotProps={{
                  textField: {
                    required: true,
                    fullWidth: true
                  }
                }}
              />

              <TextField
                fullWidth
                label="Duração"
                name="duracao"
                value={formData.duracao}
                onChange={handleChange}
                required
                placeholder="Ex: 50 minutos"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este horário?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
} 