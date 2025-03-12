import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Card,
  CardContent,
  CardHeader,
  Divider
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  writeBatch, 
  doc, 
  Timestamp,
  deleteDoc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Configurar dayjs para usar o locale pt-br
dayjs.locale('pt-br');

// Componente simplificado de calendário que não depende do DateCalendar
function SimpleCalendar({ value, onChange, onDateSelect, isDateSelected, isHoliday }) {
  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const month = value.month();
  const year = value.year();
  
  // Obter o primeiro dia do mês e o último
  const firstDayOfMonth = dayjs().year(year).month(month).date(1);
  const lastDayOfMonth = dayjs().year(year).month(month).date(firstDayOfMonth.daysInMonth());
  
  // Obter o dia da semana do primeiro dia (0 = domingo, 1 = segunda, etc.)
  const firstDayOfWeek = firstDayOfMonth.day();
  
  // Navegação de mês
  const handlePreviousMonth = () => {
    onChange(value.subtract(1, 'month'));
  };
  
  const handleNextMonth = () => {
    onChange(value.add(1, 'month'));
  };
  
  // Gerar dias para o calendário
  const getDaysArray = () => {
    const days = [];
    // Adicionar dias vazios para preencher o início
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Adicionar os dias do mês
    for (let i = 1; i <= lastDayOfMonth.date(); i++) {
      const date = dayjs().year(year).month(month).date(i);
      days.push(date);
    }
    
    return days;
  };
  
  const monthName = value.format('MMMM YYYY');
  
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        title={monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        titleTypographyProps={{ variant: 'h6', align: 'center', sx: { textTransform: 'capitalize' } }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handlePreviousMonth} size="small">
              <ArrowBackIcon />
            </IconButton>
            <IconButton onClick={handleNextMonth} size="small">
              <ArrowForwardIcon />
            </IconButton>
          </Box>
        }
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ pt: 1 }}>
        <Grid container spacing={1}>
          {/* Dias da semana */}
          {daysOfWeek.map((day, index) => (
            <Grid item xs={12/7} key={`header-${index}`}>
              <Box sx={{ 
                textAlign: 'center', 
                fontWeight: 'bold', 
                color: 'text.secondary', 
                py: 0.5 
              }}>
                {day}
              </Box>
            </Grid>
          ))}
          
          {/* Dias do mês */}
          {getDaysArray().map((date, index) => (
            <Grid item xs={12/7} key={`day-${index}`}>
              {date ? (
                <Chip
                  label={date.date()}
                  onClick={() => onDateSelect(date)}
                  color={isDateSelected(date) ? "primary" : (isHoliday(date) ? "error" : "default")}
                  variant={isDateSelected(date) ? "filled" : (isHoliday(date) ? "filled" : "outlined")}
                  sx={{ 
                    width: '100%', 
                    height: 32,
                    borderRadius: 1,
                    cursor: 'pointer'
                  }}
                />
              ) : (
                <Box sx={{ height: 32 }} />
              )}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

export default function HolidaysTab() {
  const [selectedDates, setSelectedDates] = useState([]);
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [holidayName, setHolidayName] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictingClasses, setConflictingClasses] = useState([]);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);

  // Carregar feriados existentes
  useEffect(() => {
    loadHolidays();
  }, []);

  // Carregar feriados do Firestore
  const loadHolidays = async () => {
    try {
      setLoading(true);
      const holidaysRef = collection(db, 'feriados');
      const holidaysSnapshot = await getDocs(holidaysRef);
      
      const holidaysData = holidaysSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date ? dayjs(doc.data().date.toDate()) : null
      }));
      
      setHolidays(holidaysData);
    } catch (error) {
      console.error('Erro ao carregar feriados:', error);
      showNotification('Erro ao carregar feriados', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Verificar se uma data já é feriado
  const isHoliday = (date) => {
    if (!date) return false;
    const dateObj = dayjs(date);
    return holidays.some(holiday => 
      holiday.date && dateObj && holiday.date.format('YYYY-MM-DD') === dateObj.format('YYYY-MM-DD')
    );
  };

  // Verificar se uma data está selecionada
  const isDateSelected = (date) => {
    if (!date) return false;
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return selectedDates.some(selectedDate => 
      dayjs(selectedDate).format('YYYY-MM-DD') === dateStr
    );
  };

  // Método para adicionar/remover datas
  const toggleDateSelection = (date) => {
    const dateObj = dayjs(date);
    const dateStr = dateObj.format('YYYY-MM-DD');
    
    setSelectedDates(prev => {
      const isAlreadySelected = prev.some(d => dayjs(d).format('YYYY-MM-DD') === dateStr);
      
      if (isAlreadySelected) {
        return prev.filter(d => dayjs(d).format('YYYY-MM-DD') !== dateStr);
      } else {
        return [...prev, dateObj];
      }
    });
  };

  // Verificar aulas agendadas nas datas selecionadas
  const checkExistingClasses = async () => {
    try {
      setLoading(true);
      const conflictingClasses = [];
      
      // Converter datas selecionadas para string no formato YYYY-MM-DD
      const datesStr = selectedDates.map(date => dayjs(date).format('YYYY-MM-DD'));
      
      // Buscar agendamentos
      const agendamentosQuery = query(
        collection(db, 'agendamentos'),
        where('status', '==', 'confirmado')
      );
      
      const agendamentosSnapshot = await getDocs(agendamentosQuery);
      
      // Para cada agendamento, verificar se há aulas nas datas selecionadas
      for (const agendamentoDoc of agendamentosSnapshot.docs) {
        const horariosRef = collection(agendamentoDoc.ref, 'horarios');
        
        // Para cada data selecionada, verificar separadamente
        for (const dateStr of datesStr) {
          const horariosQuery = query(
            horariosRef,
            where('data', '==', dateStr)
          );
          
          const horariosSnapshot = await getDocs(horariosQuery);
          
          if (!horariosSnapshot.empty) {
            horariosSnapshot.docs.forEach(horarioDoc => {
              const horarioData = horarioDoc.data();
              
              conflictingClasses.push({
                date: dateStr,
                formattedDate: dayjs(dateStr).format('DD/MM/YYYY'),
                horario: horarioData.horario,
                aluno: horarioData.nomeAluno,
                professor: horarioData.professorNome
              });
            });
          }
        }
      }
      
      if (conflictingClasses.length > 0) {
        setConflictingClasses(conflictingClasses);
        setConflictDialogOpen(true);
        return true; // Há conflitos
      }
      
      return false; // Não há conflitos
    } catch (error) {
      console.error('Erro ao verificar aulas agendadas:', error);
      showNotification('Erro ao verificar aulas agendadas', 'error');
      return true; // Por segurança, tratamos como se houvesse conflito
    } finally {
      setLoading(false);
    }
  };

  // Marcar feriados
  const markHolidays = async () => {
    try {
      setLoading(true);
      
      // Verificar se há aulas agendadas
      const hasConflicts = await checkExistingClasses();
      
      if (hasConflicts) {
        return; // Interrompe o processo se houver conflitos
      }
      
      // Abrir diálogo de confirmação
      setConfirmDialogOpen(true);
    } catch (error) {
      console.error('Erro ao marcar feriados:', error);
      showNotification('Erro ao processar feriados', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Salvar feriados após confirmação
  const saveHolidays = async () => {
    try {
      setLoading(true);
      setConfirmDialogOpen(false);
      
      const batch = writeBatch(db);
      
      // Para cada data selecionada, criar um documento de feriado
      for (const date of selectedDates) {
        const dateStr = date.format('YYYY-MM-DD');
        const feriado = {
          date: Timestamp.fromDate(date.toDate()),
          name: holidayName || 'Feriado/Férias',
          createdAt: serverTimestamp()
        };
        
        // Adicionar documento à coleção de feriados
        const feriadoRef = doc(collection(db, 'feriados'));
        batch.set(feriadoRef, feriado);
        
        // Para cada professor, bloquear os horários dessa data
        // Primeiro precisamos obter todos os professores
        const professoresSnapshot = await getDocs(collection(db, 'professores'));
        
        // Para cada dia da semana, obter os horários disponíveis
        const diaSemana = dayjs(dateStr).format('dddd');
        const diasSemanaMap = {
          'domingo': 'domingo',
          'segunda-feira': 'segunda',
          'terça-feira': 'terca',
          'quarta-feira': 'quarta',
          'quinta-feira': 'quinta',
          'sexta-feira': 'sexta',
          'sábado': 'sabado'
        };
        
        const diaSemanaKey = diasSemanaMap[diaSemana] || '';
        const horariosQuery = query(
          collection(db, 'horarios'),
          where('diaSemana', '==', diaSemanaKey)
        );
        
        const horariosSnapshot = await getDocs(horariosQuery);
        
        // Para cada horário e professor, bloquear o slot
        for (const horarioDoc of horariosSnapshot.docs) {
          const horarioData = horarioDoc.data();
          
          for (const professorId of horarioData.professores || []) {
            // Gerar um ID único para o slot
            const slotId = `${dateStr}_${horarioData.horario}`;
            const teacherSlotRef = doc(db, 'teacherSchedules', professorId, 'slots', slotId);
            
            // Bloquear o slot
            batch.set(teacherSlotRef, {
              data: dateStr,
              horario: horarioData.horario,
              professorId: professorId,
              professorNome: professoresSnapshot.docs.find(doc => doc.id === professorId)?.data().nome || 'Professor',
              status: 'confirmado',
              nomeAluno: feriado.name,
              email: 'feriado@sistema.com',
              telefone: '00000000000',
              bookedAt: serverTimestamp(),
              isFeriado: true
            });
          }
        }
      }
      
      await batch.commit();
      
      showNotification(`${selectedDates.length} dia(s) marcados como feriados com sucesso!`, 'success');
      setSelectedDates([]);
      setHolidayName('');
      loadHolidays(); // Recarregar a lista de feriados
    } catch (error) {
      console.error('Erro ao salvar feriados:', error);
      showNotification('Erro ao salvar feriados', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Deletar um feriado
  const deleteHoliday = async () => {
    try {
      setLoading(true);
      
      if (!holidayToDelete) return;
      
      const dateStr = holidayToDelete.date.format('YYYY-MM-DD');
      
      // Excluir o documento de feriado
      await deleteDoc(doc(db, 'feriados', holidayToDelete.id));
      
      // Buscar professores para remover os bloqueios
      const professoresSnapshot = await getDocs(collection(db, 'professores'));
      
      const batch = writeBatch(db);
      
      // Para cada professor, remover os bloqueios dessa data
      for (const professorDoc of professoresSnapshot.docs) {
        const professorId = professorDoc.id;
        
        // Buscar slots dessa data para esse professor
        const slotsQuery = query(
          collection(db, 'teacherSchedules', professorId, 'slots'),
          where('data', '==', dateStr),
          where('isFeriado', '==', true)
        );
        
        const slotsSnapshot = await getDocs(slotsQuery);
        
        // Excluir cada slot
        slotsSnapshot.docs.forEach(slotDoc => {
          batch.delete(slotDoc.ref);
        });
      }
      
      await batch.commit();
      
      showNotification('Feriado removido com sucesso!', 'success');
      setHolidayToDelete(null);
      loadHolidays(); // Recarregar a lista de feriados
    } catch (error) {
      console.error('Erro ao remover feriado:', error);
      showNotification('Erro ao remover feriado', 'error');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <CalendarMonthIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ color: '#1a1a1a', fontWeight: 600 }}>
            Gerenciamento de Feriados
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                Selecione os dias para marcar como feriado:
              </Typography>
              
              <Box sx={{ mb: 1, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Selecione os dias que deseja marcar como feriado
                </Typography>
              </Box>
              
              <SimpleCalendar 
                value={calendarDate}
                onChange={setCalendarDate}
                onDateSelect={toggleDateSelection}
                isDateSelected={isDateSelected}
                isHoliday={isHoliday}
              />
              
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Nome do Feriado (opcional)"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Ex: Natal, Carnaval, Férias coletivas"
                  helperText="Deixe em branco para usar 'Feriado/Férias' como padrão"
                  margin="normal"
                />
              </Box>

              <Box sx={{ display: 'flex', mt: 3, gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading || selectedDates.length === 0}
                  onClick={markHolidays}
                  startIcon={loading ? <CircularProgress size={20} /> : <EventBusyIcon />}
                >
                  {loading ? 'Processando...' : 'Marcar como Feriado'}
                </Button>
                <Button
                  variant="outlined"
                  disabled={loading || selectedDates.length === 0}
                  onClick={() => setSelectedDates([])}
                >
                  Limpar Seleção
                </Button>
              </Box>

              {selectedDates.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Datas selecionadas ({selectedDates.length}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {selectedDates.map((date, index) => (
                      <Chip 
                        key={index}
                        label={date.format('DD/MM/YYYY')}
                        onDelete={() => {
                          setSelectedDates(prev => prev.filter(d => d.format('YYYY-MM-DD') !== date.format('YYYY-MM-DD')));
                        }}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                Feriados cadastrados:
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : holidays.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
                  Nenhum feriado cadastrado
                </Typography>
              ) : (
                <List>
                  {holidays
                    .sort((a, b) => a.date && b.date ? a.date.diff(b.date) : 0)
                    .map((holiday) => (
                      <ListItem 
                        key={holiday.id}
                        secondaryAction={
                          <IconButton 
                            edge="end"
                            color="error"
                            onClick={() => {
                              setHolidayToDelete(holiday);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        }
                        divider
                      >
                        <ListItemText
                          primary={holiday.name}
                          secondary={holiday.date ? holiday.date.format('DD/MM/YYYY (dddd)') : 'Data desconhecida'}
                        />
                      </ListItem>
                    ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Diálogo de confirmação para marcação de feriados */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirmar Feriados</DialogTitle>
        <DialogContent>
          <Typography>
            Você está prestes a marcar {selectedDates.length} dia(s) como feriado. 
            Isso tornará indisponíveis todos os horários e professores dessas datas.
          </Typography>
          <Typography sx={{ mt: 2 }}>
            Deseja continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button onClick={saveHolidays} variant="contained" color="primary">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de conflito para aulas já agendadas */}
      <Dialog
        open={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Atenção! Existem aulas agendadas para as datas selecionadas
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Você precisa remarcar as seguintes aulas antes de marcar esses dias como feriado:
          </Typography>
          
          <List>
            {conflictingClasses.map((aula, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={`${aula.formattedDate} às ${aula.horario}`}
                  secondary={`Aluno: ${aula.aluno} | Professor: ${aula.professor}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialogOpen(false)} variant="contained">
            Entendi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação para exclusão de feriado */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Você está prestes a remover o feriado "{holidayToDelete?.name}" do dia {holidayToDelete?.date?.format('DD/MM/YYYY')}.
          </Typography>
          <Typography sx={{ mt: 2 }}>
            Isso liberará os horários para agendamento. Deseja continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={deleteHoliday} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificações */}
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
    </LocalizationProvider>
  );
} 