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
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp, 
  writeBatch, 
  doc, 
  deleteDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { alpha } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';

dayjs.locale('pt-br');

export default function ScheduleTab({ isPublic = false, saveAgendamento }) {
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
    email: '',
    telefone: '',
    cpf: '',
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
  const [viewBooking, setViewBooking] = useState(null);
  const [viewBookingOpen, setViewBookingOpen] = useState(false);
  const [values, setValues] = useState([]);

  // Função para calcular valor por aula baseado na quantidade
  const getValuePerClass = (quantity) => {
    // Encontrar a faixa de valor adequada para a quantidade de aulas
    const valueRange = values.find(v => 
      quantity >= v.minClasses && 
      quantity <= v.maxClasses
    );
    
    return valueRange ? valueRange.valuePerClass : 0;
  };

  // Função para calcular o valor total
  const calculateTotal = () => {
    const quantity = selectedSlots.length;
    const valuePerClass = getValuePerClass(quantity);
    return quantity * valuePerClass;
  };

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

  // Função super otimizada para carregar agendamentos existentes
  const loadExistingBookings = async () => {
    try {
      const bookingsData = {};
      const datesArray = selectedDates.map(date => date.format('YYYY-MM-DD'));
      
      if (datesArray.length === 0) return; // Se não houver datas selecionadas, retorna

      // Buscar apenas os agendamentos com status confirmado
      const agendamentosRef = collection(db, 'agendamentos');
      const agendamentosQuery = query(
        agendamentosRef,
        where('status', '==', 'confirmado')
      );
      const agendamentosSnapshot = await getDocs(agendamentosQuery);
      
      // Criar um mapa de agendamentos para referência rápida
      const agendamentosMap = new Map(
        agendamentosSnapshot.docs.map(doc => [
          doc.id,
          { id: doc.id, ...doc.data() }
        ])
      );
      
      // Buscar horários para todas as datas de uma vez
      const horariosPromises = agendamentosSnapshot.docs.map(async (agendamentoDoc) => {
        const horariosRef = collection(agendamentoDoc.ref, 'horarios');
        let horariosQuery;
        
        // Se houver mais de uma data, usa where in
        if (datesArray.length > 1) {
          horariosQuery = query(
            horariosRef,
            where('data', 'in', datesArray)
          );
        } else {
          // Se houver apenas uma data, usa where equal
          horariosQuery = query(
            horariosRef,
            where('data', '==', datesArray[0])
          );
        }
        
        const horariosSnapshot = await getDocs(horariosQuery);
        
        horariosSnapshot.docs.forEach(horarioDoc => {
          const horarioData = horarioDoc.data();
          const agendamento = agendamentosMap.get(agendamentoDoc.id);
          
          const key = `${horarioData.data}-${horarioData.horario}-${horarioData.professorId}`;
          bookingsData[key] = {
            ...horarioData,
            agendamentoId: agendamentoDoc.id,
            nomeAluno: agendamento.nomeAluno
          };
        });
      });
      
      await Promise.all(horariosPromises);
      setExistingBookings(bookingsData);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      showNotification('Erro ao carregar agendamentos', 'error');
    }
  };

  // Polling para verificar novos agendamentos
  useEffect(() => {
    // Carregar agendamentos inicialmente
    loadExistingBookings();

    // Configurar o intervalo para verificar a cada segundo
    const interval = setInterval(() => {
      loadExistingBookings();
    }, 1000);

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  }, [selectedDates]); // Recriar o intervalo quando as datas mudarem

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
      email: '',
      telefone: '',
      cpf: '',
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

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity
    });
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
        onClick={isPublic ? handlePublicAgendamento : handleOpenAgendamento}
      >
        Agendar {selectedSlots.length} horário(s)
      </Button>
    );
  };

  const handlePublicAgendamento = () => {
    setAgendamentoForm(prev => ({
      ...prev,
      isPublic: true
    }));
    setOpenAgendamentoModal(true);
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
      
      // Primeiro, excluir todos os horários do agendamento
      const horariosSnapshot = await getDocs(collection(agendamentoRef, 'horarios'));
      const batch = writeBatch(db);
      
      horariosSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Depois, excluir o documento principal do agendamento
      batch.delete(agendamentoRef);
      
      // Executar todas as operações
      await batch.commit();

      showNotification('Agendamento cancelado com sucesso!', 'success');
      await loadExistingBookings(); // Recarregar agendamentos
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      showNotification('Erro ao cancelar agendamento.', 'error');
    } finally {
      handleDeleteClose();
    }
  };

  const handleViewClick = async (booking) => {
    try {
      // Buscar dados completos do agendamento
      const agendamentoRef = doc(db, 'agendamentos', booking.agendamentoId);
      const agendamentoDoc = await getDoc(agendamentoRef);
      
      if (agendamentoDoc.exists()) {
        setViewBooking({
          ...booking,
          ...agendamentoDoc.data()
        });
        setViewBookingOpen(true);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do agendamento:', error);
      showNotification('Erro ao carregar detalhes do agendamento.', 'error');
    }
  };

  // Atualizar handleSaveAgendamento para criar a preferência
  const handleSaveAgendamento = async () => {
    try {
      // Validar dados básicos
      if (!agendamentoForm.nomeAluno || !agendamentoForm.email || !agendamentoForm.telefone || !agendamentoForm.cpf) {
        showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
      }

      // Validar horários selecionados
      if (selectedSlots.length === 0) {
        showNotification('Por favor, selecione pelo menos um horário.', 'error');
        return;
      }

      setSaving(true);

      if (isPublic) {
        // Preparar dados do agendamento
        const horarios = Object.values(selectedTeachers).map(slot => ({
          date: slot.date,
          horario: slot.horario,
          professorId: slot.professorId,
          professorNome: slot.professorNome
        }));

        // Criar sessão de pagamento no Stripe
        try {
          const response = await fetch('/api/stripe/create-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: selectedSlots.length * getValuePerClass(selectedSlots.length),
              payer: {
                name: agendamentoForm.nomeAluno,
                email: agendamentoForm.email,
                tax_id: agendamentoForm.cpf.replace(/[^0-9]/g, ''),
                phone: agendamentoForm.telefone.replace(/[^0-9]/g, ''),
                observacoes: agendamentoForm.observacoes
              },
              items: [{
                name: `${selectedSlots.length} aula(s) de patinação`,
                quantity: 1,
                amount: selectedSlots.length * getValuePerClass(selectedSlots.length)
              }],
              horarios
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || data.details || 'Erro ao criar sessão de pagamento');
          }

          // Redirecionar para a página de pagamento do Stripe
          window.location.href = data.url;
        } catch (error) {
          console.error('Erro ao criar sessão de pagamento:', error);
          showNotification('Erro ao processar pagamento. Por favor, tente novamente.', 'error');
        }
      } else {
        // Lógica existente para agendamento administrativo
        const agendamentoData = {
          ...agendamentoForm,
          horarios: Object.values(selectedTeachers).map(slot => ({
            data: slot.date,
            horario: slot.horario,
            professorId: slot.professorId,
            professorNome: slot.professorNome
          }))
        };

        await saveAgendamento(agendamentoData);
        handleCloseAgendamento();
      }
    } catch (error) {
      console.error('Erro:', error);
      showNotification('Erro ao processar agendamento', 'error');
    } finally {
      setSaving(false);
    }
  };

  // useEffect para carregar valores das aulas
  useEffect(() => {
    const loadValues = async () => {
      try {
        const valuesSnapshot = await getDocs(collection(db, 'valores_aulas'));
        const valuesData = valuesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Ordenar por quantidade mínima de aulas
        const sortedValues = valuesData.sort((a, b) => a.minClasses - b.minClasses);
        setValues(sortedValues);
      } catch (error) {
        console.error('Erro ao carregar valores:', error);
      }
    };

    loadValues();
  }, []);

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
                              {isBooked && !isPublic && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewClick(existingBookings[bookingKey]);
                                    }}
                                    sx={{
                                      opacity: 0.7,
                                      '&:hover': {
                                        opacity: 1
                                      }
                                    }}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
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
                                </Box>
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
        <DialogTitle>
          {isPublic ? 'Solicitar Agendamento' : 'Novo Agendamento'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Horários selecionados:
            </Typography>
            <Box sx={{ mb: 3 }}>
              {Object.values(selectedTeachers).map((slot, index) => (
                <Typography key={index} color="text.secondary">
                  • {dayjs(slot.date).format('DD/MM/YYYY')} às {slot.horario} com {slot.professorNome}
                </Typography>
              ))}
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Valor total: R$ {selectedSlots.length * getValuePerClass(selectedSlots.length)}
            </Typography>

            <TextField
              fullWidth
              label="Nome Completo"
              name="nomeAluno"
              value={agendamentoForm.nomeAluno}
              onChange={handleAgendamentoChange}
              required
              margin="normal"
            />

            <TextField
              fullWidth
              label="E-mail"
              name="email"
              type="email"
              value={agendamentoForm.email}
              onChange={handleAgendamentoChange}
              required
              margin="normal"
            />

            <TextField
              fullWidth
              label="WhatsApp"
              name="telefone"
              value={agendamentoForm.telefone}
              onChange={handleAgendamentoChange}
              required
              margin="normal"
              inputProps={{ maxLength: 11 }}
              helperText="Digite apenas números"
            />

            <TextField
              fullWidth
              label="CPF"
              name="cpf"
              value={agendamentoForm.cpf || ''}
              onChange={handleAgendamentoChange}
              required
              margin="normal"
              inputProps={{ maxLength: 11 }}
              helperText="Digite apenas números"
            />

            <TextField
              fullWidth
              label="Observações"
              name="observacoes"
              value={agendamentoForm.observacoes}
              onChange={handleAgendamentoChange}
              multiline
              rows={4}
              margin="normal"
            />

            {/* Botões de ação */}
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {isPublic ? (
                <Button 
                  variant="contained"
                  onClick={handleSaveAgendamento}
                  disabled={
                    !agendamentoForm.nomeAluno || 
                    !agendamentoForm.email || 
                    !agendamentoForm.telefone ||
                    !agendamentoForm.cpf || 
                    saving
                  }
                  fullWidth
                >
                  {saving ? 'Processando...' : 'Prosseguir para pagamento'}
                </Button>
              ) : (
                <Button 
                  variant="contained"
                  onClick={handleSaveAgendamento}
                  disabled={
                    !agendamentoForm.nomeAluno || 
                    !agendamentoForm.email || 
                    !agendamentoForm.telefone || 
                    saving
                  }
                  fullWidth
                >
                  {saving ? 'Salvando...' : 'Confirmar'}
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAgendamento}>
            Cancelar
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

      <Dialog
        open={viewBookingOpen}
        onClose={() => setViewBookingOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalhes do Agendamento</DialogTitle>
        <DialogContent>
          {viewBooking && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Aluno:</strong> {viewBooking.nomeAluno}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>
                <strong>Email:</strong> {viewBooking.email || 'Não informado'}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>
                <strong>WhatsApp:</strong> {viewBooking.telefone || 'Não informado'}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>
                <strong>Data:</strong> {dayjs(viewBooking.data).format('DD/MM/YYYY')}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>
                <strong>Horrio:</strong> {viewBooking.horario}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>
                <strong>Professor:</strong> {viewBooking.professorNome}
              </Typography>

              <Typography variant="subtitle1" gutterBottom>
                <strong>Observações:</strong>
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: '#f5f5f5' }}>
                <Typography>
                  {viewBooking.observacoes || 'Nenhuma observação'}
                </Typography>
              </Paper>

              <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                Agendamento realizado em: {dayjs(viewBooking.createdAt?.toDate()).format('DD/MM/YYYY HH:mm')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewBookingOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 