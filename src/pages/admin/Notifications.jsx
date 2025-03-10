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
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Divider
} from '@mui/material';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const q = query(
      collection(db, 'tarefas_por_horario'),
      where('status', '!=', 'Finalizada'),
      orderBy('status'),
      orderBy('horario')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const now = new Date();
      const currentDay = now.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
      
      // Map Portuguese day names to our task day values
      const dayMapping = {
        'segunda-feira': 'segunda',
        'terça-feira': 'terca',
        'quarta-feira': 'quarta',
        'quinta-feira': 'quinta',
        'sexta-feira': 'sexta',
        'sábado': 'sabado',
        'domingo': 'domingo'
      };

      const currentDayCode = dayMapping[currentDay];
      
      const allTasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const notificationsData = allTasks
        .filter(task => {
          // Only show tasks for today
          return task.diasDaSemana?.includes(currentDayCode);
        })
        .sort((a, b) => {
          // Sort by time status first (late tasks first, then upcoming, then scheduled)
          const statusA = getTimeStatus(a.horario).priority;
          const statusB = getTimeStatus(b.horario).priority;
          
          if (statusA !== statusB) {
            return statusA - statusB;
          }
          
          // Then sort by time
          if (a.horario && b.horario) {
            const [hoursA, minutesA] = a.horario.split(':');
            const [hoursB, minutesB] = b.horario.split(':');
            
            const timeA = parseInt(hoursA) * 60 + parseInt(minutesA);
            const timeB = parseInt(hoursB) * 60 + parseInt(minutesB);
            
            return timeA - timeB;
          }
          
          return 0;
        });

      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setUpdatingStatus(true);
      const taskRef = doc(db, 'tarefas_por_horario', taskId);
      const taskSnapshot = await getDoc(taskRef);
      const previousData = { ...taskSnapshot.data(), id: taskId };
      
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
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

  const createLogEntry = async (action, taskData, previousData = null) => {
    try {
      const logEntry = {
        action,
        taskId: taskData.id,
        description: taskData.descricao,
        userId: currentUser.uid,
        userName: currentUser.email,
        timestamp: serverTimestamp(),
        changes: {}
      };

      if (action === 'update' && previousData) {
        // Compare and record only changed fields
        Object.keys(taskData).forEach(key => {
          if (JSON.stringify(taskData[key]) !== JSON.stringify(previousData[key])) {
            logEntry.changes[key] = {
              from: previousData[key],
              to: taskData[key]
            };
          }
        });
      }

      await addDoc(collection(db, 'task_logs'), logEntry);
    } catch (error) {
      console.error('Error creating log entry:', error);
    }
  };

  const getTimeStatus = (horario) => {
    if (!horario) return { label: 'Sem horário', color: 'default', priority: 4 };

    const now = new Date();
    const [hours, minutes] = horario.split(':');
    const taskTime = new Date();
    taskTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

    const diffInMinutes = Math.floor((taskTime - now) / (1000 * 60));

    if (diffInMinutes < 0) {
      return { label: 'Atrasada', color: 'error', priority: 1 };
    } else if (diffInMinutes <= 10) {
      return { label: 'Próxima (10 min)', color: 'warning', priority: 2 };
    } else if (diffInMinutes <= 30) {
      return { label: 'Em breve (30 min)', color: 'info', priority: 3 };
    } else {
      return { label: 'Agendada', color: 'success', priority: 4 };
    }
  };

  const formatTime = (horario) => {
    if (!horario) return 'Não definido';
    
    // Convert 24h format to 12h format with AM/PM
    const [hours, minutes] = horario.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    
    return `${formattedHour}:${minutes} ${period}`;
  };

  if (loading) {
    return (
      <MainLayout title="Notificações">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Notificações">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ color: '#000', mb: 3 }}>
          Tarefas agendadas para hoje
        </Typography>

        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Descrição</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell>Status do Horário</TableCell>
                <TableCell>Status da Tarefa</TableCell>
                <TableCell>Responsável</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <TableRow 
                    key={notification.id}
                    sx={{
                      backgroundColor: getTimeStatus(notification.horario).color === 'error' 
                        ? '#fff0f0' 
                        : getTimeStatus(notification.horario).color === 'warning'
                          ? '#fffbe6'
                          : 'inherit'
                    }}
                  >
                    <TableCell>{notification.descricao}</TableCell>
                    <TableCell>{formatTime(notification.horario)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTimeStatus(notification.horario).label}
                        color={getTimeStatus(notification.horario).color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={notification.status || 'Pendente'}
                        onChange={(e) => handleStatusChange(notification.id, e.target.value)}
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
                    <TableCell>
                      {notification.responsaveis?.map(resp => resp.nome).join(', ') || 'Não definido'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhuma tarefa agendada para hoje
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="subtitle1" sx={{ color: '#000', mb: 2, mt: 4 }}>
          Legenda - Status de horários
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <Chip label="Atrasada" color="error" size="small" />
          <Chip label="Próxima (10 min)" color="warning" size="small" />
          <Chip label="Em breve (30 min)" color="info" size="small" />
          <Chip label="Agendada" color="success" size="small" />
        </Box>

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