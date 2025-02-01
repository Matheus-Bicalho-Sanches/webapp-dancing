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
  Snackbar
} from '@mui/material';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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
      collection(db, 'tarefas'),
      where('tipo', '==', 'por_horario'),
      where('status', '!=', 'Finalizada'),
      orderBy('status'),
      orderBy('horario')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationsData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(task => {
          // Only show tasks for today or future days
          const today = new Date();
          const currentDay = today.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
          
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

          return task.diasSemana?.includes(dayMapping[currentDay]);
        });

      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setUpdatingStatus(true);
      const taskRef = doc(db, 'tarefas', taskId);
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
    if (!horario) return { label: 'Sem horário', color: 'default' };

    const now = new Date();
    const [hours, minutes] = horario.split(':');
    const taskTime = new Date();
    taskTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

    const diffInMinutes = Math.floor((taskTime - now) / (1000 * 60));

    if (diffInMinutes < 0) {
      return { label: 'Atrasada', color: 'error' };
    } else if (diffInMinutes <= 10) {
      return { label: 'Próxima', color: 'warning' };
    } else {
      return { label: 'Agendada', color: 'success' };
    }
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
          Notificações de Tarefas
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Descrição</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell>Status do Horário</TableCell>
                <TableCell>Status da Tarefa</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>{notification.descricao}</TableCell>
                    <TableCell>{notification.horario}</TableCell>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Nenhuma notificação para hoje
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

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