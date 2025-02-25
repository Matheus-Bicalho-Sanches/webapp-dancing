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

  // Estados para tarefas diárias
  const [dailyTasks, setDailyTasks] = useState([]);
  const [dailyTasksLoading, setDailyTasksLoading] = useState(true);
  const [openDailyDialog, setOpenDailyDialog] = useState(false);
  const [editingDailyTask, setEditingDailyTask] = useState(null);
  const [dailyFormData, setDailyFormData] = useState({
    descricao: '',
    status: 'Pendente'
  });

  // Estados para tarefas semanais
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [weeklyTasksLoading, setWeeklyTasksLoading] = useState(true);
  const [openWeeklyDialog, setOpenWeeklyDialog] = useState(false);
  const [editingWeeklyTask, setEditingWeeklyTask] = useState(null);
  const [weeklyFormData, setWeeklyFormData] = useState({
    descricao: '',
    diaDaSemana: 1, // 1-7 (Segunda a Domingo)
    status: 'Pendente',
    ultimaExecucao: null
  });

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

  // Carregar tarefas diárias
  useEffect(() => {
    const q = query(
        collection(db, 'tarefas_diarias'), 
        orderBy('descricao', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      setDailyTasks(tasksData);
      setDailyTasksLoading(false);
      
      // Verificar e resetar tarefas finalizadas quando os dados são carregados
      resetFinishedDailyTasks(tasksData);
    }, (error) => {
      console.error('Erro ao carregar tarefas diárias:', error);
      setDailyTasksLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Função para resetar tarefas diárias finalizadas
  const resetFinishedDailyTasks = async (tasks) => {
    try {
      // Verificar se o usuário está autenticado
      if (!currentUser) {
        console.log('Usuário não autenticado, não é possível resetar tarefas');
        return;
      }
      
      // Obter a data da última atualização do localStorage
      const lastResetDate = localStorage.getItem('lastDailyTasksResetDate');
      const today = dayjs().format('YYYY-MM-DD');
      
      // Se não houver data salva ou se a data for diferente da atual, resetar as tarefas
      if (!lastResetDate || lastResetDate !== today) {
        console.log('Resetando tarefas diárias finalizadas...');
        
        // Filtrar apenas as tarefas com status "Finalizada"
        const finishedTasks = tasks.filter(task => task.status === 'Finalizada');
        
        // Atualizar cada tarefa finalizada para "Pendente"
        for (const task of finishedTasks) {
          const taskRef = doc(db, 'tarefas_diarias', task.id);
          
          await updateDoc(taskRef, { 
            status: 'Pendente',
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
            resetedAt: serverTimestamp()
          });
          
          // Registrar log de atualização automática de status
          await addTaskLog('status-change', {
            ...task,
            oldStatus: 'Finalizada',
            newStatus: 'Pendente',
            taskType: 'diaria',
            automatic: true
          }, task.id);
        }
        
        // Salvar a data atual no localStorage
        localStorage.setItem('lastDailyTasksResetDate', today);
        
        if (finishedTasks.length > 0) {
          setSnackbar({
            open: true,
            message: `${finishedTasks.length} tarefa(s) diária(s) resetada(s) para "Pendente"`,
            severity: 'info'
          });
        }
      }
    } catch (error) {
      console.error('Erro ao resetar tarefas diárias:', error);
    }
  };

  // Verificar periodicamente se a data mudou para resetar tarefas diárias
  useEffect(() => {
    const currentTab = getCurrentTab();
    // Só executar se estiver na aba de tarefas diárias e houver tarefas carregadas
    if (currentTab === 1 && !dailyTasksLoading && dailyTasks.length > 0) {
      // Verificar a cada 5 minutos se a data mudou
      const intervalId = setInterval(() => {
        resetFinishedDailyTasks(dailyTasks);
      }, 5 * 60 * 1000); // 5 minutos em milissegundos
      
      return () => clearInterval(intervalId);
    }
  }, [location, dailyTasksLoading, dailyTasks, currentUser]);

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
      console.log(`[DEBUG] addTaskLog - action: ${action}, taskType: ${taskData.taskType}`);
      console.log('[DEBUG] taskData:', JSON.stringify({
        descricao: taskData.descricao,
        oldStatus: taskData.oldStatus,
        newStatus: taskData.newStatus,
        status: taskData.status
      }, null, 2));
      
      const logEntry = {
        action, // 'create', 'update', 'delete' ou 'status-change'
        taskId,
        taskDescription: taskData?.descricao,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
        taskType: taskData?.taskType || 'regular' // Identificar o tipo de tarefa (regular ou diária)
      };
      
      // Incluir oldStatus e newStatus no log independentemente da ação
      if (taskData.oldStatus && taskData.newStatus) {
        logEntry.oldStatus = taskData.oldStatus;
        logEntry.newStatus = taskData.newStatus;
      }
      
      // Processo padrão para action === 'status-change'
      if (action === 'status-change' && taskData) {
        // Verificar o tipo de tarefa e buscar a tarefa original correspondente
        if (taskData.taskType === 'diaria') {
          // Para tarefas diárias
          const originalTask = dailyTasks.find(task => task.id === taskId);
          if (originalTask) {
            logEntry.oldStatus = originalTask.status;
            logEntry.newStatus = taskData.newStatus || taskData.status;
          }
        } else if (taskData.taskType === 'semanal') {
          // Para tarefas semanais
          const originalTask = weeklyTasks.find(task => task.id === taskId);
          if (originalTask) {
            logEntry.oldStatus = originalTask.status;
            logEntry.newStatus = taskData.newStatus || taskData.status;
          }
        } else {
          // Para tarefas regulares
          const originalTask = tasks.find(task => task.id === taskId);
          if (originalTask) {
            logEntry.oldStatus = originalTask.status;
            logEntry.newStatus = taskData.newStatus || taskData.status;
          }
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
          await addTaskLog('update', {
            ...taskData,
            // Incluir status atual mesmo que não tenha mudado, para consistência nos logs
            oldStatus: editingTask.status,
            newStatus: formData.status
          }, editingTask.id);
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
    let taskTypeLabel = 'Tarefa';
    
    if (log.taskType === 'diaria') {
      taskTypeLabel = 'Tarefa Diária';
    } else if (log.taskType === 'semanal') {
      taskTypeLabel = 'Tarefa Semanal';
    }
    
    // Se temos informações sobre o status anterior e novo, exibi-los sempre
    if (log.oldStatus && log.newStatus) {
      if (action === 'update') {
        return `Editou ${taskTypeLabel} - Status: ${log.oldStatus} → ${log.newStatus}`;
      }
      
      if (action === 'status-change') {
        // Verificar se foi uma atualização automática
        if (log.automatic) {
          if (log.taskType === 'diaria') {
            return `Reset automático: ${log.oldStatus} → ${log.newStatus}`;
          } else if (log.taskType === 'semanal') {
            return `Reset semanal automático: ${log.oldStatus} → ${log.newStatus}`;
          }
          return `Reset automático: ${log.oldStatus} → ${log.newStatus}`;
        }
        
        // Mostrar alteração de status com a transição
        return `Alterou o status da ${taskTypeLabel}: ${log.oldStatus} → ${log.newStatus}`;
      }
    }
    
    // Casos onde não temos informações de status ou outros tipos de ação
    switch (action) {
      case 'create': 
        return `Criou ${taskTypeLabel}`;
      case 'update': 
        return `Editou ${taskTypeLabel}`;
      case 'delete': 
        return `Excluiu ${taskTypeLabel}`;
      case 'status-change':
        return `Alterou o status da ${taskTypeLabel}`;
      default: 
        return action;
    }
  };

  // Função para encontrar informações do usuário pelo ID
  const getUserInfo = (userId) => {
    const user = users.find(u => u.id === userId);
    return user || { name: 'Usuário desconhecido', profilePicture: null };
  };

  // Funções para tarefas diárias
  const handleOpenDailyDialog = (task = null) => {
    if (task) {
      setEditingDailyTask(task);
      setDailyFormData({
        descricao: task.descricao,
        status: task.status || 'Pendente'
      });
    } else {
      setEditingDailyTask(null);
      setDailyFormData({
        descricao: '',
        status: 'Pendente'
      });
    }
    setOpenDailyDialog(true);
  };

  const handleCloseDailyDialog = () => {
    setOpenDailyDialog(false);
    setEditingDailyTask(null);
  };

  const handleDailySubmit = async () => {
    try {
      if (!dailyFormData.descricao) {
        setSnackbar({
          open: true,
          message: 'Preencha a descrição da tarefa',
          severity: 'error'
        });
        return;
      }

      const taskData = {
        ...dailyFormData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editingDailyTask) {
        // Verificar se o status foi alterado
        const statusChanged = editingDailyTask.status !== dailyFormData.status;
        
        await updateDoc(doc(db, 'tarefas_diarias', editingDailyTask.id), taskData);
        
        // Registrar log de atualização
        if (statusChanged) {
          await addTaskLog('status-change', {
            ...taskData,
            oldStatus: editingDailyTask.status,
            newStatus: dailyFormData.status,
            taskType: 'diaria'
          }, editingDailyTask.id);
        } else {
          await addTaskLog('update', {
            ...taskData, 
            taskType: 'diaria',
            // Incluir status atual mesmo que não tenha mudado, para consistência nos logs
            oldStatus: editingDailyTask.status,
            newStatus: dailyFormData.status
          }, editingDailyTask.id);
        }
        
        setSnackbar({
          open: true,
          message: 'Tarefa diária atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        taskData.createdAt = serverTimestamp();
        taskData.createdBy = currentUser.uid;
        const docRef = await addDoc(collection(db, 'tarefas_diarias'), taskData);
        
        // Registrar log de criação
        await addTaskLog('create', {
          ...taskData, 
          taskType: 'diaria'
        }, docRef.id);
        
        setSnackbar({
          open: true,
          message: 'Tarefa diária criada com sucesso!',
          severity: 'success'
        });
      }

      handleCloseDailyDialog();
    } catch (error) {
      console.error('Erro ao salvar tarefa diária:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar tarefa diária. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleDailyDelete = async (taskId) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa diária?')) {
      try {
        const taskToDelete = dailyTasks.find(task => task.id === taskId);
        await deleteDoc(doc(db, 'tarefas_diarias', taskId));
        
        // Registrar log de exclusão
        await addTaskLog('delete', {
          ...taskToDelete, 
          taskType: 'diaria'
        }, taskId);
        
        setSnackbar({
          open: true,
          message: 'Tarefa diária excluída com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir tarefa diária:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir tarefa diária. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    }
  };

  const handleDailyStatusChange = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, 'tarefas_diarias', taskId);
      const taskToUpdate = dailyTasks.find(task => task.id === taskId);
      
      if (!taskToUpdate) {
        throw new Error('Tarefa diária não encontrada');
      }
      
      // Salvar o status anterior antes de atualizar
      const oldStatus = taskToUpdate.status;
      
      await updateDoc(taskRef, { 
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });
      
      // Registrar log de atualização de status
      await addTaskLog('status-change', {
        ...taskToUpdate,
        oldStatus: oldStatus,
        newStatus: newStatus,
        taskType: 'diaria'
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

  // Carregar tarefas semanais
  useEffect(() => {
    const q = query(
      collection(db, 'tarefas_semanais'), 
      orderBy('descricao', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWeeklyTasks(tasksData);
      setWeeklyTasksLoading(false);
      
      // Verificar e resetar tarefas semanais se necessário
      checkWeeklyTasksReset(tasksData);
    }, (error) => {
      console.error('Erro ao carregar tarefas semanais:', error);
      setWeeklyTasksLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Função para verificar e resetar tarefas semanais
  const checkWeeklyTasksReset = async (tasks) => {
    try {
      // Verificar se o usuário está autenticado
      if (!currentUser) {
        console.log('Usuário não autenticado, não é possível resetar tarefas semanais');
        return;
      }
      
      // Obter o dia da semana atual (1-7, onde 1 é Segunda-feira)
      const hoje = new Date();
      const diaDaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay(); // Converter 0 (Domingo) para 7
      
      // Filtrar tarefas que correspondem ao dia da semana atual e estão com status "Finalizada"
      const tasksThatNeedReset = tasks.filter(task => 
        task.diaDaSemana === diaDaSemana && 
        task.status === 'Finalizada' &&
        (!task.ultimaExecucao || 
          (task.ultimaExecucao.toDate && dayjs(task.ultimaExecucao.toDate()).format('YYYY-MM-DD') !== dayjs().format('YYYY-MM-DD')))
      );
      
      if (tasksThatNeedReset.length === 0) return;
      
      console.log(`Resetando ${tasksThatNeedReset.length} tarefas semanais para o dia ${getDiaSemanaTexto(diaDaSemana)}`);
      
      // Atualizar cada tarefa para "Pendente"
      for (const task of tasksThatNeedReset) {
        const taskRef = doc(db, 'tarefas_semanais', task.id);
        
        await updateDoc(taskRef, { 
          status: 'Pendente',
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid,
          resetedAt: serverTimestamp()
        });
        
        // Registrar log de atualização automática
        await addTaskLog('status-change', {
          ...task,
          oldStatus: 'Finalizada',
          newStatus: 'Pendente',
          taskType: 'semanal',
          automatic: true
        }, task.id);
      }
      
      if (tasksThatNeedReset.length > 0) {
        setSnackbar({
          open: true,
          message: `${tasksThatNeedReset.length} tarefa(s) semanal(is) resetada(s) para "Pendente"`,
          severity: 'info'
        });
      }
    } catch (error) {
      console.error('Erro ao resetar tarefas semanais:', error);
    }
  };

  // Verificar periodicamente se é necessário resetar tarefas semanais
  useEffect(() => {
    const currentTab = getCurrentTab();
    // Só executar se estiver na aba de tarefas semanais e houver tarefas carregadas
    if (currentTab === 2 && !weeklyTasksLoading && weeklyTasks.length > 0) {
      // Verificar a cada 5 minutos
      const intervalId = setInterval(() => {
        checkWeeklyTasksReset(weeklyTasks);
      }, 5 * 60 * 1000); // 5 minutos em milissegundos
      
      return () => clearInterval(intervalId);
    }
  }, [location, weeklyTasksLoading, weeklyTasks, currentUser]);

  // Funções para tarefas semanais
  const handleOpenWeeklyDialog = (task = null) => {
    if (task) {
      setEditingWeeklyTask(task);
      setWeeklyFormData({
        descricao: task.descricao,
        diaDaSemana: task.diaDaSemana || 1,
        status: task.status || 'Pendente',
        ultimaExecucao: task.ultimaExecucao || null
      });
    } else {
      setEditingWeeklyTask(null);
      setWeeklyFormData({
        descricao: '',
        diaDaSemana: 1,
        status: 'Pendente',
        ultimaExecucao: null
      });
    }
    setOpenWeeklyDialog(true);
  };

  const handleCloseWeeklyDialog = () => {
    setOpenWeeklyDialog(false);
    setEditingWeeklyTask(null);
  };

  const getDiaSemanaTexto = (diaDaSemana) => {
    const diasSemana = [
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
      'Domingo'
    ];
    return diasSemana[diaDaSemana - 1] || 'Dia inválido';
  };

  const formatUltimaExecucao = (timestamp) => {
    if (!timestamp) return 'Nunca executada';
    
    if (timestamp.toDate) {
      return dayjs(timestamp.toDate()).format('DD/MM/YYYY');
    }
    
    return dayjs(timestamp).format('DD/MM/YYYY');
  };

  const handleWeeklySubmit = async () => {
    try {
      if (!weeklyFormData.descricao) {
        setSnackbar({
          open: true,
          message: 'Preencha a descrição da tarefa',
          severity: 'error'
        });
        return;
      }

      const taskData = {
        ...weeklyFormData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editingWeeklyTask) {
        // Verificar se o status foi alterado
        const statusChanged = editingWeeklyTask.status !== weeklyFormData.status;
        
        console.log(`[DEBUG] Editando tarefa semanal - ID: ${editingWeeklyTask.id}, statusChanged: ${statusChanged}`);
        console.log(`[DEBUG] Status atual: ${editingWeeklyTask.status}, Novo status: ${weeklyFormData.status}`);
        
        await updateDoc(doc(db, 'tarefas_semanais', editingWeeklyTask.id), taskData);
        
        // Registrar log de atualização
        if (statusChanged) {
          await addTaskLog('status-change', {
            ...taskData,
            oldStatus: editingWeeklyTask.status,
            newStatus: weeklyFormData.status,
            taskType: 'semanal'
          }, editingWeeklyTask.id);
        } else {
          await addTaskLog('update', {
            ...taskData, 
            taskType: 'semanal',
            // Incluir status atual mesmo que não tenha mudado, para consistência nos logs
            oldStatus: editingWeeklyTask.status,
            newStatus: weeklyFormData.status
          }, editingWeeklyTask.id);
        }
        
        setSnackbar({
          open: true,
          message: 'Tarefa semanal atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        taskData.createdAt = serverTimestamp();
        taskData.createdBy = currentUser.uid;
        const docRef = await addDoc(collection(db, 'tarefas_semanais'), taskData);
        
        // Registrar log de criação
        await addTaskLog('create', {
          ...taskData, 
          taskType: 'semanal'
        }, docRef.id);
        
        setSnackbar({
          open: true,
          message: 'Tarefa semanal criada com sucesso!',
          severity: 'success'
        });
      }

      handleCloseWeeklyDialog();
    } catch (error) {
      console.error('Erro ao salvar tarefa semanal:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar tarefa semanal. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleWeeklyDelete = async (taskId) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa semanal?')) {
      try {
        const taskToDelete = weeklyTasks.find(task => task.id === taskId);
        await deleteDoc(doc(db, 'tarefas_semanais', taskId));
        
        // Registrar log de exclusão
        await addTaskLog('delete', {
          ...taskToDelete, 
          taskType: 'semanal'
        }, taskId);
        
        setSnackbar({
          open: true,
          message: 'Tarefa semanal excluída com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir tarefa semanal:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir tarefa semanal. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    }
  };

  const handleWeeklyStatusChange = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, 'tarefas_semanais', taskId);
      const taskToUpdate = weeklyTasks.find(task => task.id === taskId);
      
      if (!taskToUpdate) {
        throw new Error('Tarefa semanal não encontrada');
      }
      
      // Salvar o status anterior antes de atualizar
      const oldStatus = taskToUpdate.status;
      
      console.log(`[DEBUG] Alterando status da tarefa semanal - ID: ${taskId}, oldStatus: ${oldStatus}, newStatus: ${newStatus}`);
      
      // Se o status mudar para "Finalizada", registrar a data atual como última execução
      const updateData = { 
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      if (newStatus === 'Finalizada') {
        updateData.ultimaExecucao = serverTimestamp();
      }
      
      await updateDoc(taskRef, updateData);
      
      // Registrar log de atualização de status
      await addTaskLog('status-change', {
        ...taskToUpdate,
        oldStatus: oldStatus,
        newStatus: newStatus,
        taskType: 'semanal'
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

        {/* Aba de Tarefas Diárias */}
        {getCurrentTab() === 1 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDailyDialog()}
              >
                Nova Tarefa Diária
              </Button>
            </Box>

            {dailyTasksLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Descrição</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dailyTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.descricao}</TableCell>
                        <TableCell>
                          <Select
                            value={task.status || 'Pendente'}
                            onChange={(e) => handleDailyStatusChange(task.id, e.target.value)}
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
                            onClick={() => handleOpenDailyDialog(task)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          {hasDeletePermission && (
                            <IconButton
                              color="error"
                              onClick={() => handleDailyDelete(task.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {dailyTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          Nenhuma tarefa diária encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {/* Aba de Tarefas Semanais */}
        {getCurrentTab() === 2 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenWeeklyDialog()}
              >
                Nova Tarefa Semanal
              </Button>
            </Box>

            {weeklyTasksLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Descrição</TableCell>
                      <TableCell>Dia da Semana</TableCell>
                      <TableCell>Feito em</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {weeklyTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.descricao}</TableCell>
                        <TableCell>{getDiaSemanaTexto(task.diaDaSemana)}</TableCell>
                        <TableCell>{formatUltimaExecucao(task.ultimaExecucao)}</TableCell>
                        <TableCell>
                          <Select
                            value={task.status || 'Pendente'}
                            onChange={(e) => handleWeeklyStatusChange(task.id, e.target.value)}
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
                            onClick={() => handleOpenWeeklyDialog(task)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          {hasDeletePermission && (
                            <IconButton
                              color="error"
                              onClick={() => handleWeeklyDelete(task.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {weeklyTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Nenhuma tarefa semanal encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
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

        {/* Dialog para adicionar/editar tarefa diária */}
        <Dialog
          open={openDailyDialog}
          onClose={handleCloseDailyDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingDailyTask ? 'Editar Tarefa Diária' : 'Nova Tarefa Diária'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Descrição"
                value={dailyFormData.descricao}
                onChange={(e) => setDailyFormData({ ...dailyFormData, descricao: e.target.value })}
                required
                multiline
                rows={2}
              />

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={dailyFormData.status}
                  onChange={(e) => setDailyFormData({ ...dailyFormData, status: e.target.value })}
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
            <Button onClick={handleCloseDailyDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleDailySubmit}
              variant="contained"
              disabled={!dailyFormData.descricao}
            >
              {editingDailyTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para adicionar/editar tarefa semanal */}
        <Dialog
          open={openWeeklyDialog}
          onClose={handleCloseWeeklyDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingWeeklyTask ? 'Editar Tarefa Semanal' : 'Nova Tarefa Semanal'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Descrição"
                value={weeklyFormData.descricao}
                onChange={(e) => setWeeklyFormData({ ...weeklyFormData, descricao: e.target.value })}
                required
                multiline
                rows={2}
              />

              <FormControl fullWidth required>
                <InputLabel>Dia da Semana</InputLabel>
                <Select
                  value={weeklyFormData.diaDaSemana}
                  onChange={(e) => setWeeklyFormData({ ...weeklyFormData, diaDaSemana: e.target.value })}
                  label="Dia da Semana"
                >
                  <MenuItem value={1}>Segunda-feira</MenuItem>
                  <MenuItem value={2}>Terça-feira</MenuItem>
                  <MenuItem value={3}>Quarta-feira</MenuItem>
                  <MenuItem value={4}>Quinta-feira</MenuItem>
                  <MenuItem value={5}>Sexta-feira</MenuItem>
                  <MenuItem value={6}>Sábado</MenuItem>
                  <MenuItem value={7}>Domingo</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={weeklyFormData.status}
                  onChange={(e) => setWeeklyFormData({ ...weeklyFormData, status: e.target.value })}
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
            <Button onClick={handleCloseWeeklyDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleWeeklySubmit}
              variant="contained"
              disabled={!weeklyFormData.descricao}
            >
              {editingWeeklyTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
} 