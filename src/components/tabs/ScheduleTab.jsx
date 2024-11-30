import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { alpha } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

dayjs.locale('pt-br');

export default function ScheduleTab() {
  const [selectedDates, setSelectedDates] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState({});
  const [baseDate, setBaseDate] = useState(dayjs());
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState({});
  const [openAgendamentoModal, setOpenAgendamentoModal] = useState(false);
  const [agendamentoForm, setAgendamentoForm] = useState({
    nomeAluno: '',
    observacoes: ''
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [existingBookings, setExistingBookings] = useState({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  // Inicializar as três datas (hoje, amanhã, depois)
  useEffect(() => {
    const today = dayjs();
    const dates = [
      today,
      today.add(1, 'day'),
      today.add(2, 'day')
    ];
    setSelectedDates(dates);
  }, []);

  // Atualizar selectedDates quando baseDate mudar
  useEffect(() => {
    const dates = [
      baseDate,
      baseDate.add(1, 'day'),
      baseDate.add(2, 'day')
    ];
    setSelectedDates(dates);
  }, [baseDate]);

  // Função para carregar horários
  const loadSchedules = async () => {
    if (selectedDates.length === 0) return;

    setLoading(true);
    try {
      const schedulesData = {};
      
      for (const date of selectedDates) {
        const dateStr = date.format('YYYY-MM-DD');
        console.log('Data:', dateStr);
        console.log('Dia da semana original:', date.format('dddd'));
        
        const diasSemanaMap = {
          'domingo': 'domingo',
          'segunda-feira': 'segunda',
          'terça-feira': 'terca',
          'quarta-feira': 'quarta',
          'quinta-feira': 'quinta',
          'sexta-feira': 'sexta',
          'sábado': 'sabado'
        };
        
        const diaSemana = diasSemanaMap[date.format('dddd')] || '';
        console.log('Dia da semana convertido:', diaSemana);
        
        const timesQuery = query(
          collection(db, 'horarios'),
          where('diaSemana', '==', diaSemana)
        );
        
        const querySnapshot = await getDocs(timesQuery);
        console.log('Horários encontrados:', querySnapshot.docs.length);
        
        schedulesData[dateStr] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
    } finally {
      setLoading(false);
    }
  };

  // useEffect para carregar horários quando as datas mudarem
  useEffect(() => {
    loadSchedules();
  }, [selectedDates]);

  // Novo useEffect para carregar professores
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachersSnapshot = await getDocs(collection(db, 'professores'));
        const teachersData = {};
        teachersSnapshot.docs.forEach(doc => {
          teachersData[doc.id] = doc.data();
        });
        setTeachers(teachersData);
      } catch (error) {
        console.error('Erro ao carregar professores:', error);
      }
    };

    loadTeachers();
  }, []);

  // Função para carregar agendamentos existentes
  const loadExistingBookings = async () => {
    try {
      const bookingsData = {};
      
      for (const date of selectedDates) {
        const dateStr = date.format('YYYY-MM-DD');
        const agendamentosRef = collection(db, 'agendamentos');
        const agendamentosQuery = await getDocs(agendamentosRef);
        
        for (const agendamentoDoc of agendamentosQuery.docs) {
          const agendamentoData = agendamentoDoc.data();
          const horariosRef = collection(agendamentoDoc.ref, 'horarios');
          const horariosSnapshot = await getDocs(horariosRef);
          
          horariosSnapshot.docs.forEach(horarioDoc => {
            const horarioData = horarioDoc.data();
            if (horarioData.data === dateStr) {
              const key = `${dateStr}-${horarioData.horario}-${horarioData.professorId}`;
              bookingsData[key] = {
                ...horarioData,
                agendamentoId: agendamentoDoc.id,
                nomeAluno: agendamentoData.nomeAluno
              };
            }
          });
        }
      }
      
      setExistingBookings(bookingsData);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    }
  };

  // Carregar agendamentos quando as datas mudarem
  useEffect(() => {
    loadExistingBookings();
  }, [selectedDates]);

  const formatDate = (date) => {
    return `${date.format('dddd')} ${date.format('DD/MM/YY')}`;
  };

  const handlePreviousDays = () => {
    setBaseDate(prev => prev.subtract(3, 'day'));
  };

  const handleNextDays = () => {
    setBaseDate(prev => prev.add(3, 'day'));
  };

  const handleToday = () => {
    setBaseDate(dayjs());
  };

  const handleSlotSelection = (date, schedule, teacher) => {
    const slotId = `${date.format('YYYY-MM-DD')}-${schedule.id}-${teacher}`;
    const bookingKey = `${date.format('YYYY-MM-DD')}-${schedule.horario}-${teacher}`;
    
    // Verificar se já existe agendamento
    if (existingBookings[bookingKey]) {
      showNotification('Este horário já está agendado.', 'error');
      return;
    }
    
    setSelectedSlots(prev => {
      if (prev.includes(slotId)) {
        // Deselecionar slot
        const newSlots = prev.filter(id => id !== slotId);
        setSelectedTeachers(current => {
          const updated = { ...current };
          delete updated[slotId];
          return updated;
        });
        return newSlots;
      } else {
        // Selecionar slot
        setSelectedTeachers(current => ({
          ...current,
          [slotId]: {
            date: date.format('YYYY-MM-DD'),
            horario: schedule.horario,
            professorId: teacher,
            professorNome: teachers[teacher]?.nome
          }
        }));
        return [...prev, slotId];
      }
    });
  };

  const handleOpenAgendamento = () => {
    setOpenAgendamentoModal(true);
  };

  const handleCloseAgendamento = () => {
    setOpenAgendamentoModal(false);
    setAgendamentoForm({
      nomeAluno: '',
      observacoes: ''
    });
  };

  const handleAgendamentoChange = (event) => {
    const { name, value } = event.target;
    setAgendamentoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitAgendamento = async () => {
    setSaving(true);
    try {
      // Verificar novamente todos os slots selecionados
      for (const slot of Object.values(selectedTeachers)) {
        const bookingKey = `${slot.date}-${slot.horario}-${slot.professorId}`;
        if (existingBookings[bookingKey]) {
          throw new Error('Um ou mais horários selecionados já foram agendados.');
        }
      }

      const batch = writeBatch(db);
      const agendamentosRef = collection(db, 'agendamentos');

      // Criar documento principal do agendamento
      const mainAgendamento = {
        nomeAluno: agendamentoForm.nomeAluno,
        observacoes: agendamentoForm.observacoes,
        createdAt: Timestamp.now(),
        status: 'confirmado'
      };

      const mainDocRef = await addDoc(agendamentosRef, mainAgendamento);

      // Criar documentos para cada horário agendado
      Object.values(selectedTeachers).forEach((slot) => {
        const horarioRef = doc(agendamentosRef, mainDocRef.id, 'horarios', `${slot.date}-${slot.horario}`);
        batch.set(horarioRef, {
          data: slot.date,
          horario: slot.horario,
          professorId: slot.professorId,
          professorNome: slot.professorNome,
          status: 'agendado'
        });
      });

      await batch.commit();

      // Feedback e limpeza
      handleCloseAgendamento();
      setSelectedSlots([]);
      setSelectedTeachers({});
      
      // Mostrar notificação de sucesso
      showNotification('Agendamento realizado com sucesso!', 'success');
      
      // Recarregar horários para atualizar disponibilidade
      loadSchedules();

      // Recarregar agendamentos após salvar
      await loadExistingBookings();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      showNotification(error.message || 'Erro ao realizar agendamento. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message, severity) => {
    // Você pode implementar isso usando um Snackbar do MUI
    // ou qualquer outro componente de notificação
    console.log(`${severity}: ${message}`);
  };

  const renderAgendamentoButton = () => {
    if (selectedSlots.length === 0) return null;

    return (
      <Button
        variant="contained"
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000
        }}
        onClick={handleOpenAgendamento}
      >
        Agendar {selectedSlots.length} horário(s)
      </Button>
    );
  };

  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteClose = () => {
    setBookingToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      const agendamentoRef = doc(db, 'agendamentos', bookingToDelete.agendamentoId);
      const horarioRef = doc(agendamentoRef, 'horarios', `${bookingToDelete.data}-${bookingToDelete.horario}`);
      
      await deleteDoc(horarioRef);
      
      // Verificar se ainda existem horários para este agendamento
      const horariosSnapshot = await getDocs(collection(agendamentoRef, 'horarios'));
      if (horariosSnapshot.empty) {
        // Se não houver mais horários, deletar o agendamento principal
        await deleteDoc(agendamentoRef);
      }

      showNotification('Agendamento cancelado com sucesso!', 'success');
      await loadExistingBookings(); // Recarregar agendamentos
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      showNotification('Erro ao cancelar agendamento.', 'error');
    } finally {
      handleDeleteClose();
    }
  };

  return (
    <>
      <Stack 
        direction="row" 
        spacing={2} 
        alignItems="center" 
        justifyContent="center"
        sx={{ mb: 2 }}
      >
        <Tooltip title="Dias anteriores">
          <IconButton 
            onClick={handlePreviousDays}
            sx={{ 
              backgroundColor: alpha('#1976d2', 0.04),
              '&:hover': {
                backgroundColor: alpha('#1976d2', 0.08),
              }
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Voltar para hoje">
          <IconButton 
            onClick={handleToday}
            sx={{ 
              backgroundColor: alpha('#1976d2', 0.04),
              '&:hover': {
                backgroundColor: alpha('#1976d2', 0.08),
              }
            }}
          >
            <TodayIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Próximos dias">
          <IconButton 
            onClick={handleNextDays}
            sx={{ 
              backgroundColor: alpha('#1976d2', 0.04),
              '&:hover': {
                backgroundColor: alpha('#1976d2', 0.08),
              }
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Grid container spacing={2}>
        {selectedDates.map((date) => (
          <Grid item xs={12} md={4} key={date.format('YYYY-MM-DD')}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 2, 
                height: '100%',
                borderRadius: 2,
                background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  textTransform: 'capitalize',
                  mb: 2
                }}
              >
                {formatDate(date)}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <Typography>Carregando horários...</Typography>
                </Box>
              ) : (
                <Box>
                  {schedules[date.format('YYYY-MM-DD')]?.map((schedule) => (
                    <Box key={schedule.id}>
                      <Typography variant="h6">
                        {schedule.horario}
                      </Typography>
                      <Box sx={{ ml: 1 }}>
                        {schedule.professores?.map(profId => {
                          const slotId = `${date.format('YYYY-MM-DD')}-${schedule.id}-${profId}`;
                          const bookingKey = `${date.format('YYYY-MM-DD')}-${schedule.horario}-${profId}`;
                          const isSelected = selectedSlots.includes(slotId);
                          const isBooked = existingBookings[bookingKey];

                          return (
                            <Box
                              key={profId}
                              onClick={() => !isBooked && handleSlotSelection(date, schedule, profId)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1,
                                cursor: isBooked ? 'default' : 'pointer',
                                borderRadius: 1,
                                backgroundColor: isBooked 
                                  ? alpha('#f44336', 0.1) 
                                  : isSelected 
                                    ? alpha('#1976d2', 0.1) 
                                    : alpha('#4caf50', 0.1),
                                '&:hover': {
                                  backgroundColor: isBooked 
                                    ? alpha('#f44336', 0.1)
                                    : isSelected 
                                      ? alpha('#1976d2', 0.15) 
                                      : alpha('#4caf50', 0.15)
                                }
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  color: isBooked 
                                    ? 'text.secondary'
                                    : isSelected 
                                      ? 'primary.main' 
                                      : 'text.secondary',
                                  fontWeight: isSelected ? 500 : 400
                                }}
                              >
                                • {teachers[profId]?.nome || 'Carregando...'}
                                {isBooked && ` - ${existingBookings[bookingKey].nomeAluno.split(' ')[0]}`}
                              </Typography>
                              {isBooked && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(existingBookings[bookingKey]);
                                  }}
                                  sx={{
                                    opacity: 0.7,
                                    '&:hover': {
                                      opacity: 1
                                    }
                                  }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  ))}
                  {(!schedules[date.format('YYYY-MM-DD')] || 
                    schedules[date.format('YYYY-MM-DD')].length === 0) && (
                    <Typography 
                      sx={{ 
                        textAlign: 'center',
                        color: 'text.disabled',
                        fontStyle: 'italic',
                        mt: 3,
                        p: 2,
                        backgroundColor: alpha('#000', 0.02),
                        borderRadius: 1
                      }}
                    >
                      Nenhum horário disponível
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Modal de Agendamento */}
      <Dialog
        open={openAgendamentoModal}
        onClose={handleCloseAgendamento}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Novo Agendamento</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nome do Aluno"
              name="nomeAluno"
              value={agendamentoForm.nomeAluno}
              onChange={handleAgendamentoChange}
              required
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Observações"
              name="observacoes"
              value={agendamentoForm.observacoes}
              onChange={handleAgendamentoChange}
              multiline
              rows={2}
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Horários Selecionados:
            </Typography>
            <List>
              {Object.values(selectedTeachers).map((slot, index) => (
                <ListItem key={index} sx={{ py: 1 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={dayjs(slot.date).format('DD/MM/YYYY')}
                          size="small"
                          color="primary"
                        />
                        <Chip 
                          label={slot.horario}
                          size="small"
                          color="secondary"
                        />
                      </Box>
                    }
                    secondary={`Professor: ${slot.professorNome}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseAgendamento}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained"
            onClick={handleSubmitAgendamento}
            disabled={!agendamentoForm.nomeAluno || saving}
          >
            {saving ? 'Salvando...' : 'Confirmar Agendamento'}
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

      {renderAgendamentoButton()}

      {/* Modal de confirmação de cancelamento */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar Cancelamento</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja cancelar o agendamento de{' '}
            <strong>{bookingToDelete?.nomeAluno}</strong> com{' '}
            <strong>{bookingToDelete?.professorNome}</strong> no dia{' '}
            <strong>{bookingToDelete?.data}</strong> às{' '}
            <strong>{bookingToDelete?.horario}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>
            Não
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Sim, Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 