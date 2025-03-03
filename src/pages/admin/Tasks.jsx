import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
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
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
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
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

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
    ultimaExecucao: null,
    observacoes: ''
  });

  // Estados para tarefas mensais
  const [monthlyTasks, setMonthlyTasks] = useState([]);
  const [monthlyTasksLoading, setMonthlyTasksLoading] = useState(true);
  const [openMonthlyDialog, setOpenMonthlyDialog] = useState(false);
  const [editingMonthlyTask, setEditingMonthlyTask] = useState(null);
  const [monthlyFormData, setMonthlyFormData] = useState({
    descricao: '',
    diaDoMes: 1, // 1-31 (Dia do mês)
    status: 'Pendente',
    ultimaExecucao: null,
    observacoes: ''
  });

  // Estados para tarefas técnicas
  const [technicalTasks, setTechnicalTasks] = useState([]);
  const [filteredTechnicalTasks, setFilteredTechnicalTasks] = useState([]);
  const [technicalTasksLoading, setTechnicalTasksLoading] = useState(true);
  const [openTechnicalDialog, setOpenTechnicalDialog] = useState(false);
  const [editingTechnicalTask, setEditingTechnicalTask] = useState(null);
  const [showCompletedTechnicalTasks, setShowCompletedTechnicalTasks] = useState(false);
  const [technicalResponsibleFilter, setTechnicalResponsibleFilter] = useState('all');
  const [technicalStatusFilter, setTechnicalStatusFilter] = useState('all');
  const [technicalDeadlineSort, setTechnicalDeadlineSort] = useState('asc');
  const [technicalFormData, setTechnicalFormData] = useState({
    descricao: '',
    responsavel: [],
    prazoLimite: dayjs().format('YYYY-MM-DD'),
    observacoes: '',
    status: 'Pendente'
  });

  // Estados para tarefas por horário
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledTasksLoading, setScheduledTasksLoading] = useState(true);
  const [openScheduledDialog, setOpenScheduledDialog] = useState(false);
  const [editingScheduledTask, setEditingScheduledTask] = useState(null);
  const [scheduledFormData, setScheduledFormData] = useState({
    descricao: '',
    diasDaSemana: [], // Array com os dias da semana (1-7)
    horario: '08:00', // Horário no formato HH:MM
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
          await addTaskLog('status_change_daily', {
            id: task.id,
            descricao: task.descricao,
            oldStatus: 'AUTO-RESET',
            newStatus: 'Pendente',
            taskType: 'diaria',
            automatic: true
          }, 'Finalizada', 'Pendente');
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

  // Função para adicionar um log de tarefa
  const addTaskLog = async (action, task, oldStatus, newStatus) => {
    try {
      const taskDoc = doc(db, 'task_logs', uuidv4());
      
      // Determinar o tipo de tarefa e detalhes relevantes
      let details = {};
      
      if (action.includes('daily') || task.taskType === 'diaria') {
        details.taskType = 'diaria';
      } else if (action.includes('weekly') || task.taskType === 'semanal') {
        details.taskType = 'semanal';
        details.diaDaSemana = task.diaDaSemana;
      } else if (action.includes('monthly') || task.taskType === 'mensal') {
        details.taskType = 'mensal';
        details.diaDoMes = task.diaDoMes;
      } else if (action.includes('scheduled') || task.taskType === 'agendada') {
        details.taskType = 'agendada';
        details.diasDaSemana = task.diasDaSemana;
        details.horario = task.horario;
      } else if (action.includes('technical') || task.taskType === 'tecnica') {
        details.taskType = 'tecnica';
        details.responsavel = task.responsavel;
        details.prazoLimite = task.prazoLimite;
        details.observacoes = task.observacoes;
        details.status = task.status;
      } else {
        details.taskType = 'nao_recorrente';
      }
      
      // Adicionar status antigo e novo aos detalhes, se disponíveis
      if (oldStatus) details.oldStatus = oldStatus;
      if (newStatus) details.newStatus = newStatus;
      
      // Se a ação é uma alteração de status, verificar o status original da tarefa
      if (action === 'status-change' || action.includes('status_change')) {
        // Dependendo do tipo de tarefa, buscamos o original em arrays diferentes
        let originalTask;
        
        if (details.taskType === 'diaria') {
          originalTask = dailyTasks.find(t => t.id === task.id);
        } else if (details.taskType === 'semanal') {
          originalTask = weeklyTasks.find(t => t.id === task.id);
        } else if (details.taskType === 'mensal') {
          originalTask = monthlyTasks.find(t => t.id === task.id);
        } else if (details.taskType === 'agendada') {
          originalTask = scheduledTasks.find(t => t.id === task.id);
        } else if (details.taskType === 'tecnica') {
          originalTask = technicalTasks.find(t => t.id === task.id);
        } else {
          originalTask = tasks.find(t => t.id === task.id);
        }
        
        if (originalTask && !details.oldStatus) {
          details.oldStatus = originalTask.status || 'Pendente';
        }
      }
      
      // Garantir que temos informações do usuário
      const userName = currentUser.displayName || currentUser.email || 'Usuário';
      
      const logEntry = {
        action,
        taskId: task.id,
        taskDescription: task.descricao,
        userId: currentUser.uid,
        userName: userName,
        user: {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: userName
        },
        timestamp: serverTimestamp(),
        details
      };
      
      await setDoc(taskDoc, logEntry);
    } catch (error) {
      console.error('Erro ao adicionar log:', error);
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

  // Função para obter a cor baseada no status da tarefa
  const getStatusColorByName = (status) => {
    switch (status) {
      case 'Pendente':
        return 'warning'; // Amarelo
      case 'Em andamento':
        return 'primary'; // Azul
      case 'Finalizada':
        return 'success'; // Verde
      case 'Aguardando':
        return 'default'; // Cinza
      case 'Urgente':
        return 'error'; // Vermelho
      default:
        return 'default';
    }
  };

  // Função para determinar qual aba está ativa baseado na URL
  const getCurrentTab = () => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    switch (tab) {
      case 'nao_recorrente':
        return 0;
      case 'tecnico':
        return 1;
      case 'diaria':
        return 2;
      case 'semanal':
        return 3;
      case 'mensal':
        return 4;
      case 'por_horario':
        return 5;
      case 'logs':
        return 6;
      default:
        return 0;
    }
  };

  // Função para navegar entre as abas
  const handleTabChange = (event, newValue) => {
    const tabPaths = [
      '/admin/tarefas?tab=nao_recorrente',
      '/admin/tarefas?tab=tecnico',
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
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return dayjs(date).format('DD/MM/YYYY HH:mm');
  };

  // Função para formatar o nome da ação no log
  const getActionName = (log) => {
    let taskTypeLabel = '';
    
    if (log.action.includes('daily')) {
      taskTypeLabel = 'diária';
    } else if (log.action.includes('weekly')) {
      taskTypeLabel = 'semanal';
    } else if (log.action.includes('monthly')) {
      taskTypeLabel = 'mensal';
    } else if (log.action.includes('scheduled')) {
      taskTypeLabel = 'por horário';
    } else if (log.action.includes('technical')) {
      taskTypeLabel = 'técnica';
    } else {
      taskTypeLabel = 'não recorrente';
    }

    // Detectar tipo de tarefa pelos detalhes, se disponível
    if (log.details?.taskType === 'diaria') {
      taskTypeLabel = 'diária';
    } else if (log.details?.taskType === 'semanal') {
      taskTypeLabel = 'semanal';
    } else if (log.details?.taskType === 'mensal') {
      taskTypeLabel = 'mensal';
    } else if (log.details?.taskType === 'agendada') {
      taskTypeLabel = 'por horário';
    } else if (log.details?.taskType === 'tecnica') {
      taskTypeLabel = 'técnica';
    }

    if (log.action === 'create' || log.action === 'create_daily' || log.action === 'create_weekly' || log.action === 'create_monthly' || log.action === 'create_scheduled' || log.action === 'create_technical') {
      if (log.action === 'create_technical' && log.details?.taskType === 'tecnica') {
        const responsaveis = log.details.responsavel ? 
          (Array.isArray(log.details.responsavel) ? 
            log.details.responsavel.map(userId => users.find(u => u.id === userId)?.nome || userId).join(', ') : 
            log.details.responsavel) : 
          'Não especificado';
        
        const prazo = log.details.prazoLimite ? 
          (log.details.prazoLimite instanceof Date || typeof log.details.prazoLimite.toDate === 'function' ? 
            dayjs(log.details.prazoLimite.toDate()).format('DD/MM/YYYY') : 
            typeof log.details.prazoLimite === 'string' ? log.details.prazoLimite : 'Não especificado') : 
          'Não especificado';
        
        return `Criou tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" - Responsável: ${responsaveis} - Prazo: ${prazo}`;
      }
      return `Criou tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}"`;
    }

    if (log.action === 'update' || log.action === 'update_daily' || log.action === 'update_weekly' || log.action === 'edit_monthly' || log.action === 'edit_scheduled' || log.action === 'update_technical') {
      if (log.action === 'update_technical' && log.details?.taskType === 'tecnica') {
        const responsaveis = log.details.responsavel ? 
          (Array.isArray(log.details.responsavel) ? 
            log.details.responsavel.map(userId => users.find(u => u.id === userId)?.nome || userId).join(', ') : 
            log.details.responsavel) : 
          'Não especificado';
        
        const prazo = log.details.prazoLimite ? 
          (log.details.prazoLimite instanceof Date || typeof log.details.prazoLimite.toDate === 'function' ? 
            dayjs(log.details.prazoLimite.toDate()).format('DD/MM/YYYY') : 
            typeof log.details.prazoLimite === 'string' ? log.details.prazoLimite : 'Não especificado') : 
          'Não especificado';
        
        return `Editou tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" - Responsável: ${responsaveis} - Prazo: ${prazo}`;
      }
      return `Editou tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}"`;
    }

    if (log.action === 'delete' || log.action === 'delete_daily' || log.action === 'delete_weekly' || log.action === 'delete_monthly' || log.action === 'delete_scheduled' || log.action === 'delete_technical') {
      if (log.action === 'delete_technical' && log.details?.taskType === 'tecnica') {
        const responsaveis = log.details.responsavel ? 
          (Array.isArray(log.details.responsavel) ? 
            log.details.responsavel.map(userId => users.find(u => u.id === userId)?.nome || userId).join(', ') : 
            log.details.responsavel) : 
          'Não especificado';
        
        return `Excluiu tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" - Responsável: ${responsaveis}`;
      }
      return `Excluiu tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}"`;
    }

    if (log.action === 'status-change' || log.action === 'status_change_daily' || log.action === 'status_change_weekly' || log.action === 'status_change_monthly' || log.action === 'status_change_scheduled' || log.action === 'status_change_technical') {
      if (log.details && log.details.oldStatus && log.details.newStatus) {
        if (log.details.oldStatus === 'AUTO-RESET' && log.details.taskType === 'diaria') {
          return `Resetou automaticamente tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}"`;
        } else if (log.details.oldStatus === 'AUTO-RESET' && log.details.taskType === 'semanal') {
          return `Resetou automaticamente tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" (${log.details.diaDaSemana})`;
        } else if (log.details.oldStatus === 'AUTO-RESET' && log.details.taskType === 'mensal') {
          return `Resetou automaticamente tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" (dia ${log.details.diaDoMes})`;
        } else if (log.details.oldStatus === 'AUTO-RESET' && log.details.taskType === 'agendada') {
          const diasFormatados = formatDiasDaSemana(log.details.diasDaSemana);
          return `Resetou automaticamente tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" (${diasFormatados}, ${log.details.horario})`;
        } else if (log.action === 'status_change_technical' && log.details.taskType === 'tecnica') {
          const responsaveis = log.details.responsavel ? 
            (Array.isArray(log.details.responsavel) ? 
              log.details.responsavel.map(userId => users.find(u => u.id === userId)?.nome || userId).join(', ') : 
              log.details.responsavel) : 
            'Não especificado';
          
          const prazo = log.details.prazoLimite ? 
            (log.details.prazoLimite instanceof Date || typeof log.details.prazoLimite.toDate === 'function' ? 
              dayjs(log.details.prazoLimite.toDate()).format('DD/MM/YYYY') : 
              typeof log.details.prazoLimite === 'string' ? log.details.prazoLimite : 'Não especificado') : 
            'Não especificado';
          
          if (log.details.newStatus === 'Finalizada') {
            return `Marcou como concluída tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" - Responsável: ${responsaveis} - Prazo: ${prazo}`;
          } else if (log.details.newStatus === 'Pendente' && log.details.oldStatus === 'Finalizada') {
            return `Desmarcou como concluída tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" - Responsável: ${responsaveis} - Prazo: ${prazo}`;
          } else {
            return `Alterou status da tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" de "${log.details.oldStatus}" para "${log.details.newStatus}" - Responsável: ${responsaveis} - Prazo: ${prazo}`;
          }
        } else if (log.details.taskType === 'diaria') {
          if (log.details.newStatus === 'Finalizada') {
            return `Marcou como concluída tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}"`;
          } else if (log.details.newStatus === 'Pendente') {
            return `Desmarcou como concluída tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}"`;
          } else {
            return `Alterou status da tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" de "${log.details.oldStatus}" para "${log.details.newStatus}"`;
          }
        } else if (log.details.taskType === 'semanal') {
          return `Alterou status da tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" (${log.details.diaDaSemana}) de "${log.details.oldStatus}" para "${log.details.newStatus}"`;
        } else if (log.details.taskType === 'mensal') {
          return `Alterou status da tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" (dia ${log.details.diaDoMes}) de "${log.details.oldStatus}" para "${log.details.newStatus}"`;
        } else if (log.details.taskType === 'agendada') {
          const diasFormatados = formatDiasDaSemana(log.details.diasDaSemana);
          return `Alterou status da tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" (${diasFormatados}, ${log.details.horario}) de "${log.details.oldStatus}" para "${log.details.newStatus}"`;
        } else if (log.details.taskType === 'tecnica' && !log.action.includes('technical')) {
          // Skip this case as it's handled by the action === 'status_change_technical' case above
          return `Alterou status da tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" de "${log.details.oldStatus}" para "${log.details.newStatus}"`;
        } else {
          return `Alterou status da tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}" de "${log.details.oldStatus}" para "${log.details.newStatus}"`;
        }
      } else {
        return `Alterou status da tarefa ${taskTypeLabel}: "${log.taskDescription || log.descricao}"`;
      }
    }

    if (log.action === 'reset_daily') {
      return `Resetou tarefa diária: "${log.descricao}"`;
    }

    if (log.action === 'reset_weekly') {
      if (log.details && log.details.diaDaSemana) {
        return `Resetou tarefa semanal: "${log.descricao}" (${log.details.diaDaSemana})`;
      } else {
        return `Resetou tarefa semanal: "${log.descricao}"`;
      }
    }

    if (log.action === 'reset_monthly') {
      if (log.details && log.details.diaDoMes) {
        return `Resetou tarefa mensal: "${log.descricao}" (dia ${log.details.diaDoMes})`;
      } else {
        return `Resetou tarefa mensal: "${log.descricao}"`;
      }
    }

    return log.action;
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
      const oldStatus = taskToUpdate.status || 'Pendente';
      
      // Se o novo status for "Finalizada", atualizar também a data de última execução
      const updates = { 
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      // Se a tarefa estiver sendo marcada como finalizada, atualizar a data de última execução
      if (newStatus === 'Finalizada') {
        updates.ultimaExecucao = serverTimestamp();
      }
      
      await updateDoc(taskRef, updates);
      
      // Registrar log de atualização de status
      await addTaskLog('status_change_daily', {
        id: taskId,
        descricao: taskToUpdate.descricao,
        oldStatus: oldStatus,
        newStatus: newStatus,
        taskType: 'diaria'
      }, oldStatus, newStatus);
      
      setSnackbar({
        open: true,
        message: newStatus === 'Finalizada' ? 'Tarefa marcada como concluída!' : 'Tarefa marcada como pendente!',
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
      
      // Verificar e resetar tarefas finalizadas quando os dados são carregados
      resetFinishedWeeklyTasks(tasksData);
    }, (error) => {
      console.error('Erro ao carregar tarefas semanais:', error);
      setWeeklyTasksLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Função para resetar tarefas semanais finalizadas
  const resetFinishedWeeklyTasks = async (tasks) => {
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
        resetFinishedWeeklyTasks(weeklyTasks);
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
        ultimaExecucao: task.ultimaExecucao || null,
        observacoes: task.observacoes || ''
      });
    } else {
      setEditingWeeklyTask(null);
      setWeeklyFormData({
        descricao: '',
        diaDaSemana: 1,
        status: 'Pendente',
        ultimaExecucao: null,
        observacoes: ''
      });
    }
    setOpenWeeklyDialog(true);
  };

  const handleCloseWeeklyDialog = () => {
    setOpenWeeklyDialog(false);
    setEditingWeeklyTask(null);
  };

  // Função para obter nome do dia da semana
  const getDiaSemanaTexto = (dia) => {
    const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    // Ajustando índice para o formato usado (1 = Segunda, 7 = Domingo)
    return diasSemana[(dia % 7) || 0];
  };

  // Função para formatar texto de "Feito em"
  const formatUltimaExecucao = (timestamp) => {
    if (!timestamp) return "Nunca";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return dayjs(date).format('DD/MM/YYYY HH:mm');
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

  // Carregar tarefas mensais
  useEffect(() => {
    const q = query(
        collection(db, 'tarefas_mensais'), 
        orderBy('descricao', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      setMonthlyTasks(tasksData);
      setMonthlyTasksLoading(false);
      
      // Verificar e resetar tarefas finalizadas quando os dados são carregados
      resetFinishedMonthlyTasks(tasksData);
    }, (error) => {
      console.error('Erro ao carregar tarefas mensais:', error);
      setMonthlyTasksLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Carregar tarefas técnicas
  useEffect(() => {
    const q = query(
        collection(db, 'tarefas_tecnicas'), 
        orderBy('prazoLimite', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      setTechnicalTasks(tasksData);
      setTechnicalTasksLoading(false);
    }, (error) => {
      console.error('Erro ao carregar tarefas técnicas:', error);
      setTechnicalTasksLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Carregar tarefas por horário
  useEffect(() => {
    const q = query(
        collection(db, 'tarefas_por_horario'), 
        orderBy('descricao', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      setScheduledTasks(tasksData);
      setScheduledTasksLoading(false);
    }, (error) => {
      console.error('Erro ao carregar tarefas por horário:', error);
      setScheduledTasksLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Função para resetar tarefas mensais finalizadas
  const resetFinishedMonthlyTasks = async (tasks) => {
    try {
      // Verificar se o usuário está autenticado
      if (!currentUser) {
        console.log('Usuário não autenticado, não é possível resetar tarefas');
        return;
      }
      
      const today = new Date();
      const currentDayOfMonth = today.getDate();
      
      // Filtrar tarefas que devem ser resetadas
      // Uma tarefa deve ser resetada se:
      // 1. Seu status for "Finalizada"
      // 2. Hoje for o dia do mês correspondente à tarefa
      // 3. A tarefa não foi finalizada hoje
      const tasksToReset = tasks.filter(task => {
        // Verificar se o status é "Finalizada"
        if (task.status !== 'Finalizada') return false;
        
        // Verificar se hoje é o dia do mês para esta tarefa
        if (task.diaDoMes !== currentDayOfMonth) return false;
        
        // Verificar se a tarefa já foi finalizada hoje
        if (task.ultimaExecucao) {
          const lastExecution = task.ultimaExecucao.toDate ? task.ultimaExecucao.toDate() : new Date(task.ultimaExecucao);
          const lastExecutionDay = lastExecution.getDate();
          const lastExecutionMonth = lastExecution.getMonth();
          const lastExecutionYear = lastExecution.getFullYear();
          
          const isToday = 
            lastExecutionDay === today.getDate() && 
            lastExecutionMonth === today.getMonth() && 
            lastExecutionYear === today.getFullYear();
            
          if (isToday) return false;
        }
        
        return true;
      });
      
      // Resetar tarefas
      for (const task of tasksToReset) {
        await updateDoc(doc(db, 'tarefas_mensais', task.id), {
          status: 'Pendente',
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        });
        
        // Registrar log usando a função addTaskLog
        await addTaskLog('reset_monthly', {
          ...task,
          taskType: 'mensal',
          oldStatus: 'Finalizada',
          newStatus: 'Pendente'
        }, task.id);
      }
      
      if (tasksToReset.length > 0) {
        console.log(`Reset de ${tasksToReset.length} tarefas mensais realizado com sucesso.`);
      }
    } catch (error) {
      console.error('Erro ao resetar tarefas mensais:', error);
    }
  };

  // Funções para tarefas mensais
  const handleOpenMonthlyDialog = (task = null) => {
    if (task) {
      setEditingMonthlyTask(task);
      setMonthlyFormData({
        descricao: task.descricao,
        diaDoMes: task.diaDoMes,
        status: task.status || 'Pendente',
        ultimaExecucao: task.ultimaExecucao,
        observacoes: task.observacoes || ''
      });
    } else {
      setEditingMonthlyTask(null);
      setMonthlyFormData({
        descricao: '',
        diaDoMes: 1,
        status: 'Pendente',
        ultimaExecucao: null,
        observacoes: ''
      });
    }
    setOpenMonthlyDialog(true);
  };

  const handleCloseMonthlyDialog = () => {
    setOpenMonthlyDialog(false);
    setEditingMonthlyTask(null);
  };

  const handleMonthlySubmit = async () => {
    try {
      // Validar formulário
      if (!monthlyFormData.descricao) {
        setSnackbar({
          open: true,
          message: 'Por favor, preencha a descrição da tarefa.',
          severity: 'error'
        });
        return;
      }

      if (monthlyFormData.diaDoMes < 1 || monthlyFormData.diaDoMes > 31) {
        setSnackbar({
          open: true,
          message: 'O dia do mês deve estar entre 1 e 31.',
          severity: 'error'
        });
        return;
      }

      // Dados comuns para criar ou atualizar
      const taskData = {
        descricao: monthlyFormData.descricao,
        diaDoMes: Number(monthlyFormData.diaDoMes),
        status: monthlyFormData.status,
        observacoes: monthlyFormData.observacoes,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      // Se estiver editando uma tarefa existente
      if (editingMonthlyTask) {
        await updateDoc(doc(db, 'tarefas_mensais', editingMonthlyTask.id), taskData);
        
        // Registrar log usando a função addTaskLog
        await addTaskLog('edit_monthly', {
          ...taskData,
          id: editingMonthlyTask.id,
          taskType: 'mensal',
          oldDescription: editingMonthlyTask.descricao,
          newDescription: monthlyFormData.descricao,
          oldDiaDoMes: editingMonthlyTask.diaDoMes,
          newDiaDoMes: Number(monthlyFormData.diaDoMes),
          oldStatus: editingMonthlyTask.status,
          newStatus: monthlyFormData.status
        }, editingMonthlyTask.status, monthlyFormData.status);
        
        setSnackbar({
          open: true,
          message: 'Tarefa mensal atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        // Se estiver criando uma nova tarefa
        const newTaskData = {
          ...taskData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        };
        
        const docRef = await addDoc(collection(db, 'tarefas_mensais'), newTaskData);
        
        // Registrar log usando a função addTaskLog
        await addTaskLog('create_monthly', {
          ...newTaskData,
          id: docRef.id,
          taskType: 'mensal'
        }, null, newTaskData.status);
        
        setSnackbar({
          open: true,
          message: 'Tarefa mensal criada com sucesso!',
          severity: 'success'
        });
      }
      
      handleCloseMonthlyDialog();
    } catch (error) {
      console.error('Erro ao salvar tarefa mensal:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar tarefa mensal. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleMonthlyDelete = async (taskId) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa mensal?')) {
      try {
        // Obter os dados da tarefa antes de excluir
        const taskDoc = doc(db, 'tarefas_mensais', taskId);
        const taskSnapshot = await getDoc(taskDoc);
        const taskData = taskSnapshot.data();
        
        // Excluir a tarefa
        await deleteDoc(taskDoc);
        
        // Registrar log usando a função addTaskLog
        await addTaskLog('delete_monthly', {
          ...taskData,
          id: taskId,
          taskType: 'mensal'
        }, taskData.status, null);
        
        setSnackbar({
          open: true,
          message: 'Tarefa mensal excluída com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir tarefa mensal:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir tarefa mensal. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    }
  };

  const handleMonthlyStatusChange = async (taskId, newStatus) => {
    try {
      // Obter os dados da tarefa antes de atualizar
      const taskDoc = doc(db, 'tarefas_mensais', taskId);
      const taskSnapshot = await getDoc(taskDoc);
      const taskData = taskSnapshot.data();
      
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      // Se o status for "Finalizada", atualizar o campo ultimaExecucao
      if (newStatus === 'Finalizada') {
        updateData.ultimaExecucao = serverTimestamp();
      }
      
      // Atualizar a tarefa
      await updateDoc(taskDoc, updateData);
      
      // Registrar log usando a função addTaskLog
      await addTaskLog('status_change_monthly', {
        ...taskData,
        id: taskId,
        taskType: 'mensal',
        status: newStatus
      }, taskData.status, newStatus);
      
      setSnackbar({
        open: true,
        message: `Status da tarefa mensal alterado para ${newStatus}!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao alterar status da tarefa mensal:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao alterar status da tarefa mensal. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  // Funções para tarefas por horário
  const handleOpenScheduledDialog = (task = null) => {
    if (task) {
      setEditingScheduledTask(task);
      setScheduledFormData({
        descricao: task.descricao,
        diasDaSemana: task.diasDaSemana || [],
        horario: task.horario || '08:00',
        status: task.status || 'Pendente'
      });
    } else {
      setEditingScheduledTask(null);
      setScheduledFormData({
        descricao: '',
        diasDaSemana: [],
        horario: '08:00',
        status: 'Pendente',
        ultimaExecucao: null
      });
    }
    setOpenScheduledDialog(true);
  };

  const handleCloseScheduledDialog = () => {
    setOpenScheduledDialog(false);
    setEditingScheduledTask(null);
  };

  // Função auxiliar para formatar os dias da semana
  const formatDiasDaSemana = (dias) => {
    if (!dias || !Array.isArray(dias) || dias.length === 0) return 'Nenhum';
    
    // Converter dias numéricos em nomes, se necessário
    const diasNomes = {
      1: 'Segunda',
      2: 'Terça',
      3: 'Quarta',
      4: 'Quinta',
      5: 'Sexta',
      6: 'Sábado',
      7: 'Domingo',
      '1': 'Segunda',
      '2': 'Terça',
      '3': 'Quarta',
      '4': 'Quinta',
      '5': 'Sexta',
      '6': 'Sábado',
      '7': 'Domingo'
    };
    
    // Verificar se dias contém números e converter para nomes
    const diasFormatados = dias.map(dia => {
      if (typeof dia === 'number' || (typeof dia === 'string' && !isNaN(parseInt(dia)))) {
        return diasNomes[dia] || dia;
      }
      return dia;
    });
    
    // Se forem todos os dias da semana, abreviar
    if (diasFormatados.length === 7) {
      return 'Todos os dias';
    }
    
    // Se forem todos os dias úteis
    const diasUteis = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    if (diasUteis.every(dia => diasFormatados.includes(dia)) && diasFormatados.length === 5) {
      return 'Dias úteis';
    }
    
    // Ordenar dias da semana em ordem lógica
    const diasOrdem = {
      'Domingo': 0,
      'Segunda': 1,
      'Terça': 2,
      'Quarta': 3,
      'Quinta': 4,
      'Sexta': 5,
      'Sábado': 6
    };
    
    const diasOrdenados = [...diasFormatados].sort((a, b) => diasOrdem[a] - diasOrdem[b]);
    
    // Exibir todos os dias da semana, independentemente da quantidade
    return diasOrdenados.join(', ');
  };

  const handleScheduledSubmit = async () => {
    try {
      // Validar formulário
      if (!scheduledFormData.descricao) {
        setSnackbar({
          open: true,
          message: 'Por favor, preencha a descrição da tarefa.',
          severity: 'error'
        });
        return;
      }

      if (!scheduledFormData.diasDaSemana || scheduledFormData.diasDaSemana.length === 0) {
        setSnackbar({
          open: true,
          message: 'Por favor, selecione pelo menos um dia da semana.',
          severity: 'error'
        });
        return;
      }

      if (!scheduledFormData.horario) {
        setSnackbar({
          open: true,
          message: 'Por favor, informe o horário.',
          severity: 'error'
        });
        return;
      }

      // Dados comuns para criar ou atualizar
      const taskData = {
        descricao: scheduledFormData.descricao,
        diasDaSemana: scheduledFormData.diasDaSemana,
        horario: scheduledFormData.horario,
        status: scheduledFormData.status,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      // Se estiver editando uma tarefa existente
      if (editingScheduledTask) {
        // Verificar se o status foi alterado
        const statusChanged = editingScheduledTask.status !== scheduledFormData.status;
        
        await updateDoc(doc(db, 'tarefas_por_horario', editingScheduledTask.id), taskData);
        
        // Registrar log
        if (statusChanged) {
          await addTaskLog('status_change_scheduled', {
            id: editingScheduledTask.id,
            descricao: scheduledFormData.descricao,
            diasDaSemana: scheduledFormData.diasDaSemana,
            horario: scheduledFormData.horario,
            taskType: 'agendada'
          }, editingScheduledTask.status, scheduledFormData.status);
        } else {
          await addTaskLog('edit_scheduled', {
            id: editingScheduledTask.id,
            descricao: scheduledFormData.descricao,
            diasDaSemana: scheduledFormData.diasDaSemana,
            horario: scheduledFormData.horario,
            taskType: 'agendada'
          }, null, null);
        }
        
        setSnackbar({
          open: true,
          message: 'Tarefa por horário atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        // Se estiver criando uma nova tarefa
        const newTaskData = {
          ...taskData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          tipo: 'por_horario'
        };
        
        const docRef = await addDoc(collection(db, 'tarefas_por_horario'), newTaskData);
        
        // Registrar log
        await addTaskLog('create_scheduled', {
          id: docRef.id,
          descricao: scheduledFormData.descricao,
          diasDaSemana: scheduledFormData.diasDaSemana,
          horario: scheduledFormData.horario,
          taskType: 'agendada'
        }, null, null);
        
        setSnackbar({
          open: true,
          message: 'Tarefa por horário criada com sucesso!',
          severity: 'success'
        });
      }
      
      handleCloseScheduledDialog();
    } catch (error) {
      console.error('Erro ao salvar tarefa por horário:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar tarefa por horário. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleScheduledDelete = async (taskId) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa por horário?')) {
      try {
        // Obter os dados da tarefa antes de excluir
        const taskDoc = doc(db, 'tarefas_por_horario', taskId);
        const taskSnapshot = await getDoc(taskDoc);
        const taskData = taskSnapshot.data();
        
        // Excluir a tarefa
        await deleteDoc(taskDoc);
        
        // Registrar log
        await addTaskLog('delete_scheduled', {
          id: taskId,
          descricao: taskData.descricao,
          diasDaSemana: taskData.diasDaSemana,
          horario: taskData.horario,
          taskType: 'agendada'
        }, null, null);
        
        setSnackbar({
          open: true,
          message: 'Tarefa por horário excluída com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir tarefa por horário:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir tarefa por horário. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    }
  };

  const handleScheduledStatusChange = async (taskId, newStatus) => {
    try {
      // Obter os dados da tarefa antes de atualizar
      const taskDoc = doc(db, 'tarefas_por_horario', taskId);
      const taskSnapshot = await getDoc(taskDoc);
      const taskData = taskSnapshot.data();
      
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      // Se o status for "Finalizada", atualizar o campo ultimaExecucao
      if (newStatus === 'Finalizada') {
        updateData.ultimaExecucao = serverTimestamp();
      }
      
      // Atualizar a tarefa
      await updateDoc(taskDoc, updateData);
      
      // Registrar log
      await addTaskLog('status_change_scheduled', {
        id: taskId,
        descricao: taskData.descricao,
        diasDaSemana: taskData.diasDaSemana,
        horario: taskData.horario,
        taskType: 'agendada'
      }, taskData.status, newStatus);
      
      setSnackbar({
        open: true,
        message: `Status da tarefa por horário alterado para ${newStatus}!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao alterar status da tarefa por horário:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao alterar status da tarefa por horário. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  // Funções para tarefas técnicas
  const handleOpenTechnicalDialog = (task = null) => {
    if (task) {
      setEditingTechnicalTask(task);
      setTechnicalFormData({
        descricao: task.descricao,
        responsavel: task.responsavel || [],
        prazoLimite: task.prazoLimite,
        observacoes: task.observacoes || '',
        status: task.status || 'Pendente'
      });
    } else {
      setEditingTechnicalTask(null);
      setTechnicalFormData({
        descricao: '',
        responsavel: [],
        prazoLimite: dayjs().format('YYYY-MM-DD'),
        observacoes: '',
        status: 'Pendente'
      });
    }
    setOpenTechnicalDialog(true);
  };

  const handleCloseTechnicalDialog = () => {
    setOpenTechnicalDialog(false);
    setEditingTechnicalTask(null);
  };

  const handleTechnicalSubmit = async () => {
    try {
      // Validar formulário
      if (!technicalFormData.descricao || !technicalFormData.responsavel.length || !technicalFormData.prazoLimite) {
        setSnackbar({
          open: true,
          message: 'Por favor, preencha todos os campos obrigatórios.',
          severity: 'error'
        });
        return;
      }

      // Dados comuns para criar ou atualizar
      const taskData = {
        descricao: technicalFormData.descricao,
        responsavel: technicalFormData.responsavel,
        prazoLimite: technicalFormData.prazoLimite,
        observacoes: technicalFormData.observacoes,
        status: technicalFormData.status,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      // Se estiver editando uma tarefa existente
      if (editingTechnicalTask) {
        await updateDoc(doc(db, 'tarefas_tecnicas', editingTechnicalTask.id), taskData);
        
        // Registrar log usando a função addTaskLog
        await addTaskLog('update_technical', {
          ...taskData,
          id: editingTechnicalTask.id,
          taskType: 'tecnica',
          oldDescription: editingTechnicalTask.descricao,
          newDescription: technicalFormData.descricao,
          oldStatus: editingTechnicalTask.status,
          newStatus: technicalFormData.status
        }, editingTechnicalTask.status, technicalFormData.status);
        
        setSnackbar({
          open: true,
          message: 'Tarefa técnica atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        // Se estiver criando uma nova tarefa
        const newTaskData = {
          ...taskData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        };
        
        const docRef = await addDoc(collection(db, 'tarefas_tecnicas'), newTaskData);
        
        // Registrar log usando a função addTaskLog
        await addTaskLog('create_technical', {
          ...newTaskData,
          id: docRef.id,
          taskType: 'tecnica'
        }, null, taskData.status);
        
        setSnackbar({
          open: true,
          message: 'Tarefa técnica criada com sucesso!',
          severity: 'success'
        });
      }
      
      handleCloseTechnicalDialog();
    } catch (error) {
      console.error('Erro ao salvar tarefa técnica:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar tarefa técnica. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleTechnicalDelete = async (taskId) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa técnica?')) {
      try {
        // Obter os dados da tarefa antes de excluir
        const taskDoc = doc(db, 'tarefas_tecnicas', taskId);
        const taskSnapshot = await getDoc(taskDoc);
        const taskData = taskSnapshot.data();
        
        // Excluir a tarefa
        await deleteDoc(taskDoc);
        
        // Registrar log usando a função addTaskLog
        await addTaskLog('delete_technical', {
          ...taskData,
          id: taskId,
          taskType: 'tecnica'
        }, taskData.status, null);
        
        setSnackbar({
          open: true,
          message: 'Tarefa técnica excluída com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir tarefa técnica:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir tarefa técnica. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    }
  };

  const handleTechnicalStatusChange = async (taskId, newStatus) => {
    try {
      // Obter os dados da tarefa antes de atualizar
      const taskDoc = doc(db, 'tarefas_tecnicas', taskId);
      const taskSnapshot = await getDoc(taskDoc);
      const taskData = taskSnapshot.data();
      
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      // Atualizar a tarefa
      await updateDoc(taskDoc, updateData);
      
      // Registrar log usando a função addTaskLog
      await addTaskLog('status_change_technical', {
        ...taskData,
        id: taskId,
        taskType: 'tecnica',
        status: newStatus
      }, taskData.status, newStatus);
      
      setSnackbar({
        open: true,
        message: `Status da tarefa técnica alterado para ${newStatus}!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao alterar status da tarefa técnica:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao alterar status da tarefa técnica. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  // Adicionar useEffect para filtrar tarefas técnicas
  useEffect(() => {
    let filtered = [...technicalTasks];
    
    // Filtrar por responsável
    if (technicalResponsibleFilter !== 'all') {
      filtered = filtered.filter(task => 
        Array.isArray(task.responsavel) 
          ? task.responsavel.includes(technicalResponsibleFilter)
          : task.responsavel === technicalResponsibleFilter
      );
    }
    
    // Filtrar por status
    if (technicalStatusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === technicalStatusFilter);
    }
    
    // Filtrar tarefas finalizadas se necessário
    if (!showCompletedTechnicalTasks) {
      filtered = filtered.filter(task => task.status !== 'Finalizada');
    }
    
    // Ordenar por prazo
    filtered.sort((a, b) => {
      const dateA = a.prazoLimite instanceof Date ? a.prazoLimite : a.prazoLimite?.toDate?.() || new Date();
      const dateB = b.prazoLimite instanceof Date ? b.prazoLimite : b.prazoLimite?.toDate?.() || new Date();
      return technicalDeadlineSort === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    setFilteredTechnicalTasks(filtered);
  }, [technicalTasks, showCompletedTechnicalTasks, technicalResponsibleFilter, technicalStatusFilter, technicalDeadlineSort]);

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

        {/* Navegação entre abas */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={getCurrentTab()}
            onChange={handleTabChange}
            aria-label="task management tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Não Recorrentes" />
            <Tab label="Técnico" />
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
                <MenuItem value="Urgente">Urgente</MenuItem>
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
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip 
                              label={selected} 
                              size="small" 
                              color={getStatusColorByName(selected)}
                            />
                          </Box>
                        )}
                      >
                        <MenuItem value="Pendente">Pendente</MenuItem>
                        <MenuItem value="Em andamento">Em andamento</MenuItem>
                        <MenuItem value="Finalizada">Finalizada</MenuItem>
                        <MenuItem value="Aguardando">Aguardando</MenuItem>
                        <MenuItem value="Urgente">Urgente</MenuItem>
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
        {getCurrentTab() === 2 && (
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
                      <TableCell>Concluída</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dailyTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.descricao}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={task.status === 'Finalizada'}
                            onChange={(e) => handleDailyStatusChange(task.id, e.target.checked ? 'Finalizada' : 'Pendente')}
                            color="success"
                          />
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
        {getCurrentTab() === 3 && (
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
                      <TableCell>Observações</TableCell>
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
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={selected} 
                                  size="small" 
                                  color={getStatusColorByName(selected)}
                                />
                              </Box>
                            )}
                          >
                            <MenuItem value="Pendente">Pendente</MenuItem>
                            <MenuItem value="Em andamento">Em andamento</MenuItem>
                            <MenuItem value="Finalizada">Finalizada</MenuItem>
                            <MenuItem value="Aguardando">Aguardando</MenuItem>
                            <MenuItem value="Urgente">Urgente</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>{task.observacoes}</TableCell>
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
                        <TableCell colSpan={6} align="center">
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

        {/* Aba de Tarefas Mensais */}
        {getCurrentTab() === 4 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenMonthlyDialog()}
              >
                Nova Tarefa Mensal
              </Button>
            </Box>

            {monthlyTasksLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Descrição</TableCell>
                      <TableCell>Dia do Mês</TableCell>
                      <TableCell>Feito em</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Observações</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlyTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.descricao}</TableCell>
                        <TableCell>{task.diaDoMes}</TableCell>
                        <TableCell>{formatUltimaExecucao(task.ultimaExecucao)}</TableCell>
                        <TableCell>
                          <Select
                            value={task.status || 'Pendente'}
                            onChange={(e) => handleMonthlyStatusChange(task.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: 120 }}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={selected} 
                                  size="small" 
                                  color={getStatusColorByName(selected)}
                                />
                              </Box>
                            )}
                          >
                            <MenuItem value="Pendente">Pendente</MenuItem>
                            <MenuItem value="Em andamento">Em andamento</MenuItem>
                            <MenuItem value="Finalizada">Finalizada</MenuItem>
                            <MenuItem value="Aguardando">Aguardando</MenuItem>
                            <MenuItem value="Urgente">Urgente</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>{task.observacoes}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenMonthlyDialog(task)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          {hasDeletePermission && (
                            <IconButton
                              color="error"
                              onClick={() => handleMonthlyDelete(task.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {monthlyTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhuma tarefa mensal encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {/* Aba de Tarefas Por Horário */}
        {getCurrentTab() === 5 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenScheduledDialog()}
              >
                Nova Tarefa Por Horário
              </Button>
            </Box>

            {scheduledTasksLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Descrição</TableCell>
                      <TableCell>Dias da Semana</TableCell>
                      <TableCell>Horário</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Observações</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scheduledTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.descricao}</TableCell>
                        <TableCell>{formatDiasDaSemana(task.diasDaSemana)}</TableCell>
                        <TableCell>{task.horario}</TableCell>
                        <TableCell>
                          <Select
                            value={task.status || 'Pendente'}
                            onChange={(e) => handleScheduledStatusChange(task.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: 120 }}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={selected} 
                                  size="small" 
                                  color={getStatusColorByName(selected)}
                                />
                              </Box>
                            )}
                          >
                            <MenuItem value="Pendente">Pendente</MenuItem>
                            <MenuItem value="Em andamento">Em andamento</MenuItem>
                            <MenuItem value="Finalizada">Finalizada</MenuItem>
                            <MenuItem value="Aguardando">Aguardando</MenuItem>
                            <MenuItem value="Urgente">Urgente</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>{task.observacoes}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenScheduledDialog(task)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          {hasDeletePermission && (
                            <IconButton
                              color="error"
                              onClick={() => handleScheduledDelete(task.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {scheduledTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhuma tarefa por horário encontrada
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
        {getCurrentTab() === 6 && (
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
                        <TableCell>{getActionName(log)}</TableCell>
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

                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Prazo Limite"
                      value={dayjs(formData.prazoLimite)}
                      onChange={(newValue) => setFormData({ ...formData, prazoLimite: newValue.format('YYYY-MM-DD') })}
                      slotProps={{
                        textField: {
                          required: true,
                          fullWidth: true,
                          error: !formData.prazoLimite,
                          helperText: !formData.prazoLimite ? 'Prazo é obrigatório' : ''
                        }
                      }}
                      format="DD/MM/YYYY"
                    />
                  </LocalizationProvider>

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
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={selected} 
                        size="small" 
                        color={getStatusColorByName(selected)}
                      />
                    </Box>
                  )}
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em andamento">Em andamento</MenuItem>
                  <MenuItem value="Finalizada">Finalizada</MenuItem>
                  <MenuItem value="Aguardando">Aguardando</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
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
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={selected} 
                        size="small" 
                        color={getStatusColorByName(selected)}
                      />
                    </Box>
                  )}
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em andamento">Em andamento</MenuItem>
                  <MenuItem value="Finalizada">Finalizada</MenuItem>
                  <MenuItem value="Aguardando">Aguardando</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
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
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={selected} 
                        size="small" 
                        color={getStatusColorByName(selected)}
                      />
                    </Box>
                  )}
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em andamento">Em andamento</MenuItem>
                  <MenuItem value="Finalizada">Finalizada</MenuItem>
                  <MenuItem value="Aguardando">Aguardando</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Observações"
                value={weeklyFormData.observacoes}
                onChange={(e) => setWeeklyFormData({ ...weeklyFormData, observacoes: e.target.value })}
                multiline
                rows={3}
                placeholder="Informações adicionais sobre esta tarefa (opcional)"
              />
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

        {/* Dialog para adicionar/editar tarefa mensal */}
        <Dialog
          open={openMonthlyDialog}
          onClose={handleCloseMonthlyDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingMonthlyTask ? 'Editar Tarefa Mensal' : 'Nova Tarefa Mensal'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Descrição"
                value={monthlyFormData.descricao}
                onChange={(e) => setMonthlyFormData({ ...monthlyFormData, descricao: e.target.value })}
                required
                multiline
                rows={2}
              />

              <FormControl fullWidth required>
                <InputLabel>Dia do Mês</InputLabel>
                <Select
                  value={monthlyFormData.diaDoMes}
                  onChange={(e) => setMonthlyFormData({ ...monthlyFormData, diaDoMes: e.target.value })}
                  label="Dia do Mês"
                >
                  <MenuItem value={1}>1</MenuItem>
                  <MenuItem value={2}>2</MenuItem>
                  <MenuItem value={3}>3</MenuItem>
                  <MenuItem value={4}>4</MenuItem>
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={6}>6</MenuItem>
                  <MenuItem value={7}>7</MenuItem>
                  <MenuItem value={8}>8</MenuItem>
                  <MenuItem value={9}>9</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={11}>11</MenuItem>
                  <MenuItem value={12}>12</MenuItem>
                  <MenuItem value={13}>13</MenuItem>
                  <MenuItem value={14}>14</MenuItem>
                  <MenuItem value={15}>15</MenuItem>
                  <MenuItem value={16}>16</MenuItem>
                  <MenuItem value={17}>17</MenuItem>
                  <MenuItem value={18}>18</MenuItem>
                  <MenuItem value={19}>19</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={21}>21</MenuItem>
                  <MenuItem value={22}>22</MenuItem>
                  <MenuItem value={23}>23</MenuItem>
                  <MenuItem value={24}>24</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={26}>26</MenuItem>
                  <MenuItem value={27}>27</MenuItem>
                  <MenuItem value={28}>28</MenuItem>
                  <MenuItem value={29}>29</MenuItem>
                  <MenuItem value={30}>30</MenuItem>
                  <MenuItem value={31}>31</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={monthlyFormData.status}
                  onChange={(e) => setMonthlyFormData({ ...monthlyFormData, status: e.target.value })}
                  label="Status"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={selected} 
                        size="small" 
                        color={getStatusColorByName(selected)}
                      />
                    </Box>
                  )}
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em andamento">Em andamento</MenuItem>
                  <MenuItem value="Finalizada">Finalizada</MenuItem>
                  <MenuItem value="Aguardando">Aguardando</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Observações"
                value={monthlyFormData.observacoes}
                onChange={(e) => setMonthlyFormData({ ...monthlyFormData, observacoes: e.target.value })}
                multiline
                rows={3}
                placeholder="Informações adicionais sobre esta tarefa (opcional)"
              />

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={monthlyFormData.status}
                  onChange={(e) => setMonthlyFormData({ ...monthlyFormData, status: e.target.value })}
                  label="Status"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={selected} 
                        size="small" 
                        color={getStatusColorByName(selected)}
                      />
                    </Box>
                  )}
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em andamento">Em andamento</MenuItem>
                  <MenuItem value="Finalizada">Finalizada</MenuItem>
                  <MenuItem value="Aguardando">Aguardando</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseMonthlyDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleMonthlySubmit}
              variant="contained"
              disabled={!monthlyFormData.descricao}
            >
              {editingMonthlyTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para adicionar/editar tarefa por horário */}
        <Dialog
          open={openScheduledDialog}
          onClose={handleCloseScheduledDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingScheduledTask ? 'Editar Tarefa Por Horário' : 'Nova Tarefa Por Horário'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Descrição"
                value={scheduledFormData.descricao}
                onChange={(e) => setScheduledFormData({ ...scheduledFormData, descricao: e.target.value })}
                required
                multiline
                rows={2}
              />

              <FormControl fullWidth required>
                <InputLabel>Dias da Semana</InputLabel>
                <Select
                  multiple
                  value={scheduledFormData.diasDaSemana}
                  onChange={(e) => setScheduledFormData({ ...scheduledFormData, diasDaSemana: e.target.value })}
                  label="Dias da Semana"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {formatDiasDaSemana(selected)}
                    </Box>
                  )}
                >
                  <MenuItem value="Segunda">Segunda</MenuItem>
                  <MenuItem value="Terça">Terça</MenuItem>
                  <MenuItem value="Quarta">Quarta</MenuItem>
                  <MenuItem value="Quinta">Quinta</MenuItem>
                  <MenuItem value="Sexta">Sexta</MenuItem>
                  <MenuItem value="Sábado">Sábado</MenuItem>
                  <MenuItem value="Domingo">Domingo</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Horário"
                type="time"
                value={scheduledFormData.horario}
                onChange={(e) => setScheduledFormData({ ...scheduledFormData, horario: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={scheduledFormData.status}
                  onChange={(e) => setScheduledFormData({ ...scheduledFormData, status: e.target.value })}
                  label="Status"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={selected} 
                        size="small" 
                        color={getStatusColorByName(selected)}
                      />
                    </Box>
                  )}
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em andamento">Em andamento</MenuItem>
                  <MenuItem value="Finalizada">Finalizada</MenuItem>
                  <MenuItem value="Aguardando">Aguardando</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseScheduledDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleScheduledSubmit}
              variant="contained"
              disabled={!scheduledFormData.descricao || !scheduledFormData.diasDaSemana.length || !scheduledFormData.horario}
            >
              {editingScheduledTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para adicionar/editar tarefa técnica */}
        <Dialog
          open={openTechnicalDialog}
          onClose={handleCloseTechnicalDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingTechnicalTask ? 'Editar Tarefa Técnica' : 'Nova Tarefa Técnica'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Descrição"
                value={technicalFormData.descricao}
                onChange={(e) => setTechnicalFormData({ ...technicalFormData, descricao: e.target.value })}
                required
                multiline
                rows={2}
              />

              <FormControl fullWidth required>
                <InputLabel>Responsável</InputLabel>
                <Select
                  multiple
                  value={technicalFormData.responsavel}
                  onChange={(e) => setTechnicalFormData({ ...technicalFormData, responsavel: e.target.value })}
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

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Prazo Limite"
                  value={dayjs(technicalFormData.prazoLimite)}
                  onChange={(newValue) => setTechnicalFormData({ ...technicalFormData, prazoLimite: newValue.format('YYYY-MM-DD') })}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      error: !technicalFormData.prazoLimite,
                      helperText: !technicalFormData.prazoLimite ? 'Prazo é obrigatório' : ''
                    }
                  }}
                  format="DD/MM/YYYY"
                />
              </LocalizationProvider>

              <TextField
                fullWidth
                label="Observações"
                value={technicalFormData.observacoes}
                onChange={(e) => setTechnicalFormData({ ...technicalFormData, observacoes: e.target.value })}
                multiline
                rows={3}
              />

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={technicalFormData.status}
                  onChange={(e) => setTechnicalFormData({ ...technicalFormData, status: e.target.value })}
                  label="Status"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={selected} 
                        size="small" 
                        color={getStatusColorByName(selected)}
                      />
                    </Box>
                  )}
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em andamento">Em andamento</MenuItem>
                  <MenuItem value="Finalizada">Finalizada</MenuItem>
                  <MenuItem value="Aguardando">Aguardando</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTechnicalDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleTechnicalSubmit}
              variant="contained"
              disabled={!technicalFormData.descricao || !technicalFormData.responsavel.length || !technicalFormData.prazoLimite}
            >
              {editingTechnicalTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Aba de Tarefas Técnicas */}
        {getCurrentTab() === 1 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={showCompletedTechnicalTasks}
                  onChange={(e) => setShowCompletedTechnicalTasks(e.target.checked)}
                  id="show-completed-technical"
                />
                <Typography
                  component="label"
                  htmlFor="show-completed-technical"
                  sx={{ cursor: 'pointer', userSelect: 'none', color: '#000' }}
                >
                  Mostrar tarefas finalizadas
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenTechnicalDialog()}
              >
                Nova Tarefa Técnica
              </Button>
            </Box>

            {/* Adicionar filtros */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filtrar por Responsável</InputLabel>
                    <Select
                      value={technicalResponsibleFilter}
                      onChange={(e) => setTechnicalResponsibleFilter(e.target.value)}
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
                      value={technicalStatusFilter}
                      onChange={(e) => setTechnicalStatusFilter(e.target.value)}
                      label="Filtrar por Status"
                    >
                      <MenuItem value="all">Todos os status</MenuItem>
                      <MenuItem value="Pendente">Pendente</MenuItem>
                      <MenuItem value="Em andamento">Em andamento</MenuItem>
                      <MenuItem value="Finalizada">Finalizada</MenuItem>
                      <MenuItem value="Aguardando">Aguardando</MenuItem>
                      <MenuItem value="Urgente">Urgente</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ordenar por Prazo</InputLabel>
                    <Select
                      value={technicalDeadlineSort}
                      onChange={(e) => setTechnicalDeadlineSort(e.target.value)}
                      label="Ordenar por Prazo"
                    >
                      <MenuItem value="asc">Mais próximo primeiro</MenuItem>
                      <MenuItem value="desc">Mais distante primeiro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {technicalTasksLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
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
                    {filteredTechnicalTasks.map((task) => (
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
                            onChange={(e) => handleTechnicalStatusChange(task.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: 120 }}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={selected} 
                                  size="small" 
                                  color={getStatusColorByName(selected)}
                                />
                              </Box>
                            )}
                          >
                            <MenuItem value="Pendente">Pendente</MenuItem>
                            <MenuItem value="Em andamento">Em andamento</MenuItem>
                            <MenuItem value="Finalizada">Finalizada</MenuItem>
                            <MenuItem value="Aguardando">Aguardando</MenuItem>
                            <MenuItem value="Urgente">Urgente</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenTechnicalDialog(task)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          {hasDeletePermission && (
                            <IconButton
                              color="error"
                              onClick={() => handleTechnicalDelete(task.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTechnicalTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhuma tarefa técnica encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Box>
    </MainLayout>
  );
} 