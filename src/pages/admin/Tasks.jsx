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
    observacoes: '',
    diasSemana: [],
    horario: '',
    importancia: 'normal'
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
  const [taskPage, setTaskPage] = useState(0);
  const [tasksPerPage, setTasksPerPage] = useState(100);
  const [diaHorarioFilter, setDiaHorarioFilter] = useState(null);
  const [diaHorarioSort, setDiaHorarioSort] = useState('asc');
  const [diaHorarioAnchorEl, setDiaHorarioAnchorEl] = useState(null);
  const [importanciaFilter, setImportanciaFilter] = useState(null);
  const [importanciaSort, setImportanciaSort] = useState('asc');
  const [importanciaAnchorEl, setImportanciaAnchorEl] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState([]);

  const diasSemanaOptions = [
    { value: 'segunda', label: 'Segunda-feira' },
    { value: 'terca', label: 'Terça-feira' },
    { value: 'quarta', label: 'Quarta-feira' },
    { value: 'quinta', label: 'Quinta-feira' },
    { value: 'sexta', label: 'Sexta-feira' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' }
  ];

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
    const unsubscribeNonDaily = onSnapshot(
      query(
      collection(db, 'tarefas'), 
        where('tipo', 'in', ['nao_recorrente', 'por_horario']),
      orderBy('prazoLimite', 'asc')
      ),
      (querySnapshot) => {
        const nonDailyTasks = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Update tasks state with both daily and non-daily tasks
        setTasks(currentTasks => {
          const dailyTasks = currentTasks.filter(task => task.tipo === 'diaria');
          return [...dailyTasks, ...nonDailyTasks];
        });
      },
      (error) => {
        console.error('Erro ao carregar tarefas não diárias:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao carregar tarefas. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    );

    // Separate query for daily tasks
    const unsubscribeDaily = onSnapshot(
      query(
        collection(db, 'tarefas'),
        where('tipo', '==', 'diaria'),
        orderBy('descricao', 'asc')  // Order by description since there's no prazoLimite
      ),
      (querySnapshot) => {
        const dailyTasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
        
        // Update tasks state with both daily and non-daily tasks
        setTasks(currentTasks => {
          const nonDailyTasks = currentTasks.filter(task => task.tipo !== 'diaria');
          return [...nonDailyTasks, ...dailyTasks];
        });
      setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar tarefas diárias:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar tarefas. Por favor, tente novamente.',
        severity: 'error'
      });
      setLoading(false);
      }
    );

    // Cleanup subscriptions
    return () => {
      unsubscribeNonDaily();
      unsubscribeDaily();
    };
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
        observacoes: task.observacoes || '',
        diasSemana: task.diasSemana || [],
        horario: task.horario || '',
        importancia: task.importancia || 'normal'
      });
    } else {
      setEditingTask(null);
      setFormData({
        descricao: '',
        responsavel: [],
        prazoLimite: dayjs().format('YYYY-MM-DD'),
        observacoes: '',
        diasSemana: [],
        horario: '',
        importancia: 'normal'
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
      if (currentTab !== 4 && currentTab !== 1 && formData.responsavel.length === 0) {
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
        tipo: currentTab === 4 ? 'por_horario' : 
              currentTab === 1 ? 'diaria' : 'nao_recorrente',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      // For daily tasks, add lastCompletedDate field
      if (currentTab === 1) {
        taskData.lastCompletedDate = null;
        delete taskData.responsavel;
        delete taskData.prazoLimite;
      }

      // Remove responsável field for por_horario tasks
      if (currentTab === 4) {
        delete taskData.responsavel;
      }

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
      
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // If it's a daily task being marked as completed, set the lastCompletedDate
      if (previousData.tipo === 'diaria' && newStatus === 'Finalizada') {
        updateData.lastCompletedDate = serverTimestamp();
      }

      await updateDoc(taskRef, updateData);
      await createLogEntry('update', 
        { ...previousData, ...updateData }, 
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

  const handleDiaHorarioFilterClick = (event) => {
    setDiaHorarioAnchorEl(event.currentTarget);
  };

  const handleDiaHorarioFilterClose = () => {
    setDiaHorarioAnchorEl(null);
  };

  const handleDiaHorarioFilterChange = (dia) => {
    setDiaHorarioFilter(dia);
    handleDiaHorarioFilterClose();
  };

  const clearDiaHorarioFilter = () => {
    setDiaHorarioFilter(null);
    handleDiaHorarioFilterClose();
  };

  const handleImportanciaFilterClick = (event) => {
    setImportanciaAnchorEl(event.currentTarget);
  };

  const handleImportanciaFilterClose = () => {
    setImportanciaAnchorEl(null);
  };

  const handleImportanciaFilterChange = (value) => {
    setImportanciaFilter(value);
    handleImportanciaFilterClose();
  };

  const clearImportanciaFilter = () => {
    setImportanciaFilter(null);
    handleImportanciaFilterClose();
  };

  const filterTasks = async (tasksToFilter, taskType = 'nao_recorrente') => {
    let filteredTasks = tasksToFilter;
    
    // Reset daily tasks status if they were completed on a previous day
    if (taskType === 'diaria') {
      const tasksToUpdate = [];
      filteredTasks = filteredTasks.map(task => {
        if (task.status === 'Finalizada' && task.lastCompletedDate) {
          const completedDate = dayjs(task.lastCompletedDate.toDate());
          const today = dayjs().startOf('day');
          
          // If the task was completed on a previous day, reset it to Pendente
          if (completedDate.isBefore(today)) {
            // Add task to update queue
            tasksToUpdate.push({
              id: task.id,
              data: {
                status: 'Pendente',
                lastCompletedDate: null,
                updatedAt: serverTimestamp()
              }
            });
            
            // Return updated task for UI
            return {
              ...task,
              status: 'Pendente',
              lastCompletedDate: null
            };
          }
        }
        return task;
      });

      // Update tasks in Firestore
      for (const taskToUpdate of tasksToUpdate) {
        try {
          await updateDoc(
            doc(db, 'tarefas', taskToUpdate.id),
            taskToUpdate.data
          );
        } catch (error) {
          console.error('Error updating task status:', error);
        }
      }
    }

    // Apply filters
    if (!showCompletedTasks) {
      filteredTasks = filteredTasks.filter(task => task.status !== 'Finalizada');
    }

    if (dateFilter) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = dayjs(task.createdAt.toDate()).format('YYYY-MM-DD');
        return taskDate === dateFilter;
      });
    }

    if (responsavelFilter) {
      filteredTasks = filteredTasks.filter(task => task.responsavel.includes(responsavelFilter));
    }

    if (statusFilter) {
      filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }

    if (prazoFilter) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.prazoLimite) return false;
        const taskPrazo = dayjs(task.prazoLimite).format('YYYY-MM-DD');
        return taskPrazo === prazoFilter;
      });
    }

    if (diaHorarioFilter) {
      filteredTasks = filteredTasks.filter(task => 
        task.diasSemana?.includes(diaHorarioFilter)
      );
    }

    if (importanciaFilter && taskType === 'diaria') {
      filteredTasks = filteredTasks.filter(task => task.importancia === importanciaFilter);
    }

    // Apply sorting
    if (taskType === 'por_horario') {
      // Apply dia e horário sorting
      filteredTasks = [...filteredTasks].sort((a, b) => {
        const diaA = a.diasSemana?.[0] || '';
        const diaB = b.diasSemana?.[0] || '';
        
        if (diaA === diaB) {
          const horarioA = a.horario || '';
          const horarioB = b.horario || '';
          return diaHorarioSort === 'asc' 
            ? horarioA.localeCompare(horarioB)
            : horarioB.localeCompare(horarioA);
        }
        
        const diaIndexA = diasSemanaOptions.findIndex(opt => opt.value === diaA);
        const diaIndexB = diasSemanaOptions.findIndex(opt => opt.value === diaB);
        return diaHorarioSort === 'asc'
          ? diaIndexA - diaIndexB
          : diaIndexB - diaIndexA;
      });
    } else {
      // Apply responsável sorting for non-por_horario tasks
      if (responsavelSort && taskType !== 'diaria') {
        filteredTasks = [...filteredTasks].sort((a, b) => {
          // Handle cases where responsavel might be undefined or not an array
          const respA = Array.isArray(a.responsavel) ? a.responsavel[0] : a.responsavel;
          const respB = Array.isArray(b.responsavel) ? b.responsavel[0] : b.responsavel;
          
          // If either task doesn't have a responsavel, handle it gracefully
          if (!respA && !respB) return 0;
          if (!respA) return 1;
          if (!respB) return -1;

          const userA = users.find(user => user.id === respA)?.name || respA;
          const userB = users.find(user => user.id === respB)?.name || respB;
          
        return responsavelSort === 'asc' 
          ? userA.localeCompare(userB)
          : userB.localeCompare(userA);
        });
      }

      // Apply prazo sorting for non-por_horario tasks
      if (prazoSort) {
        filteredTasks = [...filteredTasks].sort((a, b) => {
          if (!a.prazoLimite || !b.prazoLimite) return 0;
          const prazoA = dayjs(a.prazoLimite);
          const prazoB = dayjs(b.prazoLimite);
          return prazoSort === 'asc' 
            ? prazoA.diff(prazoB) 
            : prazoB.diff(prazoA);
        });
      }
    }

    // Apply status sorting for all tasks (both por_horario and non-por_horario)
    if (statusSort) {
      filteredTasks = [...filteredTasks].sort((a, b) => {
        const statusA = a.status || 'Pendente';
        const statusB = b.status || 'Pendente';
        return statusSort === 'asc'
          ? statusA.localeCompare(statusB)
          : statusB.localeCompare(statusA);
      });
    }

    // Apply sorting for daily tasks
    if (taskType === 'diaria' && importanciaSort) {
      filteredTasks = [...filteredTasks].sort((a, b) => {
        const importanceOrder = { alta: 3, normal: 2, baixa: 1 };
        const valueA = importanceOrder[a.importancia || 'normal'];
        const valueB = importanceOrder[b.importancia || 'normal'];
        return importanciaSort === 'asc' ? valueA - valueB : valueB - valueA;
      });
    }

    return filteredTasks;
  };

  useEffect(() => {
    const updateFilteredTasks = async () => {
      if (currentTab === 0) {
        const filtered = await filterTasks(tasks.filter(task => task.tipo === 'nao_recorrente'), 'nao_recorrente');
        setFilteredTasks(filtered);
      } else if (currentTab === 1) {
        const filtered = await filterTasks(tasks.filter(task => task.tipo === 'diaria'), 'diaria');
        setFilteredTasks(filtered);
      } else if (currentTab === 4) {
        const filtered = await filterTasks(tasks.filter(task => task.tipo === 'por_horario'), 'por_horario');
        setFilteredTasks(filtered);
      }
    };

    updateFilteredTasks();
  }, [tasks, currentTab, showCompletedTasks, dateFilter, responsavelFilter, statusFilter, prazoFilter, diaHorarioFilter, importanciaFilter]);

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
        // Base fields for all task types
        const changes = {
          descricao: taskData.descricao,
          status: taskData.status,
          tipo: taskData.tipo,
          observacoes: taskData.observacoes || ''
        };

        // Add type-specific fields
        if (taskData.tipo === 'diaria') {
          changes.importancia = taskData.importancia;
        } else if (taskData.tipo === 'por_horario') {
          changes.diasSemana = taskData.diasSemana;
          changes.horario = taskData.horario;
        } else {
          // For non-recurring tasks
          changes.responsavel = taskData.responsavel;
          changes.prazoLimite = taskData.prazoLimite;
        }

        logEntry.changes = changes;
      } else if (action === 'update' && previousData) {
        // Compare and record only changed fields
        Object.keys(taskData).forEach(key => {
          // Skip undefined or null values
          if (taskData[key] === undefined || taskData[key] === null) return;
          
          // Only include the field if it has changed
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
          taskData: {
            descricao: taskData.descricao,
            tipo: taskData.tipo,
            status: taskData.status,
            ...(taskData.tipo === 'diaria' ? { importancia: taskData.importancia } :
                taskData.tipo === 'por_horario' ? { 
                  diasSemana: taskData.diasSemana,
                  horario: taskData.horario 
                } : { 
                  responsavel: taskData.responsavel,
                  prazoLimite: taskData.prazoLimite 
                })
          }
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
              '& .MuiInputBase-root': {
                color: '#000'
              },
              '& .MuiOutlinedInput-root': {
                '& .MuiIconButton-root': {
                  color: '#000'
                },
                '& button': {
                  color: '#000'
                },
                '& .MuiInputAdornment-root button': {
                  color: '#000 !important'
                }
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
              '& .MuiInputBase-root': {
                color: '#000'
              },
              '& .MuiOutlinedInput-root': {
                '& .MuiIconButton-root': {
                  color: '#000'
                },
                '& button': {
                  color: '#000'
                },
                '& .MuiInputAdornment-root button': {
                  color: '#000 !important'
                }
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

  const renderTasksTable = (isArchive = false, taskType = 'nao_recorrente') => {
    const startIndex = taskPage * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    const currentTasks = filteredTasks.slice(startIndex, endIndex);

    return (
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
                <TableCell>Descrição</TableCell>
                {taskType === 'diaria' ? (
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Importância
                  <IconButton 
                    size="small" 
                        onClick={handleImportanciaFilterClick}
                    sx={{ 
                      ml: 1,
                          color: (importanciaFilter || importanciaSort === 'desc') ? 'primary.main' : 'inherit'
                    }}
                  >
                    <FilterListIcon fontSize="small" />
                        {!importanciaFilter && importanciaSort === 'desc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↓
                      </Box>
                    )}
                        {!importanciaFilter && importanciaSort === 'asc' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                        ↑
                      </Box>
                    )}
                  </IconButton>
                      {importanciaFilter && (
                    <IconButton 
                      size="small" 
                          onClick={clearImportanciaFilter}
                      sx={{ ml: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
                ) : (
                  <>
                    <TableCell>Data criação</TableCell>
                    <TableCell>
                      {taskType === 'por_horario' ? 'Dia e horário' : 'Prazo'}
                    </TableCell>
                    <TableCell>Responsável</TableCell>
                    <TableCell>Observações</TableCell>
                  </>
                )}
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
              {currentTasks.length > 0 ? (
                currentTasks.map((task) => (
              <TableRow key={task.id}>
                    <TableCell>{task.descricao}</TableCell>
                    {taskType === 'diaria' ? (
                      <TableCell>
                        <Chip
                          label={task.importancia === 'alta' ? 'Alta' : 
                                task.importancia === 'baixa' ? 'Baixa' : 'Normal'}
                          color={task.importancia === 'alta' ? 'error' : 
                                task.importancia === 'baixa' ? 'success' : 'primary'}
                          size="small"
                        />
                      </TableCell>
                    ) : (
                      <>
                <TableCell>
                  {task.createdAt ? dayjs(task.createdAt.toDate()).format('DD/MM/YY') : '-'}
                </TableCell>
                <TableCell>
                          {taskType === 'por_horario' ? (
                            <Box>
                              {task.diasSemana?.map((dia) => (
                                <Chip
                                  key={dia}
                                  label={diasSemanaOptions.find(opt => opt.value === dia)?.label}
                                  size="small"
                                  sx={{ mr: 1, mb: 1 }}
                                />
                              ))}
                              {task.horario && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                  {task.horario}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                  <Chip
                    label={dayjs(task.prazoLimite).format('DD/MM/YYYY')}
                    color={getStatusColor(task.prazoLimite)}
                    size="small"
                  />
                          )}
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
                          {task.observacoes}
                        </TableCell>
                      </>
                    )}
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
                ))
              ) : (
              <TableRow>
                  <TableCell colSpan={taskType === 'diaria' ? 4 : 7} align="center">
                  Nenhuma tarefa encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={filteredTasks.length}
            page={taskPage}
            onPageChange={(event, newPage) => setTaskPage(newPage)}
            rowsPerPage={tasksPerPage}
            onRowsPerPageChange={(event) => {
              setTasksPerPage(parseInt(event.target.value, 10));
              setTaskPage(0);
            }}
            labelRowsPerPage="Tarefas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            rowsPerPageOptions={[50, 100, 200]}
          />
        </Box>
    </>
  );
  };

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
          {renderTasksTable(false, 'diaria')}
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

              {currentTab === 1 && (
                <FormControl fullWidth required>
                  <InputLabel>Importância</InputLabel>
                  <Select
                    value={formData.importancia}
                    onChange={(e) => setFormData({ ...formData, importancia: e.target.value })}
                    label="Importância"
                  >
                    <MenuItem value="alta">Alta</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="baixa">Baixa</MenuItem>
                  </Select>
                </FormControl>
              )}

              {currentTab !== 4 && currentTab !== 1 && (
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
              )}

              {currentTab === 4 ? (
                <>
                  <FormControl fullWidth required>
                    <InputLabel>Dias da semana</InputLabel>
                    <Select
                      multiple
                      value={formData.diasSemana || []}
                      onChange={(e) => setFormData({ ...formData, diasSemana: e.target.value })}
                      label="Dias da semana"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={diasSemanaOptions.find(opt => opt.value === value)?.label}
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {diasSemanaOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

                  <TextField
                    fullWidth
                    label="Horário"
                    type="time"
                    value={formData.horario || ''}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      step: 300 // 5 minutes
                    }}
                    required
                  />
                </>
              ) : currentTab !== 1 && (
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
              )}

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
              disabled={
                !formData.descricao || 
                (currentTab !== 4 && currentTab !== 1 && !formData.responsavel.length) || 
                (currentTab === 4 ? (!formData.diasSemana?.length || !formData.horario) : 
                 currentTab !== 1 && !formData.prazoLimite)
              }
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
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por prazo
            </Typography>
            <TextField
              type="date"
              value={prazoFilter || ''}
              onChange={(e) => handlePrazoFilterChange(e.target.value)}
              sx={{ minWidth: 200 }}
              InputLabelProps={{
                shrink: true,
              }}
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
                <MenuItem value="asc">Mais próximo</MenuItem>
                <MenuItem value="desc">Mais distante</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

        {/* Dia e Horário Filter Popover */}
        <Popover
          open={Boolean(diaHorarioAnchorEl)}
          anchorEl={diaHorarioAnchorEl}
          onClose={handleDiaHorarioFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por dia da semana
            </Typography>
            <FormControl size="small">
              <Select
                value={diaHorarioFilter || ''}
                onChange={(e) => handleDiaHorarioFilterChange(e.target.value)}
                sx={{ minWidth: 200 }}
                displayEmpty
              >
                <MenuItem value="">Todos</MenuItem>
                {diasSemanaOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
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
                value={diaHorarioSort}
                onChange={(e) => setDiaHorarioSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">Segunda → Domingo</MenuItem>
                <MenuItem value="desc">Domingo → Segunda</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

        {/* Importância Filter Popover */}
        <Popover
          open={Boolean(importanciaAnchorEl)}
          anchorEl={importanciaAnchorEl}
          onClose={handleImportanciaFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por importância
            </Typography>
            <FormControl size="small">
              <Select
                value={importanciaFilter || ''}
                onChange={(e) => handleImportanciaFilterChange(e.target.value)}
                sx={{ minWidth: 200 }}
                displayEmpty
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="alta">Alta</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="baixa">Baixa</MenuItem>
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={importanciaSort}
                onChange={(e) => setImportanciaSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">Baixa → Alta</MenuItem>
                <MenuItem value="desc">Alta → Baixa</MenuItem>
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