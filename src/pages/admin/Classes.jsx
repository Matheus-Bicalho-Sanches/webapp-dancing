import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function Classes() {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    nome: '',
    dias: [],
    horario: '',
    horarioTermino: ''
  });
  const [editingId, setEditingId] = useState(null);

  const diasSemana = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];

  // Carregar turmas do Firestore
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const turmasRef = collection(db, 'turmasData');
      const q = query(turmasRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const turmasData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClasses(turmasData);
        setLoading(false);
      }, (error) => {
        console.error('Erro ao carregar turmas:', error);
        setSnackbar({ open: true, message: 'Erro ao carregar turmas: ' + error.message, severity: 'error' });
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Erro ao configurar listener:', error);
      setSnackbar({ open: true, message: 'Erro ao configurar listener: ' + error.message, severity: 'error' });
      setLoading(false);
    }
  }, [currentUser]);

  const handleOpenDialog = (turma = null) => {
    if (!currentUser) {
      setSnackbar({ open: true, message: 'Você precisa estar autenticado', severity: 'error' });
      return;
    }
    setError('');
    if (turma) {
      setFormData({
        nome: turma.nome,
        dias: turma.dias || [],
        horario: turma.horario,
        horarioTermino: turma.horarioTermino
      });
      setEditingId(turma.id);
    } else {
      setFormData({
        nome: '',
        dias: [],
        horario: '',
        horarioTermino: ''
      });
      setEditingId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      nome: '',
      dias: [],
      horario: '',
      horarioTermino: ''
    });
    setEditingId(null);
    setError('');
  };

  const validateTime = (time) => {
    if (!time) return false;
    
    const [hours] = time.split(':').map(Number);
    return hours >= 6 && hours <= 20;
  };

  const handleInputChange = (field, value) => {
    if (field === 'horario' || field === 'horarioTermino') {
      if (!validateTime(value)) {
        setError(`O ${field === 'horario' ? 'horário de início' : 'horário de término'} deve estar entre 06:00 e 20:00`);
      } else {
        setError('');
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setSnackbar({ open: true, message: 'Você precisa estar autenticado', severity: 'error' });
      return;
    }

    if (!validateTime(formData.horario)) {
      setError('O horário de início deve estar entre 06:00 e 20:00');
      return;
    }

    if (!validateTime(formData.horarioTermino)) {
      setError('O horário de término deve estar entre 06:00 e 20:00');
      return;
    }

    try {
      setLoading(true);
      const turmasRef = collection(db, 'turmasData');

      const turmaData = {
        ...formData,
        dias: formData.dias || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid
      };

      if (editingId) {
        const docRef = doc(db, 'turmasData', editingId);
        await updateDoc(docRef, {
          ...turmaData,
          createdAt: undefined,
          updatedAt: serverTimestamp()
        });
        setSnackbar({ open: true, message: 'Turma atualizada com sucesso!', severity: 'success' });
      } else {
        await addDoc(turmasRef, turmaData);
        setSnackbar({ open: true, message: 'Turma criada com sucesso!', severity: 'success' });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      setError('Erro ao salvar turma. Tente novamente.');
      setSnackbar({ open: true, message: 'Erro ao salvar turma: ' + error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!currentUser) {
      setSnackbar({ open: true, message: 'Você precisa estar autenticado', severity: 'error' });
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir esta turma?')) {
      try {
        await deleteDoc(doc(db, 'turmasData', id));
        setSnackbar({ open: true, message: 'Turma excluída com sucesso!', severity: 'success' });
      } catch (error) {
        console.error('Erro ao excluir turma:', error);
        setSnackbar({ open: true, message: 'Erro ao excluir turma: ' + error.message, severity: 'error' });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <MainLayout title="Turmas">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: '#000' }}>
            Turmas
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nova Turma
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome da Turma</TableCell>
                <TableCell>Dias da Turma</TableCell>
                <TableCell>Horário de início</TableCell>
                <TableCell>Horário de término</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : classes && classes.length > 0 ? (
                classes.map((turma) => (
                  <TableRow key={turma.id}>
                    <TableCell>{turma.nome}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {(turma.dias || []).map((dia, index) => (
                          <Chip key={index} label={dia} size="small" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>{turma.horario}</TableCell>
                    <TableCell>{turma.horarioTermino}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpenDialog(turma)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(turma.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhuma turma cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog para adicionar/editar turma */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingId ? 'Editar Turma' : 'Nova Turma'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Nome da Turma"
                fullWidth
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel>Dias da Turma</InputLabel>
                <Select
                  multiple
                  value={formData.dias || []}
                  onChange={(e) => handleInputChange('dias', e.target.value)}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={1}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Stack>
                  )}
                >
                  {diasSemana.map((dia) => (
                    <MenuItem key={dia} value={dia}>
                      {dia}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Horário de início"
                type="time"
                fullWidth
                value={formData.horario}
                onChange={(e) => handleInputChange('horario', e.target.value)}
                inputProps={{
                  min: '06:00',
                  max: '20:00'
                }}
                helperText="Horário entre 06:00 e 20:00"
              />
              <TextField
                label="Horário de término"
                type="time"
                fullWidth
                value={formData.horarioTermino}
                onChange={(e) => handleInputChange('horarioTermino', e.target.value)}
                inputProps={{
                  min: '06:00',
                  max: '20:00'
                }}
                helperText="Horário entre 06:00 e 20:00"
              />
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              disabled={loading || !formData.nome || !formData.dias || !formData.dias.length || !formData.horario || !formData.horarioTermino || error}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
} 