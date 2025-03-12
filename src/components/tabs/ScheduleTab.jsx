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
  const [weekCount, setWeekCount] = useState(1);
  const [expandedSlots, setExpandedSlots] = useState([]);
  const [unavailableDates, setUnavailableDates] = useState([]);

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

  // Inicializar as datas da semana (segunda a sábado)
  useEffect(() => {
    const today = dayjs();
    // Descobrir o dia da semana atual (0=domingo, 1=segunda, ..., 6=sábado)
    const currentDayOfWeek = today.day();
    
    // Calcular o início da semana (segunda-feira)
    let startOfWeek;
    if (currentDayOfWeek === 0) { // Se for domingo
      startOfWeek = today.subtract(6, 'day'); // Vai para a segunda-feira anterior
    } else {
      startOfWeek = today.subtract(currentDayOfWeek - 1, 'day'); // Vai para a segunda-feira da semana atual
    }
    
    // Criar array com os dias da semana (segunda a sábado)
    const weekDays = [];
    for (let i = 0; i < 6; i++) {
      // Criar uma nova instância para cada dia
      weekDays.push(dayjs(startOfWeek.format('YYYY-MM-DD')).add(i, 'day'));
    }
    
    setSelectedDates(weekDays);
  }, []);

  // Efeito para recalcular slots expandidos quando os slots selecionados mudarem
  useEffect(() => {
    // Se não houver slots selecionados, limpar os slots expandidos
    if (selectedSlots.length === 0) {
      setExpandedSlots([]);
      return;
    }
    
    // Se houver slots selecionados e weekCount > 1, recalcular os slots expandidos
    if (selectedSlots.length > 0 && weekCount > 1) {
      generateExpandedSlots(weekCount);
    }
  }, [selectedSlots]);
  
  // Efeito para recalcular quando existingBookings mudar (para refletir novas reservas)
  useEffect(() => {
    // Se temos slots expandidos, precisamos recalcular para refletir novas reservas
    if (expandedSlots.length > 0 && weekCount > 1) {
      console.log('Recalculando slots expandidos devido a mudanças em existingBookings');
      generateExpandedSlots(weekCount);
    }
  }, [existingBookings]);

  // Atualizar selectedDates quando baseDate mudar
  useEffect(() => {
    // Descobrir o dia da semana da baseDate (0=domingo, 1=segunda, ..., 6=sábado)
    const baseDayOfWeek = baseDate.day();
    
    // Calcular o início da semana (segunda-feira)
    let startOfWeek;
    if (baseDayOfWeek === 0) { // Se for domingo
      startOfWeek = baseDate.subtract(6, 'day'); // Vai para a segunda-feira anterior
    } else {
      startOfWeek = baseDate.subtract(baseDayOfWeek - 1, 'day'); // Vai para a segunda-feira da semana atual
    }
    
    // Criar array com os dias da semana (segunda a sábado)
    const weekDays = [];
    for (let i = 0; i < 6; i++) {
      // Criar uma nova instância para cada dia
      weekDays.push(dayjs(startOfWeek.format('YYYY-MM-DD')).add(i, 'day'));
    }
    
    setSelectedDates(weekDays);
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
        })).sort((a, b) => {
          // Ordena os horários do mais cedo para o mais tarde
          return a.horario.localeCompare(b.horario);
        });
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
    console.log('Carregando agendamentos existentes...');
    try {
      const bookingsData = {};
      const datesArray = selectedDates.map(date => date.format('YYYY-MM-DD'));
      
      if (datesArray.length === 0) return bookingsData; // Se não houver datas selecionadas, retorna objeto vazio

      // Buscar todas as datas futuras necessárias para expandir semanas
      // Determinar a data mais distante que precisamos verificar
      let datasNecessarias = [...datesArray];
      
      // Se tivermos weekCount > 1, calcular as datas adicionais que precisamos verificar
      if (weekCount > 1 && selectedSlots.length > 0) {
        // Para cada slot selecionado, gerar datas futuras para todas as semanas
        for (const slotKey of Object.keys(selectedTeachers)) {
          const slot = selectedTeachers[slotKey];
          const baseDate = dayjs(slot.date);
          
          // Gerar datas para cada semana adicional
          for (let week = 1; week < weekCount; week++) {
            const newDate = baseDate.add(week * 7, 'day');
            const dateStr = newDate.format('YYYY-MM-DD');
            if (!datasNecessarias.includes(dateStr)) {
              datasNecessarias.push(dateStr);
            }
          }
        }
        
        console.log('Datas necessárias para verificação:', datasNecessarias);
      }

      // Buscar apenas os agendamentos com status confirmado
      const agendamentosRef = collection(db, 'agendamentos');
      const agendamentosQuery = query(
        agendamentosRef,
        where('status', '==', 'confirmado')
      );
      const agendamentosSnapshot = await getDocs(agendamentosQuery);
      
      console.log(`Encontrados ${agendamentosSnapshot.size} agendamentos confirmados`);
      
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
        
        // Se houver mais de uma data, usa where in com todas as datas necessárias
        if (datasNecessarias.length > 1) {
          // Dividir em grupos de 10 datas para evitar limite da query
          const chunks = [];
          for (let i = 0; i < datasNecessarias.length; i += 10) {
            chunks.push(datasNecessarias.slice(i, i + 10));
          }
          
          // Fazer uma query para cada grupo de datas
          for (const chunk of chunks) {
            horariosQuery = query(
              horariosRef,
              where('data', 'in', chunk)
            );
            
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
          }
        } else {
          // Se houver apenas uma data, usa where equal
          horariosQuery = query(
            horariosRef,
            where('data', '==', datasNecessarias[0])
          );
          
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
        }
      });
      
      await Promise.all(horariosPromises);
      console.log('Agendamentos carregados:', Object.keys(bookingsData).length, bookingsData);
      setExistingBookings(bookingsData);
      return bookingsData;
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      showNotification('Erro ao carregar agendamentos', 'error');
      return {};
    }
  };

  // Polling para verificar novos agendamentos
  useEffect(() => {
    // Carregar agendamentos inicialmente
    console.log('Configurando polling para verificar agendamentos...');
    loadExistingBookings();

    // Configurar o intervalo para verificar a cada segundo
    const interval = setInterval(() => {
      loadExistingBookings().then(bookings => {
        // Verificar se houve mudanças nos slots expandidos
        if (expandedSlots.length > 0 && weekCount > 1) {
          // Verificar se algum slot que estava disponível agora está ocupado
          const algumSlotIndisponivel = expandedSlots.some(slot => {
            if (slot.available) { // Se estava disponível antes
              const key = `${slot.date}-${slot.horario}-${slot.professorId}`;
              // Verificar se agora está indisponível
              return bookings[key] !== undefined;
            }
            return false;
          });
          
          // Se algum slot ficou indisponível, notificar o usuário
          if (algumSlotIndisponivel && openAgendamentoModal) {
            console.log('ALERTA: Um slot que estava disponível agora está ocupado!');
            showNotification('Atenção: Um ou mais horários que você selecionou acabaram de ser reservados por outra pessoa. Por favor, verifique sua seleção.', 'error');
            // Forçar a regeneração dos slots
            generateExpandedSlots(weekCount);
          }
        }
      });
    }, 3000); // Aumentado para 3 segundos para reduzir carga no servidor

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  }, [selectedDates, weekCount]); // Recriar o intervalo quando as datas ou semanas mudarem

  const formatDate = (date) => {
    // Formato mais compacto: "Segunda 23/10" em vez de "segunda-feira 23/10/23"
    const diaSemana = date.format('dddd').split('-')[0]; // Pega só a primeira parte (ex: "segunda" em vez de "segunda-feira")
    return `${diaSemana} ${date.format('DD/MM')}`;
  };

  const handlePreviousDays = () => {
    setBaseDate(prev => prev.subtract(7, 'day'));
  };

  const handleNextDays = () => {
    setBaseDate(prev => prev.add(7, 'day'));
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
    // Garantir que verificamos a disponibilidade novamente antes de abrir o modal
    console.log('Abrindo modal de agendamento - verificando disponibilidade');
    
    // Atualizar os agendamentos existentes antes de gerar slots
    loadExistingBookings().then(() => {
      // Gerar slots expandidos com os dados mais recentes
      generateExpandedSlots(weekCount);
      setOpenAgendamentoModal(true);
    });
  };

  // Função para limpar todos os estados de seleção
  const resetSelectionStates = () => {
    console.log('Limpando todos os estados de seleção');
    setSelectedSlots([]);
    setSelectedTeachers({});
    setExpandedSlots([]);
    setUnavailableDates([]);
    setWeekCount(1);
    setAgendamentoForm({
      nomeAluno: '',
      email: '',
      telefone: '',
      cpf: '',
      observacoes: ''
    });
  };

  const handleCloseAgendamento = () => {
    setOpenAgendamentoModal(false);
    resetSelectionStates();
  };

  const handleAgendamentoChange = (event) => {
    const { name, value } = event.target;
    setAgendamentoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWeekCountChange = (event) => {
    const value = parseInt(event.target.value);
    if (value >= 1) {
      setWeekCount(value);
      generateExpandedSlots(value);
    }
  };

  // Gera os slots expandidos para várias semanas
  const generateExpandedSlots = async (weeks) => {
    if (weeks <= 0 || Object.keys(selectedTeachers).length === 0) {
      setExpandedSlots([]);
      return;
    }

    console.log('Gerando slots expandidos para', weeks, 'semanas');
    console.log('Slots selecionados:', selectedTeachers);
    console.log('Agendamentos existentes:', existingBookings);
    
    const expanded = [];
    const unavailable = [];

    // Para cada slot selecionado
    for (const slotKey of Object.keys(selectedTeachers)) {
      const slot = selectedTeachers[slotKey];
      const baseDate = dayjs(slot.date);
      const dayOfWeek = baseDate.day(); // 0-6 (domingo-sábado)
      
      console.log(`Processando slot: ${slotKey} - Data base: ${baseDate.format('DD/MM/YYYY')} (${dayOfWeek})`);

      // Para cada semana
      for (let week = 0; week < weeks; week++) {
        // Adicionar 7 dias para cada semana
        const newDate = baseDate.add(week * 7, 'day');
        const dateStr = newDate.format('YYYY-MM-DD');
        const bookingKey = `${dateStr}-${slot.horario}-${slot.professorId}`;
        
        console.log(`Semana ${week}: Data: ${dateStr}, Key: ${bookingKey}`);
        console.log(`Verificando disponibilidade: ${bookingKey in existingBookings ? 'OCUPADO' : 'LIVRE'}`);
        
        // Criar o slot expandido
        const expandedSlot = {
          ...slot,
          date: dateStr,
          originalDate: slot.date,
          week,
          available: true
        };

        // Verificar disponibilidade do slot, inclusive para a primeira semana
        if (existingBookings[bookingKey]) {
          expandedSlot.available = false;
          unavailable.push(`O horário do dia ${dayjs(dateStr).format('DD/MM/YYYY')} às ${slot.horario} com ${slot.professorNome} não está disponível.`);
          console.log(`SLOT INDISPONÍVEL: ${bookingKey}`);
        }

        expanded.push(expandedSlot);
      }
    }

    console.log('Slots expandidos completos:', expanded);
    console.log('Slots indisponíveis:', unavailable);
    
    setExpandedSlots(expanded);
    setUnavailableDates(unavailable);

    // Mostrar notificação se houver horários indisponíveis
    if (unavailable.length > 0) {
      showNotification(
        `Alguns horários não estão disponíveis: ${unavailable[0]}${unavailable.length > 1 ? ` e mais ${unavailable.length - 1} horário(s)` : ''}`,
        'warning'
      );
    }
    
    return { expanded, hasUnavailable: unavailable.length > 0 };
  };
  
  // Verificar se todos os slots estão disponíveis
  const allSlotsAvailable = () => {
    const result = expandedSlots.length > 0 && expandedSlots.every(slot => slot.available);
    console.log('Verificação allSlotsAvailable:', result, expandedSlots);
    return result;
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
        size="small"
        sx={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          zIndex: 1000,
          borderRadius: 3,
          boxShadow: 2,
          py: 0.5,
          px: 1.5,
          fontSize: '0.75rem'
        }}
        onClick={isPublic ? handlePublicAgendamento : handleOpenAgendamento}
      >
        Agendar {selectedSlots.length} aula{selectedSlots.length > 1 ? 's' : ''}
      </Button>
    );
  };

  const handlePublicAgendamento = () => {
    setAgendamentoForm(prev => ({
      ...prev,
      isPublic: true
    }));
    
    // Garantir verificação de disponibilidade
    loadExistingBookings().then(() => {
      generateExpandedSlots(weekCount);
      setOpenAgendamentoModal(true);
    });
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
      console.log('=== INICIANDO SALVAMENTO DE AGENDAMENTO ===');
      
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

      // Forçar regeneração dos slots expandidos para ter certeza que estamos com os dados atualizados
      const { expanded, hasUnavailable } = await generateExpandedSlots(weekCount);
      console.log('Verificação final de slots indisponíveis:', hasUnavailable);
      
      // Verificar slots disponíveis após reavaliação (dupla verificação para garantir)
      const todosDisponiveis = expanded.every(slot => slot.available);
      console.log('Verificação de disponibilidade de todos os slots:', todosDisponiveis);
      
      // Validar se todos os slots expandidos estão disponíveis
      if (hasUnavailable || !todosDisponiveis) {
        showNotification('Existem horários indisponíveis. Por favor, selecione menos semanas ou escolha outros horários.', 'error');
        return;
      }

      setSaving(true);
      console.log('Iniciando salvamento - Todos os slots estão disponíveis');

      // Definir os horários que serão agendados (slots expandidos ou slots normais)
      const horariosToSchedule = expanded.length > 0 
        ? expanded.filter(slot => slot.available) 
        : Object.values(selectedTeachers);
      
      console.log('Horários para agendar:', horariosToSchedule);

      if (isPublic) {
        // Preparar dados do agendamento
        const horarios = horariosToSchedule.map(slot => ({
          date: slot.date,
          horario: slot.horario,
          professorId: slot.professorId,
          professorNome: slot.professorNome
        }));

        // Calcular valor total
        const totalAulas = horarios.length;
        const valorPorAula = getValuePerClass(totalAulas);
        const valorTotal = totalAulas * valorPorAula;
        
        console.log(`Processando pagamento para ${totalAulas} aulas, valor total: ${valorTotal}`);

        // Criar sessão de pagamento no Stripe
        try {
          const response = await fetch('/api/stripe/create-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: valorTotal,
              payer: {
                name: agendamentoForm.nomeAluno,
                email: agendamentoForm.email,
                tax_id: agendamentoForm.cpf.replace(/[^0-9]/g, ''),
                phone: agendamentoForm.telefone.replace(/[^0-9]/g, ''),
                observacoes: agendamentoForm.observacoes || ''
              },
              items: [{
                name: `${totalAulas} aula(s) de patinação`,
                quantity: 1
              }],
              horarios
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.details || 'Erro ao criar sessão de pagamento');
          }

          const data = await response.json();
          
          if (data.url) {
            // Limpar os estados antes de redirecionar
            resetSelectionStates();
            window.location.href = data.url;
          } else {
            throw new Error('URL de pagamento não recebida');
          }
        } catch (error) {
          console.error('Erro ao criar sessão de pagamento:', error);
          showNotification('Erro ao processar pagamento. Por favor, tente novamente.', 'error');
          setSaving(false);
        }
      } else {
        // Lógica existente para agendamento administrativo
        const agendamentoData = {
          ...agendamentoForm,
          horarios: horariosToSchedule.map(slot => ({
            data: slot.date,
            horario: slot.horario,
            professorId: slot.professorId,
            professorNome: slot.professorNome
          }))
        };

        await saveAgendamento(agendamentoData);
        // Fechar modal e limpar estados
        setOpenAgendamentoModal(false);
        resetSelectionStates();
        // Recarregar agendamentos existentes para atualização imediata da interface
        await loadExistingBookings();
        showNotification('Agendamento realizado com sucesso!', 'success');
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
        spacing={0.5} 
        alignItems="center" 
        justifyContent="center"
        sx={{ mb: 0.5 }}
      >
        <Tooltip title="Semana anterior">
          <IconButton 
            onClick={handlePreviousDays}
            size="small"
            sx={{ 
              backgroundColor: alpha('#1976d2', 0.04),
              p: 1,
              '&:hover': {
                backgroundColor: alpha('#1976d2', 0.08),
              }
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: '1.8rem' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Voltar para a semana atual">
          <IconButton 
            onClick={handleToday}
            size="small"
            sx={{ 
              backgroundColor: alpha('#1976d2', 0.04),
              p: 1,
              '&:hover': {
                backgroundColor: alpha('#1976d2', 0.08),
              }
            }}
          >
            <TodayIcon sx={{ fontSize: '1.8rem' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Próxima semana">
          <IconButton 
            onClick={handleNextDays}
            size="small"
            sx={{ 
              backgroundColor: alpha('#1976d2', 0.04),
              p: 1,
              '&:hover': {
                backgroundColor: alpha('#1976d2', 0.08),
              }
            }}
          >
            <ChevronRightIcon sx={{ fontSize: '1.8rem' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Grid container spacing={0.3}>
        {selectedDates.map((date) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={date.format('YYYY-MM-DD')}>
            <Paper 
              elevation={1}
              sx={{ 
                p: { xs: 0.5, sm: 0.75 }, 
                height: '100%',
                borderRadius: 1,
                background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
                transition: 'all 0.15s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: 1
                }
              }}
            >
              <Typography 
                variant="subtitle1" 
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textTransform: 'capitalize',
                  mb: 0.5,
                  backgroundColor: '#ffffff',
                  pb: 0.2,
                  textAlign: 'center'
                }}
              >
                {formatDate(date)}
              </Typography>
              <Divider sx={{ mb: 0.5 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>Carregando...</Typography>
                </Box>
              ) : (
                <Box>
                  {schedules[date.format('YYYY-MM-DD')]?.map((schedule) => (
                    <Box key={schedule.id} sx={{ mb: 0.5 }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 600,
                          backgroundColor: '#444444',
                          color: '#ffffff',
                          px: 0.75,
                          py: 0.4,
                          borderRadius: 0.8,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                      >
                        {schedule.horario}
                      </Typography>
                      <Box>
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
                                p: 0.3,
                                my: 0.3,
                                cursor: isBooked ? 'default' : 'pointer',
                                borderRadius: 0.8,
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
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '80%'
                                }}
                              >
                                {teachers[profId]?.nome || 'Carregando...'}
                                {isBooked && ` - ${existingBookings[bookingKey].nomeAluno.split(' ')[0]}`}
                              </Typography>
                              {isBooked && !isPublic && (
                                <Box sx={{ display: 'flex', gap: 0.2 }}>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewClick(existingBookings[bookingKey]);
                                    }}
                                    sx={{
                                      opacity: 0.7,
                                      padding: 0.2,
                                      '&:hover': {
                                        opacity: 1
                                      }
                                    }}
                                  >
                                    <VisibilityIcon sx={{ fontSize: '0.7rem' }} />
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
                                      padding: 0.2,
                                      '&:hover': {
                                        opacity: 1
                                      }
                                    }}
                                  >
                                    <DeleteOutlineIcon sx={{ fontSize: '0.7rem' }} />
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
                      variant="body2"
                      sx={{ 
                        textAlign: 'center',
                        color: 'text.disabled',
                        fontStyle: 'italic',
                        mt: 0.5,
                        p: 0.5,
                        backgroundColor: alpha('#000', 0.02),
                        borderRadius: 0.8,
                        fontSize: '0.65rem'
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
              {expandedSlots.length > 0 ? (
                <>
                  {expandedSlots.some(slot => !slot.available) && (
                    <Alert 
                      severity="error" 
                      sx={{ mb: 2 }}
                      action={
                        <Button 
                          color="error" 
                          size="small"
                          onClick={() => {
                            // Encontrar o maior número de semanas sem conflitos
                            let maxSemanasSemConflito = 1;
                            for (let w = weekCount - 1; w >= 1; w--) {
                              const { expanded } = generateExpandedSlots(w);
                              if (expanded.every(s => s.available)) {
                                maxSemanasSemConflito = w;
                                break;
                              }
                            }
                            setWeekCount(maxSemanasSemConflito);
                            generateExpandedSlots(maxSemanasSemConflito);
                            showNotification(`Ajustado para ${maxSemanasSemConflito} semana(s) sem conflitos.`, 'success');
                          }}
                        >
                          Ajustar automaticamente
                        </Button>
                      }
                    >
                      Existem horários indisponíveis. Você precisa reduzir o número de semanas ou escolher outros horários.
                    </Alert>
                  )}
                  {expandedSlots.map((slot, index) => (
                    <Typography key={index} color={slot.available ? "text.secondary" : "error"}>
                      • {dayjs(slot.date).format('DD/MM/YYYY')} às {slot.horario} com {slot.professorNome}
                      {!slot.available && " (Indisponível)"}
                    </Typography>
                  ))}
                </>
              ) : (
                Object.values(selectedTeachers).map((slot, index) => (
                  <Typography key={index} color="text.secondary">
                    • {dayjs(slot.date).format('DD/MM/YYYY')} às {slot.horario} com {slot.professorNome}
                  </Typography>
                ))
              )}
            </Box>

            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                label="Agendar por X semanas"
                type="number"
                value={weekCount}
                onChange={handleWeekCountChange}
                InputProps={{ inputProps: { min: 1 } }}
                sx={{ width: 200 }}
                helperText="Valor padrão: 1 semana"
                error={expandedSlots.some(slot => !slot.available)}
              />
              <Typography variant="subtitle1">
                Total de aulas: {expandedSlots.length > 0 ? expandedSlots.filter(slot => slot.available).length : selectedSlots.length}
              </Typography>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Valor total: R$ {(expandedSlots.length > 0 ? expandedSlots.filter(slot => slot.available).length : selectedSlots.length) * getValuePerClass(expandedSlots.length > 0 ? expandedSlots.filter(slot => slot.available).length : selectedSlots.length)}
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