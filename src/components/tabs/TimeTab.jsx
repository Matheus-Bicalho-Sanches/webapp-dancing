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
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';

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
    professores: []
  });
  const [editingTime, setEditingTime] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [timeToDelete, setTimeToDelete] = useState(null);
  const [availableTeachers, setAvailableTeachers] = useState([]);

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

  // Carregar professores disponíveis
  const loadAvailableTeachers = async () => {
    try {
      const teachersQuery = query(collection(db, 'professores'), orderBy('nome'));
      const querySnapshot = await getDocs(teachersQuery);
      const teachersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableTeachers(teachersData);
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
    }
  };

  useEffect(() => {
    loadTimes();
    loadAvailableTeachers();
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
    setFormData({ horario: '', diaSemana: '', professores: [] });
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
      professores: time.professores
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
                <TableCell>Professores Disponíveis</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {times.map((time) => (
                <TableRow key={time.id}>
                  <TableCell>{time.diaSemana}</TableCell>
                  <TableCell>{time.horario}</TableCell>
                  <TableCell>
                    {time.professores?.map(profId => {
                      const professor = availableTeachers.find(t => t.id === profId);
                      return professor ? professor.nome : '';
                    }).join(', ')}
                  </TableCell>
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

              <FormControl fullWidth required>
                <InputLabel>Professores Disponíveis</InputLabel>
                <Select
                  multiple
                  name="professores"
                  value={formData.professores || []}
                  onChange={handleChange}
                  label="Professores Disponíveis"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map(profId => {
                        const professor = availableTeachers.find(t => t.id === profId);
                        return professor ? professor.nome : '';
                      }).join(', ')}
                    </Box>
                  )}
                >
                  {availableTeachers.map((professor) => (
                    <MenuItem key={professor.id} value={professor.id}>
                      <Checkbox 
                        checked={formData.professores?.indexOf(professor.id) > -1}
                      />
                      <ListItemText primary={professor.nome} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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