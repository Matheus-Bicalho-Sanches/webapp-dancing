import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

// Componente TabPanel para renderizar o conteúdo de cada aba
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`task-tabpanel-${index}`}
      aria-labelledby={`task-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Tasks() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    descricao: '',
    responsavel: '',
    prazoLimite: dayjs().format('YYYY-MM-DD'),
    observacoes: ''
  });

  // Verificar se o usuário tem permissão de master
  const hasDeletePermission = currentUser?.userType === 'master';

  // Carregar usuários
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('email'));
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao carregar lista de usuários.',
          severity: 'error'
        });
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    // Configurar listener para atualizações em tempo real
    const q = query(
      collection(db, 'tarefas'), 
      where('tipo', '==', 'nao_recorrente'),
      orderBy('prazoLimite', 'asc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar tarefas:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar tarefas. Por favor, tente novamente.',
        severity: 'error'
      });
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        descricao: task.descricao,
        responsavel: task.responsavel,
        prazoLimite: task.prazoLimite,
        observacoes: task.observacoes || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        descricao: '',
        responsavel: '',
        prazoLimite: dayjs().format('YYYY-MM-DD'),
        observacoes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    try {
      const taskData = {
        ...formData,
        tipo: 'nao_recorrente',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editingTask) {
        // Atualizar tarefa existente
        await updateDoc(doc(db, 'tarefas', editingTask.id), taskData);
        setSnackbar({
          open: true,
          message: 'Tarefa atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        // Adicionar nova tarefa
        taskData.createdAt = serverTimestamp();
        taskData.createdBy = currentUser.uid;
        await addDoc(collection(db, 'tarefas'), taskData);
        setSnackbar({
          open: true,
          message: 'Tarefa criada com sucesso!',
          severity: 'success'
        });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar tarefa. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await deleteDoc(doc(db, 'tarefas', taskId));
        setSnackbar({
          open: true,
          message: 'Tarefa excluída com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir tarefa. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    }
  };

  const getStatusColor = (prazoLimite) => {
    const hoje = dayjs();
    const prazo = dayjs(prazoLimite);
    const diasRestantes = prazo.diff(hoje, 'day');

    if (diasRestantes < 0) return 'error';
    if (diasRestantes <= 7) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <MainLayout title="Tarefas">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  const renderTasksTable = () => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nova Tarefa
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Prazo</TableCell>
              <TableCell>Observações</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.descricao}</TableCell>
                <TableCell>
                  {users.find(user => user.id === task.responsavel)?.email || task.responsavel}
                </TableCell>
                <TableCell>
                  <Chip
                    label={dayjs(task.prazoLimite).format('DD/MM/YYYY')}
                    color={getStatusColor(task.prazoLimite)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{task.observacoes}</TableCell>
                <TableCell align="right">
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(task)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  {hasDeletePermission && (
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(task.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Nenhuma tarefa encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  return (
    <MainLayout title="Tarefas">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ color: '#000', mb: 3 }}>
          Gerenciamento de Tarefas
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Não recorrentes" />
            <Tab label="Diárias" />
            <Tab label="Semanais" />
            <Tab label="Mensais" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {renderTasksTable()}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Typography>
            Funcionalidade de tarefas diárias será implementada em breve.
          </Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography>
            Funcionalidade de tarefas semanais será implementada em breve.
          </Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Typography>
            Funcionalidade de tarefas mensais será implementada em breve.
          </Typography>
        </TabPanel>

        {/* Dialog para adicionar/editar tarefa */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                required
              />

              <FormControl fullWidth required>
                <InputLabel>Responsável</InputLabel>
                <Select
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  label="Responsável"
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Prazo Limite"
                type="date"
                value={formData.prazoLimite}
                onChange={(e) => setFormData({ ...formData, prazoLimite: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />

              <TextField
                fullWidth
                label="Observações"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                multiline
                rows={4}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.descricao || !formData.responsavel || !formData.prazoLimite}
            >
              {editingTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar para feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
} 