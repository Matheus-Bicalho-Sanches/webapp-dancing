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
  Select as MuiSelect,
  MenuItem as MuiMenuItem,
  Divider,
  Checkbox,
  Pagination,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon
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
  where,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Popover from '@mui/material/Popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    responsavel: [],
    prazoLimite: dayjs().format('YYYY-MM-DD'),
    observacoes: ''
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [dateSort, setDateSort] = useState('asc');
  const [responsavelFilter, setResponsavelFilter] = useState(null);
  const [responsavelSort, setResponsavelSort] = useState('asc');
  const [responsavelAnchorEl, setResponsavelAnchorEl] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [statusSort, setStatusSort] = useState('asc');
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);
  const [prazoFilter, setPrazoFilter] = useState(null);
  const [prazoSort, setPrazoSort] = useState('asc');
  const [prazoAnchorEl, setPrazoAnchorEl] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');

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
      where('tipo', 'in', ['nao_recorrente', 'por_horario']),
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

  useEffect(() => {
    const loadLogs = () => {
      const q = query(
        collection(db, 'task_logs'),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLogs(logsData);
        setLoadingLogs(false);
      });

      return unsubscribe;
    };

    if (currentTab === 5) {
      return loadLogs();
    }
  }, [currentTab]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        descricao: task.descricao,
        responsavel: Array.isArray(task.responsavel) ? task.responsavel : [task.responsavel],
        prazoLimite: task.prazoLimite,
        observacoes: task.observacoes || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        descricao: '',
        responsavel: [],
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
      if (formData.responsavel.length === 0) {
        setSnackbar({
          open: true,
          message: 'Selecione pelo menos um responsável.',
          severity: 'error'
        });
        return;
      }

      const taskData = {
        ...formData,
        status: 'Pendente',
        tipo: currentTab === 4 ? 'por_horario' : 'nao_recorrente',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tarefas', editingTask.id), taskData);
        await createLogEntry('update', { ...taskData, id: editingTask.id }, editingTask);
        setSnackbar({
          open: true,
          message: 'Tarefa atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        const docRef = await addDoc(collection(db, 'tarefas'), {
          ...taskData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
        await createLogEntry('create', { ...taskData, id: docRef.id });
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
        const taskRef = doc(db, 'tarefas', taskId);
        const taskSnapshot = await getDoc(taskRef);
        const taskData = { ...taskSnapshot.data(), id: taskId };
        
        await deleteDoc(taskRef);
        await createLogEntry('delete', taskData);
        
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
      setUpdatingStatus(true);
      const taskRef = doc(db, 'tarefas', taskId);
      const taskSnapshot = await getDoc(taskRef);
      const previousData = { ...taskSnapshot.data(), id: taskId };
      
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await createLogEntry('update', 
        { ...previousData, status: newStatus }, 
        previousData
      );

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
    } finally {
      setUpdatingStatus(false);
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

  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleDateFilterChange = (date) => {
    setDateFilter(date);
    handleFilterClose();
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    handleFilterClose();
  };

  const handleResponsavelFilterClick = (event) => {
    setResponsavelAnchorEl(event.currentTarget);
  };

  const handleResponsavelFilterClose = () => {
    setResponsavelAnchorEl(null);
  };

  const handleResponsavelFilterChange = (userId) => {
    setResponsavelFilter(userId);
    handleResponsavelFilterClose();
  };

  const clearResponsavelFilter = () => {
    setResponsavelFilter(null);
    handleResponsavelFilterClose();
  };

  const handleStatusFilterClick = (event) => {
    setStatusAnchorEl(event.currentTarget);
  };

  const handleStatusFilterClose = () => {
    setStatusAnchorEl(null);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    handleStatusFilterClose();
  };

  const clearStatusFilter = () => {
    setStatusFilter(null);
    handleStatusFilterClose();
  };

  const handlePrazoFilterClick = (event) => {
    setPrazoAnchorEl(event.currentTarget);
  };

  const handlePrazoFilterClose = () => {
    setPrazoAnchorEl(null);
  };

  const handlePrazoFilterChange = (date) => {
    setPrazoFilter(date);
    handlePrazoFilterClose();
  };

  const clearPrazoFilter = () => {
    setPrazoFilter(null);
    handlePrazoFilterClose();
  };

  const filterTasks = (tasksToFilter) => {
    let filteredTasks = tasksToFilter;
    
    // Filter out completed tasks if showCompletedTasks is false
    if (!showCompletedTasks) {
      filteredTasks = filteredTasks.filter(task => task.status !== 'Finalizada');
    }

    // Apply date filter
    if (dateFilter) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = dayjs(task.createdAt.toDate()).format('YYYY-MM-DD');
        return taskDate === dateFilter;
      });
    }

    // Apply responsável filter
    if (responsavelFilter) {
      filteredTasks = filteredTasks.filter(task => task.responsavel.includes(responsavelFilter));
    }

    // Apply status filter
    if (statusFilter) {
      filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }

    // Apply prazo filter
    if (prazoFilter) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.prazoLimite) return false;
        const taskPrazo = dayjs(task.prazoLimite).format('YYYY-MM-DD');
        return taskPrazo === prazoFilter;
      });
    }

    // Apply date sorting
    if (orderBy === 'createdAt') {
      filteredTasks = [...filteredTasks].sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        const dateA = a.createdAt.toDate();
        const dateB = b.createdAt.toDate();
        return dateSort === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    // Apply responsável sorting
    if (orderBy === 'responsavel') {
      filteredTasks = [...filteredTasks].sort((a, b) => {
        const userA = users.find(user => user.id === a.responsavel)?.name || a.responsavel;
        const userB = users.find(user => user.id === b.responsavel)?.name || b.responsavel;
        return responsavelSort === 'asc' 
          ? userA.localeCompare(userB)
          : userB.localeCompare(userA);
      });
    }

    // Apply status sorting
    if (orderBy === 'status') {
      filteredTasks = [...filteredTasks].sort((a, b) => {
        const statusA = a.status || 'Pendente';
        const statusB = b.status || 'Pendente';
        return statusSort === 'asc'
          ? statusA.localeCompare(statusB)
          : statusB.localeCompare(statusA);
      });
    }

    // Apply prazo sorting
    if (orderBy === 'prazo') {
      filteredTasks = [...filteredTasks].sort((a, b) => {
        if (!a.prazoLimite || !b.prazoLimite) return 0;
        const prazoA = dayjs(a.prazoLimite);
        const prazoB = dayjs(b.prazoLimite);
        return prazoSort === 'asc' ? prazoA.diff(prazoB) : prazoB.diff(prazoA);
      });
    }

    return filteredTasks;
  };

  const createLogEntry = async (action, taskData, previousData = null) => {
    try {
      const logEntry = {
        action,
        taskId: taskData.id,
        description: taskData.descricao,
        userId: currentUser.uid,
        userName: users.find(u => u.id === currentUser.uid)?.name || currentUser.email,
        timestamp: serverTimestamp(),
        changes: {}
      };

      if (action === 'create') {
        logEntry.changes = {
          descricao: taskData.descricao,
          responsavel: taskData.responsavel,
          prazoLimite: taskData.prazoLimite,
          observacoes: taskData.observacoes,
          status: taskData.status,
          tipo: taskData.tipo
        };
      } else if (action === 'update' && previousData) {
        // Compare and record only changed fields
        Object.keys(taskData).forEach(key => {
          if (JSON.stringify(taskData[key]) !== JSON.stringify(previousData[key])) {
            logEntry.changes[key] = {
              from: previousData[key],
              to: taskData[key]
            };
          }
        });
      } else if (action === 'delete') {
        logEntry.changes = {
          deleted: true,
          taskData: taskData
        };
      }

      await addDoc(collection(db, 'task_logs'), logEntry);
    } catch (error) {
      console.error('Error creating log entry:', error);
    }
  };

  const renderLogs = () => {
    if (loadingLogs) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    // Filter logs by date range
    let filteredLogs = logs;
    if (logStartDate || logEndDate) {
      filteredLogs = logs.filter(log => {
        if (!log.timestamp) return false;
        const logDate = dayjs(log.timestamp.toDate());
        
        if (logStartDate && logEndDate) {
          return logDate.isAfter(dayjs(logStartDate).startOf('day')) && 
                 logDate.isBefore(dayjs(logEndDate).endOf('day'));
        } else if (logStartDate) {
          return logDate.isAfter(dayjs(logStartDate).startOf('day'));
        } else if (logEndDate) {
          return logDate.isBefore(dayjs(logEndDate).endOf('day'));
        }
        
        return true;
      });
    }

    // Calculate the current page's logs
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentLogs = filteredLogs.slice(startIndex, endIndex);

    return (
      <>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            type="date"
            label="Data inicial"
            value={logStartDate}
            onChange={(e) => {
              setLogStartDate(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ 
              width: 200,
              '& .MuiSvgIcon-root': {
                color: '#000'
              }
            }}
          />
          <TextField
            type="date"
            label="Data final"
            value={logEndDate}
            onChange={(e) => {
              setLogEndDate(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ 
              width: 200,
              '& .MuiSvgIcon-root': {
                color: '#000'
              }
            }}
          />
          {(logStartDate || logEndDate) && (
            <Button
              variant="outlined"
              onClick={() => {
                setLogStartDate('');
                setLogEndDate('');
                setPage(0);
              }}
              startIcon={<ClearIcon />}
            >
              Limpar filtros
            </Button>
          )}
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>Descrição da Tarefa</TableCell>
                <TableCell>Alterações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.timestamp ? format(log.timestamp.toDate(), "dd/MM/yy HH:mm", { locale: ptBR }) : '-'}
                  </TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        log.action === 'create' ? 'Criação' :
                        log.action === 'update' ? 'Atualização' :
                        log.action === 'delete' ? 'Exclusão' : log.action
                      }
                      color={
                        log.action === 'create' ? 'success' :
                        log.action === 'update' ? 'primary' :
                        log.action === 'delete' ? 'error' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.description}</TableCell>
                  <TableCell>
                    <Box sx={{ whiteSpace: 'pre-line' }}>
                      {log.action === 'create' && 'Nova tarefa criada'}
                      {log.action === 'delete' && 'Tarefa excluída'}
                      {log.action === 'update' && Object.entries(log.changes).map(([field, change]) => (
                        <Typography key={field} variant="body2" sx={{ mb: 1 }}>
                          <strong>{field}:</strong> {
                            Array.isArray(change.from) ?
                              `${change.from.join(', ')} → ${change.to.join(', ')}` :
                              `${change.from} → ${change.to}`
                          }
                        </Typography>
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={filteredLogs.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Logs por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Box>
      </>
    );
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

  const renderTasksTable = (isArchive = false, taskType = 'nao_recorrente') => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <FormControl component="fieldset">
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
              Mostrar tarefas concluídas
            </Typography>
          </Box>
        </FormControl>
        
        {!isArchive && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nova Tarefa
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '30%' }}>Descrição</TableCell>
              <TableCell sx={{ width: '10%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Data criação
                  <IconButton 
                    size="small" 
                    onClick={handleFilterClick}
                    sx={{ 
                      ml: 1,
                      color: (dateFilter || dateSort === 'desc') ? 'primary.main' : 'inherit'
                    }}
                  >
                    <FilterListIcon fontSize="small" />
                    {!dateFilter && dateSort === 'desc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↓
                      </Box>
                    )}
                    {!dateFilter && dateSort === 'asc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↑
                      </Box>
                    )}
                  </IconButton>
                  {dateFilter && (
                    <IconButton 
                      size="small" 
                      onClick={clearDateFilter}
                      sx={{ ml: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Prazo
                  <IconButton 
                    size="small" 
                    onClick={handlePrazoFilterClick}
                    sx={{ 
                      ml: 1,
                      color: (prazoFilter || prazoSort === 'desc') ? 'primary.main' : 'inherit'
                    }}
                  >
                    <FilterListIcon fontSize="small" />
                    {!prazoFilter && prazoSort === 'desc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↓
                      </Box>
                    )}
                    {!prazoFilter && prazoSort === 'asc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↑
                      </Box>
                    )}
                  </IconButton>
                  {prazoFilter && (
                    <IconButton 
                      size="small" 
                      onClick={clearPrazoFilter}
                      sx={{ ml: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Responsável
                  <IconButton 
                    size="small" 
                    onClick={handleResponsavelFilterClick}
                    sx={{ 
                      ml: 1,
                      color: (responsavelFilter || responsavelSort === 'desc') ? 'primary.main' : 'inherit'
                    }}
                  >
                    <FilterListIcon fontSize="small" />
                    {!responsavelFilter && responsavelSort === 'desc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↓
                      </Box>
                    )}
                    {!responsavelFilter && responsavelSort === 'asc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↑
                      </Box>
                    )}
                  </IconButton>
                  {responsavelFilter && (
                    <IconButton 
                      size="small" 
                      onClick={clearResponsavelFilter}
                      sx={{ ml: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
              <TableCell>Observações</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Status
                  <IconButton 
                    size="small" 
                    onClick={handleStatusFilterClick}
                    sx={{ 
                      ml: 1,
                      color: (statusFilter || statusSort === 'desc') ? 'primary.main' : 'inherit'
                    }}
                  >
                    <FilterListIcon fontSize="small" />
                    {!statusFilter && statusSort === 'desc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↓
                      </Box>
                    )}
                    {!statusFilter && statusSort === 'asc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↑
                      </Box>
                    )}
                  </IconButton>
                  {statusFilter && (
                    <IconButton 
                      size="small" 
                      onClick={clearStatusFilter}
                      sx={{ ml: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filterTasks(
              tasks.filter(task => task.tipo === taskType)
            ).map((task) => (
              <TableRow key={task.id}>
                <TableCell sx={{ width: '30%' }}>
                  <Typography
                    component="div"
                    sx={{
                      whiteSpace: 'pre-line',
                      wordBreak: 'break-word'
                    }}
                  >
                    {task.descricao}
                  </Typography>
                </TableCell>
                <TableCell>
                  {task.createdAt ? dayjs(task.createdAt.toDate()).format('DD/MM/YY') : '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={dayjs(task.prazoLimite).format('DD/MM/YYYY')}
                    color={getStatusColor(task.prazoLimite)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Array.isArray(task.responsavel) ? (
                      task.responsavel.map((userId) => (
                        <Chip
                          key={userId}
                          label={users.find(user => user.id === userId)?.name || userId}
                          size="small"
                          sx={{ margin: '2px' }}
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
                  <Typography
                    component="div"
                    sx={{
                      whiteSpace: 'pre-line',
                      wordBreak: 'break-word'
                    }}
                  >
                    {task.observacoes}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Select
                    value={task.status || 'Pendente'}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    size="small"
                    disabled={updatingStatus}
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
            {filterTasks(
              tasks.filter(task => task.tipo === taskType)
            ).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
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
            <Tab label="Por horário" />
            <Tab label="Logs" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {renderTasksTable(false, 'nao_recorrente')}
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

        <TabPanel value={currentTab} index={4}>
          {renderTasksTable(false, 'por_horario')}
        </TabPanel>

        <TabPanel value={currentTab} index={5}>
          {renderLogs()}
        </TabPanel>

        {/* Dialog para adicionar/editar tarefa */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
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
                rows={4}
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
                          size="small"
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

        {/* Date Filter Popover */}
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por data
            </Typography>
            <TextField
              type="date"
              size="small"
              value={dateFilter || ''}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">Mais antigos primeiro</MenuItem>
                <MenuItem value="desc">Mais recentes primeiro</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

        {/* Responsável Filter Popover */}
        <Popover
          open={Boolean(responsavelAnchorEl)}
          anchorEl={responsavelAnchorEl}
          onClose={handleResponsavelFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por responsável
            </Typography>
            <FormControl size="small">
              <Select
                value={responsavelFilter || ''}
                onChange={(e) => handleResponsavelFilterChange(e.target.value)}
                sx={{ minWidth: 200 }}
                displayEmpty
              >
                <MenuItem value="">Todos</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={responsavelSort}
                onChange={(e) => setResponsavelSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">A-Z</MenuItem>
                <MenuItem value="desc">Z-A</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

        {/* Status Filter Popover */}
        <Popover
          open={Boolean(statusAnchorEl)}
          anchorEl={statusAnchorEl}
          onClose={handleStatusFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por status
            </Typography>
            <FormControl size="small">
              <Select
                value={statusFilter || ''}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                sx={{ minWidth: 200 }}
                displayEmpty
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="Pendente">Pendente</MenuItem>
                <MenuItem value="Em andamento">Em andamento</MenuItem>
                <MenuItem value="Finalizada">Finalizada</MenuItem>
                <MenuItem value="Aguardando">Aguardando</MenuItem>
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={statusSort}
                onChange={(e) => setStatusSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">A-Z</MenuItem>
                <MenuItem value="desc">Z-A</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

        {/* Prazo Filter Popover */}
        <Popover
          open={Boolean(prazoAnchorEl)}
          anchorEl={prazoAnchorEl}
          onClose={handlePrazoFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por prazo
            </Typography>
            <TextField
              type="date"
              size="small"
              value={prazoFilter || ''}
              onChange={(e) => handlePrazoFilterChange(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={prazoSort}
                onChange={(e) => setPrazoSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">Mais próximos primeiro</MenuItem>
                <MenuItem value="desc">Mais distantes primeiro</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

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