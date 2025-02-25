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
  Tab,
  Checkbox,
  Grid,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Tasks() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  
  // Adicionar estados para filtros
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deadlineSort, setDeadlineSort] = useState('asc'); // 'asc' ou 'desc'
  const [filteredTasks, setFilteredTasks] = useState([]);
  
  const [formData, setFormData] = useState({
    descricao: '',
    responsavel: [],
    prazoLimite: dayjs().format('YYYY-MM-DD'),
    observacoes: '',
    status: 'Pendente',
    tipo: 'nao_recorrente'
  });

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Verificar se o usuário tem permissão de master
  const hasDeletePermission = currentUser?.userType === 'master';

  // Carregar usuários
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersQuery = query(collection(db, 'users'));
        const querySnapshot = await getDocs(usersQuery);
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      }
    };

    loadUsers();
  }, []);

  // Carregar tarefas
  useEffect(() => {
    const q = query(
        collection(db, 'tarefas'), 
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
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Adicionar useEffect para filtrar tarefas
  useEffect(() => {
    let filtered = [...tasks];
    
    // Filtrar por responsável
    if (responsibleFilter !== 'all') {
      filtered = filtered.filter(task => 
        Array.isArray(task.responsavel) 
          ? task.responsavel.includes(responsibleFilter)
          : task.responsavel === responsibleFilter
      );
    }
    
    // Filtrar por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // Filtrar tarefas finalizadas se necessário
    if (!showCompletedTasks) {
      filtered = filtered.filter(task => task.status !== 'Finalizada');
    }
    
    // Ordenar por prazo
    filtered.sort((a, b) => {
      const dateA = new Date(a.prazoLimite);
      const dateB = new Date(b.prazoLimite);
      return deadlineSort === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    setFilteredTasks(filtered);
  }, [tasks, responsibleFilter, statusFilter, deadlineSort, showCompletedTasks]);

  // Carregar logs
  useEffect(() => {
    const q = query(
        collection(db, 'task_logs'), 
        orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      setLogs(logsData);
      setLogsLoading(false);
    }, (error) => {
      console.error('Erro ao carregar logs:', error);
      setLogsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        descricao: task.descricao,
        responsavel: Array.isArray(task.responsavel) ? task.responsavel : [task.responsavel],
        prazoLimite: task.prazoLimite,
        observacoes: task.observacoes || '',
        status: task.status || 'Pendente',
        tipo: 'nao_recorrente'
      });
    } else {
      setEditingTask(null);
      setFormData({
        descricao: '',
        responsavel: [],
        prazoLimite: dayjs().format('YYYY-MM-DD'),
        observacoes: '',
        status: 'Pendente',
        tipo: 'nao_recorrente'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  // Função para registrar o log
  const addTaskLog = async (action, taskData, taskId = null) => {
    try {
      const logEntry = {
        action, // 'create', 'update', 'delete' ou 'status-change'
        taskId,
        taskDescription: taskData?.descricao,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp()
      };
      
      // Adicionar informações sobre mudança de status
      if (action === 'status-change' && taskData) {
        // Encontrar a tarefa original para obter o status anterior
        const originalTask = tasks.find(task => task.id === taskId);
        if (originalTask) {
          logEntry.oldStatus = originalTask.status;
          logEntry.newStatus = taskData.status;
        }
      }
      
      await addDoc(collection(db, 'task_logs'), logEntry);
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.descricao || !formData.responsavel.length || !formData.prazoLimite) {
        setSnackbar({
          open: true,
          message: 'Preencha todos os campos obrigatórios',
          severity: 'error'
        });
        return;
      }

      const taskData = {
        ...formData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editingTask) {
        // Verificar se o status foi alterado
        const statusChanged = editingTask.status !== formData.status;
        
        await updateDoc(doc(db, 'tarefas', editingTask.id), taskData);
        
        // Registrar log de atualização
        if (statusChanged) {
          // Se houve mudança de status, registrar com ação específica
          await addTaskLog('status-change', {
            ...taskData,
            oldStatus: editingTask.status,
            newStatus: formData.status
          }, editingTask.id);
        } else {
          // Atualização normal sem mudança de status
          await addTaskLog('update', taskData, editingTask.id);
        }
        
        setSnackbar({
          open: true,
          message: 'Tarefa atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        taskData.createdAt = serverTimestamp();
        taskData.createdBy = currentUser.uid;
        const docRef = await addDoc(collection(db, 'tarefas'), taskData);
        // Registrar log de criação
        await addTaskLog('create', taskData, docRef.id);
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
        const taskToDelete = tasks.find(task => task.id === taskId);
        await deleteDoc(doc(db, 'tarefas', taskId));
        // Registrar log de exclusão
        await addTaskLog('delete', taskToDelete, taskId);
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

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, 'tarefas', taskId);
      const taskToUpdate = tasks.find(task => task.id === taskId);
      
      if (!taskToUpdate) {
        throw new Error('Tarefa não encontrada');
      }
      
      // Salvar o status anterior antes de atualizar
      const oldStatus = taskToUpdate.status;
      
      await updateDoc(taskRef, { 
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });
      
      // Registrar log de atualização de status com informações de status anterior e novo
      await addTaskLog('status-change', {
        ...taskToUpdate,
        oldStatus: oldStatus,
        newStatus: newStatus
      }, taskId);
      
      setSnackbar({
        open: true,
        message: 'Status atualizado com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status. Por favor, tente novamente.',
        severity: 'error'
      });
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

  // Função para determinar qual aba está ativa baseado na URL
  const getCurrentTab = () => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    switch (tab) {
      case 'nao_recorrente':
        return 0;
      case 'diaria':
        return 1;
      case 'semanal':
        return 2;
      case 'mensal':
        return 3;
      case 'por_horario':
        return 4;
      case 'logs':
        return 5;
      default:
        return 0;
    }
  };

  // Função para navegar entre as abas
  const handleTabChange = (event, newValue) => {
    const tabPaths = [
      '/admin/tarefas?tab=nao_recorrente',
      '/admin/tarefas?tab=diaria',
      '/admin/tarefas?tab=semanal',
      '/admin/tarefas?tab=mensal',
      '/admin/tarefas?tab=por_horario',
      '/admin/tarefas?tab=logs'
    ];
    navigate(tabPaths[newValue]);
  };

  // Função para formatar data e hora para exibição nos logs
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    
    // Se for um timestamp do Firestore
    if (timestamp.toDate) {
      const date = timestamp.toDate();
      return dayjs(date).format('DD/MM/YYYY HH:mm');
    }
    
    // Se for uma data normal
    return dayjs(timestamp).format('DD/MM/YYYY HH:mm');
  };

  // Função para obter o nome da ação
  const getActionName = (action, log) => {
    switch (action) {
      case 'create': 
        return 'Criou';
      case 'update': 
        return 'Editou';
      case 'delete': 
        return 'Excluiu';
      case 'status-change': 
        if (log.oldStatus && log.newStatus) {
          return `Alterou o status: ${log.oldStatus} → ${log.newStatus}`;
        }
        return 'Alterou o status';
      default: 
        return action;
    }
  };

  // Função para encontrar informações do usuário pelo ID
  const getUserInfo = (userId) => {
    const user = users.find(u => u.id === userId);
    return user || { name: 'Usuário desconhecido', profilePicture: null };
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

    return (
    <MainLayout title="Tarefas">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ color: '#000', mb: 3 }}>
          Gerenciamento de Tarefas
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={getCurrentTab()} onChange={handleTabChange}>
            <Tab label="Não recorrentes" />
            <Tab label="Diárias" />
            <Tab label="Semanais" />
            <Tab label="Mensais" />
            <Tab label="Por horário" />
            <Tab label="Logs" />
          </Tabs>
        </Box>

        {/* Mostrar conteúdo apenas se estiver na aba de tarefas não recorrentes */}
        {getCurrentTab() === 0 && (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={showCompletedTasks}
                onChange={(e) => setShowCompletedTasks(e.target.checked)}
                id="show-completed"
              />
              <Typography
                component="label"
                htmlFor="show-completed"
                sx={{ cursor: 'pointer', userSelect: 'none', color: '#000' }}
              >
                  Mostrar tarefas finalizadas
              </Typography>
            </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nova Tarefa
        </Button>
      </Box>

      {/* Adicionar filtros */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filtrar por Responsável</InputLabel>
              <Select
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                label="Filtrar por Responsável"
              >
                <MenuItem value="all">Todos os responsáveis</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filtrar por Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Filtrar por Status"
              >
                <MenuItem value="all">Todos os status</MenuItem>
                <MenuItem value="Pendente">Pendente</MenuItem>
                <MenuItem value="Em andamento">Em andamento</MenuItem>
                <MenuItem value="Finalizada">Finalizada</MenuItem>
                <MenuItem value="Aguardando">Aguardando</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Ordenar por Prazo</InputLabel>
              <Select
                value={deadlineSort}
                onChange={(e) => setDeadlineSort(e.target.value)}
                label="Ordenar por Prazo"
              >
                <MenuItem value="asc">Mais próximo primeiro</MenuItem>
                <MenuItem value="desc">Mais distante primeiro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
                <TableCell>Descrição</TableCell>
                    <TableCell>Responsável</TableCell>
                    <TableCell>Prazo</TableCell>
                    <TableCell>Observações</TableCell>
                    <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                  {filteredTasks.map((task) => (
              <TableRow key={task.id}>
                    <TableCell>{task.descricao}</TableCell>
                <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Array.isArray(task.responsavel) ? (
                              task.responsavel.map((userId) => (
                                <Chip
                                  key={userId}
                                  label={users.find(user => user.id === userId)?.name || userId}
                    size="small"
                                />
                              ))
                            ) : (
                              <Chip
                                label={users.find(user => user.id === task.responsavel)?.name || task.responsavel}
                                size="small"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={dayjs(task.prazoLimite).format('DD/MM/YYYY')}
                            color={getStatusColor(task.prazoLimite)}
                        size="small"
                          />
                    </TableCell>
                    <TableCell>{task.observacoes}</TableCell>
                    <TableCell>
                      <Select
                        value={task.status || 'Pendente'}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        size="small"
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="Pendente">Pendente</MenuItem>
                        <MenuItem value="Em andamento">Em andamento</MenuItem>
                        <MenuItem value="Finalizada">Finalizada</MenuItem>
                        <MenuItem value="Aguardando">Aguardando</MenuItem>
                      </Select>
                    </TableCell>
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
                  {filteredTasks.length === 0 && (
                <TableRow>
                      <TableCell colSpan={6} align="center">
                        Nenhuma tarefa encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </>
        )}

        {/* Aba de Logs */}
        {getCurrentTab() === 5 && (
          <>
            {logsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : logs.length === 0 ? (
              <Alert severity="info">Nenhum registro de log encontrado.</Alert>
            ) : (
              <TableContainer component={Paper} sx={{ mb: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Colaborador</TableCell>
                      <TableCell>Ação</TableCell>
                      <TableCell>Tarefa</TableCell>
                      <TableCell>Data e Hora</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar 
                              src={getUserInfo(log.userId)?.profilePicture} 
                              sx={{ width: 30, height: 30 }}
                            >
                              {(getUserInfo(log.userId)?.name || log.userName || 'U')[0]}
                            </Avatar>
                            <Typography>
                              {getUserInfo(log.userId)?.name || 
                                (log.userName && log.userName.includes('@') 
                                  ? log.userName.split('@')[0] 
                                  : log.userName)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{getActionName(log.action, log)}</TableCell>
                        <TableCell>{log.taskDescription || '(Tarefa excluída)'}</TableCell>
                        <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

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
                multiline
                rows={2}
              />

                  <FormControl fullWidth required>
                    <InputLabel>Responsável</InputLabel>
                    <Select
                      multiple
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      label="Responsável"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={users.find(user => user.id === value)?.name || value}
                        />
                      ))}
                    </Box>
                  )}
                    >
                      {users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.name || user.email}
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
                rows={3}
              />

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em andamento">Em andamento</MenuItem>
                  <MenuItem value="Finalizada">Finalizada</MenuItem>
                  <MenuItem value="Aguardando">Aguardando</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.descricao || !formData.responsavel.length || !formData.prazoLimite}
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