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
  Alert,
  CircularProgress,
  Autocomplete,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  DeleteOutline as DeleteOutlineIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  Print as PrintIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
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
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { alpha } from '@mui/material/styles';
import IndividualLessonForm from '../reports/IndividualLessonForm';

dayjs.locale('pt-br');

export default function ScheduleTab({ isPublic = false, saveAgendamento, packagesEndingSoon = {} }) {
  const { currentUser } = useAuth();
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
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const REFRESH_INTERVAL = 300000; // 5 minutos em milissegundos
  const [holidayDates, setHolidayDates] = useState([]); // Novo estado para armazenar datas de feriados
  const [students, setStudents] = useState([]); // Estado para armazenar alunos cadastrados
  const [printData, setPrintData] = useState(null); // Novo estado para armazenar dados do agendamento para impressão
  const [selectedStudent, setSelectedStudent] = useState(null); // Estado para rastrear o aluno selecionado
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false); // Estado para controlar o filtro de horários disponíveis
  const [copyNotification, setCopyNotification] = useState({
    open: false,
    message: ''
  }); // Estado para notificação de cópia
  const [weekCountInput, setWeekCountInput] = useState('1'); // Estado para controlar a entrada de texto do campo de semanas
  const [editableObservacoes, setEditableObservacoes] = useState(''); // Novo estado para as observações editáveis
  const [savingObservacoes, setSavingObservacoes] = useState(false); // Estado para controlar o salvamento

  // Função para atualização manual dos dados
  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      await loadHolidays();
      await loadExistingBookings(true); // Força a atualização
      showNotification('Dados atualizados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      showNotification('Erro ao atualizar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com fechamento da ficha de impressão
  const handlePrintClose = () => {
    console.log('Fechando a ficha de impressão');
    // Garante que o estado seja limpo após um pequeno atraso
    // para permitir que o componente seja completamente desmontado
    setTimeout(() => {
      setPrintData(null);
      
      // Se a visualização estiver aberta e o usuário clicou no botão imprimir,
      // não fechar o modal de visualização
    }, 100);
  };

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
  
  // Atualizar weekCountInput quando weekCount mudar
  useEffect(() => {
    setWeekCountInput(String(weekCount));
  }, [weekCount]);
  
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

  // Nova função para carregar os feriados
  const loadHolidays = async () => {
    try {
      console.log('Carregando feriados...');
      const holidaysRef = collection(db, 'feriados');
      const holidaysSnapshot = await getDocs(holidaysRef);
      
      const holidayDatesArray = holidaysSnapshot.docs.map(doc => {
        const data = doc.data();
        if (data.date) {
          return dayjs(data.date.toDate()).format('YYYY-MM-DD');
        }
        return null;
      }).filter(date => date !== null);
      
      console.log('Feriados carregados:', holidayDatesArray);
      setHolidayDates(holidayDatesArray);
    } catch (error) {
      console.error('Erro ao carregar feriados:', error);
    }
  };

  // Função auxiliar para verificar se uma data é feriado
  const isHoliday = (date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return holidayDates.includes(dateStr);
  };

  // useEffect para carregar feriados ao iniciar o componente
  useEffect(() => {
    loadHolidays();
  }, []);

  // useEffect para carregar alunos ao iniciar o componente
  useEffect(() => {
    loadStudents();
  }, []);

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
  const loadExistingBookings = async (forceRefresh = false) => {
    // Se já houve uma atualização recente (menos de 10 segundos) e não é uma chamada forçada, 
    // não atualiza para evitar carregamentos desnecessários durante navegação rápida
    const currentTime = Date.now();
    if (lastUpdateTime && currentTime - lastUpdateTime < 10000 && !forceRefresh) {
      console.log('Ignorando atualização: última atualização muito recente');
      return existingBookings; // Retorna os dados já carregados
    }

    console.log('Carregando agendamentos existentes...');
    
    // Recarregar os feriados para garantir que temos a lista mais atualizada
    if (forceRefresh) {
      await loadHolidays();
    }
    
    try {
      const bookingsData = {};
      
      // Usar apenas as datas que estão sendo exibidas na semana atual
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

      // Buscar apenas os agendamentos com status confirmado e nas datas necessárias
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
      
      // Buscar horários apenas para as datas necessárias
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
        } else if (datasNecessarias.length === 1) {
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
      
      // Adicionar marcações para datas de feriados
      // Isso fará com que os feriados apareçam como slots indisponíveis
      for (const dateStr of holidayDates) {
        if (datasNecessarias.includes(dateStr)) {
          // Para cada horário nesta data
          if (schedules[dateStr]) {
            schedules[dateStr].forEach(schedule => {
              schedule.professores?.forEach(professorId => {
                const key = `${dateStr}-${schedule.horario}-${professorId}`;
                if (!bookingsData[key]) {
                  bookingsData[key] = {
                    data: dateStr,
                    horario: schedule.horario,
                    professorId: professorId,
                    agendamentoId: 'feriado',
                    nomeAluno: 'Feriado/Férias'
                  };
                }
              });
            });
          }
        }
      }
      
      setExistingBookings(bookingsData);
      setLastUpdateTime(Date.now());
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
    loadExistingBookings(true);

    // Configurar o intervalo para verificar a cada 5 minutos
    const interval = setInterval(() => {
      console.log('Verificação programada de agendamentos (a cada 5 minutos)');
      loadExistingBookings(true).then(bookings => {
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
    }, REFRESH_INTERVAL); // 5 minutos

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  }, [selectedDates, weekCount]); // Recriar o intervalo quando as datas ou semanas mudarem

  // Atualizar os dados quando o usuário navega entre as semanas
  useEffect(() => {
    loadHolidays(); // Carregar feriados quando mudar de semana
    loadExistingBookings();
  }, [baseDate]);

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
    const dateStr = date.format('YYYY-MM-DD');
    
    // Verificar se a data é um feriado
    if (holidayDates.includes(dateStr)) {
      showNotification('Este dia está marcado como feriado/férias e não está disponível para agendamento.', 'error');
      return;
    }
    
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
    setSelectedStudent(null); // Limpar o aluno selecionado
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
    const inputValue = event.target.value;
    setWeekCountInput(inputValue);
    
    // Converter para número apenas se não estiver vazio
    if (inputValue !== '') {
      const value = parseInt(inputValue);
      if (value >= 1) {
        setWeekCount(value);
        generateExpandedSlots(value);
      }
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
    const skippedDates = []; // Array para armazenar datas que foram puladas

    // Para cada slot selecionado
    for (const slotKey of Object.keys(selectedTeachers)) {
      const slot = selectedTeachers[slotKey];
      const baseDate = dayjs(slot.date);
      const dayOfWeek = baseDate.day(); // 0-6 (domingo-sábado)
      
      console.log(`Processando slot: ${slotKey} - Data base: ${baseDate.format('DD/MM/YYYY')} (${dayOfWeek})`);

      let remainingWeeks = weeks; // Contador para semanas restantes a agendar
      let currentWeek = 0; // Semana atual sendo processada
      let maxTries = weeks * 4; // Limite máximo de tentativas (evita loops infinitos)
      let tries = 0;

      // Continuar gerando slots até termos o número desejado de semanas ou atingir o limite de tentativas
      while (remainingWeeks > 0 && tries < maxTries) {
        // Adicionar 7 dias para cada semana
        const newDate = baseDate.add(currentWeek * 7, 'day');
        const dateStr = newDate.format('YYYY-MM-DD');
        const bookingKey = `${dateStr}-${slot.horario}-${slot.professorId}`;
        
        console.log(`Tentativa ${tries+1}: Semana ${currentWeek}: Data: ${dateStr}, Key: ${bookingKey}`);
        
        // Criar o slot expandido
        const expandedSlot = {
          ...slot,
          date: dateStr,
          originalDate: slot.date,
          week: currentWeek,
          available: true,
          isSkipped: false
        };

        // Verificar disponibilidade do slot
        let isAvailable = true;

        // Verificar se já existe um agendamento
        if (existingBookings[bookingKey]) {
          isAvailable = false;
          expandedSlot.available = false;
          expandedSlot.isSkipped = true;
          skippedDates.push(`O horário do dia ${dayjs(dateStr).format('DD/MM/YYYY')} às ${slot.horario} com ${slot.professorNome} não está disponível.`);
          console.log(`SLOT INDISPONÍVEL: ${bookingKey} - Pulando para a próxima semana`);
        }

        // Verificar se é feriado
        if (holidayDates.includes(dateStr)) {
          isAvailable = false;
          expandedSlot.available = false;
          expandedSlot.isSkipped = true;
          skippedDates.push(`O dia ${dayjs(dateStr).format('DD/MM/YYYY')} está marcado como feriado. Buscando próxima data disponível.`);
          console.log(`SLOT INDISPONÍVEL (FERIADO): ${dateStr} - Pulando para a próxima semana`);
        }

        // Se o slot não estiver disponível, vamos pular para a próxima semana,
        // mas ainda adicionamos o slot à lista para exibição (marcado como isSkipped)
        if (!isAvailable) {
          expanded.push(expandedSlot);
          currentWeek++; // Avançar para a próxima semana
          tries++;
          continue; // Continuar para a próxima iteração sem decrementar remainingWeeks
        }

        // Se chegou aqui, o slot está disponível
        expanded.push(expandedSlot);
        remainingWeeks--; // Decrementar contador de semanas restantes
        currentWeek++; // Avançar para a próxima semana
        tries++;
      }
    }

    console.log('Slots expandidos completos:', expanded);
    console.log('Slots pulados:', skippedDates);
    
    setExpandedSlots(expanded);
    setUnavailableDates(skippedDates);

    // Mostrar notificação se houver datas puladas
    if (skippedDates.length > 0) {
      showNotification(
        `Algumas datas foram puladas por indisponibilidade: ${skippedDates[0]}${skippedDates.length > 1 ? ` e mais ${skippedDates.length - 1} data(s)` : ''}`,
        'warning'
      );
    }
    
    // Verificar se conseguimos gerar slots suficientes
    const availableSlots = expanded.filter(slot => slot.available);
    const hasUnavailable = expanded.some(slot => !slot.available);
    
    return { 
      expanded, 
      hasUnavailable,
      availableCount: availableSlots.length,
      skippedDates
    };
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
        // Buscar horários associados ao agendamento
        const horariosRef = collection(agendamentoRef, 'horarios');
        const horariosSnapshot = await getDocs(horariosRef);
        
        const horarios = horariosSnapshot.docs.map(doc => ({
          ...doc.data()
        }));
        
        // Combinar dados do agendamento com os horários
        const agendamentoCompleto = {
          ...booking,
          ...agendamentoDoc.data(),
          horarios: horarios
        };
        
        // Inicializar o estado das observações editáveis
        setEditableObservacoes(agendamentoDoc.data().observacoes || '');
        
        setViewBooking(agendamentoCompleto);
        setViewBookingOpen(true);
      } else {
        // Inicializar o estado das observações editáveis
        setEditableObservacoes(booking.observacoes || '');
        
        setViewBooking(booking);
        setViewBookingOpen(true);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da reserva:', error);
      showNotification('Erro ao carregar detalhes da reserva', 'error');
    }
  };

  // Função para controlar o checkbox de mostrar apenas horários disponíveis
  const handleShowOnlyAvailableChange = (event) => {
    setShowOnlyAvailable(event.target.checked);
  };

  // Função para imprimir ficha de agendamento
  const handlePrintBooking = (booking) => {
    try {
      console.log('Preparando dados para impressão:', booking);
      
      // Verificar se o booking possui todos os dados necessários
      if (!booking || !booking.horarios || booking.horarios.length === 0) {
        showNotification('Não foi possível imprimir a ficha. Dados incompletos.', 'error');
        return;
      }
      
      // Preparar dados para impressão
      const printDataObj = {
        ...booking,
        id: booking.agendamentoId,
        nomeAluno: booking.nomeAluno,
        email: booking.email || '',
        telefone: booking.telefone || '',
        observacoes: booking.observacoes || '',
        matricula: booking.matricula || '',
        responsavelFinanceiro: booking.responsavelFinanceiro || {},
        telefoneResponsavel: booking.telefoneResponsavel || booking.telefone || '',
        horarios: booking.horarios || [{ 
          data: booking.data, 
          horario: booking.horario, 
          professorId: booking.professorId,
          professorNome: booking.professorNome
        }]
      };
      
      console.log('Dados preparados para impressão:', printDataObj);
      
      // Definir dados para impressão
      setPrintData(printDataObj);
    } catch (error) {
      console.error('Erro ao preparar dados para impressão:', error);
      showNotification('Erro ao preparar impressão.', 'error');
    }
  };

  // Função para formatar e copiar horários disponíveis de um dia específico
  const formatDaySchedule = (dateStr) => {
    if (!schedules[dateStr]) return '';

    const daySchedules = schedules[dateStr];
    const date = dayjs(dateStr);
    const formattedDate = `${date.format('dddd').charAt(0).toUpperCase() + date.format('dddd').slice(1)} ${date.format('DD/MM')}`;
    
    let message = `📅 HORÁRIOS DISPONÍVEIS - ${formattedDate}:\n\n`;
    
    let hasAvailableSlots = false;
    daySchedules.forEach(schedule => {
      // Filtrar professores disponíveis para este horário
      const availableProfessors = schedule.professores?.filter(profId => {
        const bookingKey = `${dateStr}-${schedule.horario}-${profId}`;
        return !existingBookings[bookingKey]; // Mostrar apenas se não estiver reservado
      });
      
      if (availableProfessors && availableProfessors.length > 0) {
        hasAvailableSlots = true;
        message += `🕒 ${schedule.horario}:\n`;
        
        availableProfessors.forEach(profId => {
          message += `   - ${teachers[profId]?.nome || 'Professor'}\n`;
        });
        message += '\n';
      }
    });
    
    if (!hasAvailableSlots) {
      message += "Não há horários disponíveis neste dia.\n";
    }
    
    message += "\nPara agendar, entre em contato conosco pelo WhatsApp.";
    
    return message;
  };
  
  // Função para copiar horários de um dia específico
  const handleCopyDaySchedule = (dateStr) => {
    const message = formatDaySchedule(dateStr);
    navigator.clipboard.writeText(message);
    setCopyNotification({
      open: true,
      message: `Horários de ${dayjs(dateStr).format('DD/MM')} copiados!`
    });
  };
  
  // Função para formatar e copiar horários disponíveis da semana inteira
  const formatWeekSchedule = () => {
    let message = `📅 HORÁRIOS DISPONÍVEIS DA SEMANA:\n\n`;
    
    let hasAnyAvailableSlots = false;
    
    for (const date of selectedDates) {
      const dateStr = date.format('YYYY-MM-DD');
      if (!schedules[dateStr]) continue;
      
      const daySchedules = schedules[dateStr];
      const formattedDate = `${date.format('dddd').charAt(0).toUpperCase() + date.format('dddd').slice(1)} ${date.format('DD/MM')}`;
      
      let hasDayAvailableSlots = false;
      let dayMessage = `📌 ${formattedDate}:\n`;
      
      daySchedules.forEach(schedule => {
        // Filtrar professores disponíveis para este horário
        const availableProfessors = schedule.professores?.filter(profId => {
          const bookingKey = `${dateStr}-${schedule.horario}-${profId}`;
          return !existingBookings[bookingKey]; // Mostrar apenas se não estiver reservado
        });
        
        if (availableProfessors && availableProfessors.length > 0) {
          dayMessage += `🕒 ${schedule.horario}:\n`;
          
          availableProfessors.forEach(profId => {
            hasDayAvailableSlots = true;
            hasAnyAvailableSlots = true;
            dayMessage += `   - ${teachers[profId]?.nome || 'Professor'}\n`;
          });
        }
      });
      
      if (hasDayAvailableSlots) {
        message += dayMessage + '\n';
      }
    }
    
    if (!hasAnyAvailableSlots) {
      message += "Não há horários disponíveis nesta semana.\n";
    }
    
    message += "\nPara agendar, entre em contato conosco pelo WhatsApp.";
    
    return message;
  };
  
  // Função para copiar horários da semana inteira
  const handleCopyWeekSchedule = () => {
    const message = formatWeekSchedule();
    navigator.clipboard.writeText(message);
    setCopyNotification({
      open: true,
      message: 'Horários da semana copiados!'
    });
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
      const result = await generateExpandedSlots(weekCount);
      console.log('Verificação final de slots disponíveis:', result.availableCount);
      
      // Verificar se temos pelo menos um slot disponível
      if (result.availableCount === 0) {
        showNotification('Não há horários disponíveis nas datas selecionadas. Por favor, escolha outras datas ou reduza o número de semanas.', 'error');
        return;
      }

      setSaving(true);
      console.log('Iniciando salvamento - Processando slots disponíveis');

      // Definir os horários que serão agendados (apenas os slots disponíveis)
      const horariosToSchedule = result.expanded.length > 0 
        ? result.expanded.filter(slot => slot.available) 
        : Object.values(selectedTeachers);
      
      // Se este for um agendamento público, processar pagamento
      if (isPublic && horariosToSchedule.length > 0) {
        // ... código existente para pagamento público
      } else {
        // Agendamento administrativo - sem pagamento
        try {
          // Registrar quem criou o agendamento (se estiver logado)
          const createdBy = currentUser ? currentUser.uid : 'admin';
          console.log('Criado por:', createdBy);
          
          // Preparar dados do agendamento
          const agendamentoData = {
            ...agendamentoForm,
            horarios: horariosToSchedule.map(slot => ({
              data: slot.date,
              horario: slot.horario,
              professorId: slot.professorId,
              professorNome: slot.professorNome
            })),
            quantidadeAulas: horariosToSchedule.length,
            valorTotal: calculateTotal(),
            valorUnitario: getValuePerClass(horariosToSchedule.length),
            createdAt: serverTimestamp(),
            createdBy: createdBy // Usando a variável definida acima
          };

          // Buscar aluno se existente
          let alunoData = null;
          if (selectedStudent) {
            const alunoRef = doc(db, 'alunos', selectedStudent);
            const alunoSnap = await getDoc(alunoRef);
            if (alunoSnap.exists()) {
              alunoData = { id: alunoSnap.id, ...alunoSnap.data() };
              console.log('Dados do aluno encontrado:', alunoData);
              console.log('Campos do aluno:', Object.keys(alunoData));
              console.log('Valor da matrícula:', alunoData.matricula);
              console.log('Dados do responsável financeiro:', alunoData.responsavelFinanceiro);
              
              if (alunoData.responsavelFinanceiro) {
                console.log('Telefone do responsável:', alunoData.responsavelFinanceiro.telefone);
              }
            }
          }
          
          // Salvar agendamento
          const resultado = await saveAgendamentoInternal(agendamentoData);
          
          // Notificar sucesso
          showNotification('Agendamento salvo com sucesso!', 'success');
          
          // Resetar seleções
          resetSelectionStates();
          
          // Fechar modal de agendamento com um pequeno delay para atualização da interface
          setTimeout(() => {
            setOpenAgendamentoModal(false);
            
            // Garantir que o estado anterior de impressão seja limpo
            setPrintData(null);
            
            // Preparar dados para impressão
            const printDataObj = {
              ...agendamentoData,
              id: resultado.id, // ID do agendamento
              matricula: alunoData?.matricula !== undefined ? String(alunoData.matricula) : (resultado.alunoId || ''), // Converter matricula para string explicitamente
              responsavelFinanceiro: alunoData?.responsavelFinanceiro || {}, // Dados do responsável financeiro
              telefoneResponsavel: alunoData?.responsavelFinanceiro?.telefone || agendamentoData.telefone || '', // Telefone do responsável ou do aluno como fallback
              alunoData: alunoData // Todos os dados do aluno
            };
            
            console.log('Dados completos para impressão:', printDataObj);
            console.log('Matrícula encontrada:', printDataObj.matricula);
            console.log('Telefone do responsável:', printDataObj.telefoneResponsavel);
            
            // Definir os dados de impressão após um pequeno atraso
            setTimeout(() => {
              setPrintData(printDataObj);
            }, 500);
          }, 1000);
          
        } catch (error) {
          console.error('Erro ao salvar agendamento:', error);
          showNotification('Erro ao salvar agendamento. Tente novamente.', 'error');
        }
      }
      
      setSaving(false);
    } catch (error) {
      console.error('Erro ao processar agendamento:', error);
      showNotification('Erro ao processar agendamento. Tente novamente.', 'error');
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

  // useEffect para carregar alunos ao iniciar o componente
  useEffect(() => {
    loadStudents();
  }, []);

  // Função para carregar alunos cadastrados
  const loadStudents = async () => {
    try {
      console.log('Carregando alunos cadastrados...');
      const studentsRef = collection(db, 'alunos');
      const studentsSnapshot = await getDocs(studentsRef);
      
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`${studentsData.length} alunos carregados`);
      setStudents(studentsData);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  // Função para preencher o formulário quando um aluno for selecionado
  const handleStudentSelect = (event, student) => {
    if (!student) {
      setSelectedStudent(null);
      return;
    }
    
    // Se o student for um objeto (seleção do Autocomplete) ou uma string (entrada manual)
    if (typeof student === 'object') {
      console.log('Aluno selecionado:', student);
      console.log('Campos do aluno:', Object.keys(student));
      console.log('Matrícula do aluno:', student.Matricula);
      setSelectedStudent(student.id);
      
      setAgendamentoForm(prev => ({
        ...prev,
        nomeAluno: student.nome || '',
        email: student.email || '',
        telefone: student.telefone || '',
        cpf: student.responsavelFinanceiro?.cpf || student.cpf || ''
      }));
    } else {
      // Entrada manual
      setSelectedStudent(null);
      
      setAgendamentoForm(prev => ({
        ...prev,
        nomeAluno: student
      }));
    }
  };

  // Função para salvar o agendamento no Firestore
  const saveAgendamentoInternal = async (agendamentoData) => {
    try {
      // Verificar se o aluno já existe baseado no email ou CPF
      let alunoId = null;
      let alunoData = null;
      const { nomeAluno, email, telefone, cpf } = agendamentoData;
      
      if (email || cpf) {
        const alunosRef = collection(db, 'alunos');
        let alunoQuery;
        
        if (email) {
          alunoQuery = query(alunosRef, where('email', '==', email));
        } else if (cpf) {
          alunoQuery = query(alunosRef, where('cpf', '==', cpf));
        }
        
        const existingAlunoSnapshot = await getDocs(alunoQuery || alunosRef);
        
        if (!existingAlunoSnapshot.empty) {
          // Aluno encontrado
          const alunoDoc = existingAlunoSnapshot.docs[0];
          alunoId = alunoDoc.id;
          alunoData = alunoDoc.data();
          console.log('Aluno existente encontrado:', alunoId);
          console.log('Dados do aluno:', alunoData);
        } else {
          // Criar novo aluno
          const newAlunoRef = await addDoc(collection(db, 'alunos'), {
            nome: nomeAluno,
            email: email || '',
            telefone: telefone || '',
            cpf: cpf || '',
            dataCadastro: serverTimestamp()
          });
          
          alunoId = newAlunoRef.id;
          console.log('Novo aluno cadastrado:', alunoId);
          
          // Atualizar a lista de alunos
          loadStudents();
        }
      }
      
      // Adicionar o ID do aluno aos dados do agendamento
      const agendamentoWithAluno = {
        ...agendamentoData,
        alunoId,
        status: 'confirmado',
        dataAgendamento: serverTimestamp()
      };
      
      // Salvar o agendamento
      const agendamentoRef = await addDoc(collection(db, 'agendamentos'), agendamentoWithAluno);
      
      // Salvar os horários como subcoleção do agendamento
      const batch = writeBatch(db);
      agendamentoData.horarios.forEach(horario => {
        const horarioRef = doc(collection(agendamentoRef, 'horarios'));
        batch.set(horarioRef, {
          data: horario.data,
          horario: horario.horario,
          professorId: horario.professorId,
          professorNome: horario.professorNome
        });
      });
      
      await batch.commit();
      
      console.log('Agendamento salvo com sucesso:', agendamentoRef.id);
      
      // Retornar dados completos relevantes para impressão
      return {
        id: agendamentoRef.id,
        alunoId,
        alunoData
      };
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      throw error;
    }
  };

  // Nova função para salvar as observações editadas
  const handleSaveObservacoes = async () => {
    if (!viewBooking || !viewBooking.agendamentoId) {
      showNotification('Não foi possível salvar. Dados do agendamento inválidos.', 'error');
      return;
    }

    try {
      setSavingObservacoes(true);
      // Referência para o documento do agendamento
      const agendamentoRef = doc(db, 'agendamentos', viewBooking.agendamentoId);
      
      // Atualizar apenas o campo de observações
      await updateDoc(agendamentoRef, {
        observacoes: editableObservacoes
      });
      
      // Atualizar o estado local
      setViewBooking(prev => ({
        ...prev,
        observacoes: editableObservacoes
      }));
      
      showNotification('Observações atualizadas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar observações:', error);
      showNotification('Erro ao salvar as observações.', 'error');
    } finally {
      setSavingObservacoes(false);
    }
  };

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

        <Tooltip title="Atualizar dados">
          <IconButton 
            onClick={handleManualRefresh}
            size="small"
            disabled={loading}
            sx={{ 
              backgroundColor: alpha('#4caf50', 0.04),
              p: 1,
              ml: 1,
              '&:hover': {
                backgroundColor: alpha('#4caf50', 0.08),
              }
            }}
          >
            {loading ? <CircularProgress size={20} /> : <RefreshIcon sx={{ fontSize: '1.8rem' }} />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Copiar horários da semana">
          <IconButton 
            onClick={handleCopyWeekSchedule}
            size="small"
            sx={{ 
              backgroundColor: alpha('#9c27b0', 0.04),
              p: 1,
              ml: 1,
              '&:hover': {
                backgroundColor: alpha('#9c27b0', 0.08),
              }
            }}
          >
            <ContentCopyIcon sx={{ fontSize: '1.8rem' }} />
          </IconButton>
        </Tooltip>

        <FormControlLabel
          control={
            <Checkbox
              checked={showOnlyAvailable}
              onChange={handleShowOnlyAvailableChange}
              color="primary"
            />
          }
          label="Mostrar apenas horários disponíveis"
          sx={{ color: "#333333", fontWeight: 500 }}
        />
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
                background: isHoliday(date) 
                  ? 'linear-gradient(to bottom, #ffebee, #ffcdd2)' 
                  : 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
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
                  color: isHoliday(date) ? 'error.main' : 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textTransform: 'capitalize',
                  mb: 0.5,
                  backgroundColor: isHoliday(date) ? '#ffebee' : '#ffffff',
                  pb: 0.2,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  {formatDate(date)}
                  {isHoliday(date) && (
                    <Box component="span" sx={{ 
                      display: 'block', 
                      fontSize: '0.7rem', 
                      fontWeight: 400, 
                      color: 'error.main' 
                    }}>
                      Feriado/Férias
                    </Box>
                  )}
                </Box>
                <Tooltip title="Copiar horários do dia">
                  <IconButton 
                    size="small" 
                    onClick={() => handleCopyDaySchedule(date.format('YYYY-MM-DD'))}
                    sx={{ 
                      padding: 0.5, 
                      fontSize: '0.7rem',
                      color: isHoliday(date) ? 'error.main' : 'primary.main'
                    }}
                  >
                    <ContentCopyIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
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
                        {schedule.professores?.filter(profId => {
                          if (!showOnlyAvailable) return true;
                          const bookingKey = `${date.format('YYYY-MM-DD')}-${schedule.horario}-${profId}`;
                          return !existingBookings[bookingKey]; // Mostra apenas se não estiver reservado
                        }).map(profId => {
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
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                                    {console.log('Verificando pacote:', existingBookings[bookingKey]?.agendamentoId, 'em packagesEndingSoon:', packagesEndingSoon)}
                                    {existingBookings[bookingKey]?.agendamentoId && packagesEndingSoon[existingBookings[bookingKey]?.agendamentoId] && (
                                      <Tooltip title={`Pacote termina em ${packagesEndingSoon[existingBookings[bookingKey]?.agendamentoId].daysLeft} dias (${packagesEndingSoon[existingBookings[bookingKey]?.agendamentoId].lastClass})`}>
                                        <WarningIcon 
                                          sx={{ 
                                            fontSize: '0.7rem', 
                                            color: 'warning.main',
                                            ml: 0.2
                                          }} 
                                        />
                                      </Tooltip>
                                    )}
                                  </Box>
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
                    schedules[date.format('YYYY-MM-DD')].length === 0 ||
                    (showOnlyAvailable && schedules[date.format('YYYY-MM-DD')]?.every(schedule => 
                      schedule.professores?.every(profId => {
                        const bookingKey = `${date.format('YYYY-MM-DD')}-${schedule.horario}-${profId}`;
                        return existingBookings[bookingKey];
                      })
                    ))) && (
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
                      severity="warning" 
                      sx={{ mb: 2 }}
                    >
                      Algumas datas estão indisponíveis e foram puladas. O sistema buscou automaticamente as próximas datas disponíveis.
                    </Alert>
                  )}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                      Datas selecionadas para agendamento:
                    </Typography>
                    {expandedSlots
                      .filter(slot => slot.available)
                      .map((slot, index) => (
                        <Typography key={index} color="text.secondary" sx={{ 
                          py: 0.5, 
                          pl: 1,
                          borderLeft: '3px solid #4caf50',
                          mb: 0.5,
                          bgcolor: alpha('#4caf50', 0.05),
                          borderRadius: '0 4px 4px 0'
                        }}>
                  • {dayjs(slot.date).format('DD/MM/YYYY')} às {slot.horario} com {slot.professorNome}
                </Typography>
              ))}
            </Box>

                  {expandedSlots.some(slot => !slot.available) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                        Datas indisponíveis (puladas):
            </Typography>
                      {expandedSlots
                        .filter(slot => !slot.available)
                        .map((slot, index) => (
                          <Typography key={index} color="text.secondary" sx={{ 
                            py: 0.5, 
                            pl: 1,
                            borderLeft: '3px solid #f44336',
                            mb: 0.5,
                            bgcolor: alpha('#f44336', 0.05),
                            borderRadius: '0 4px 4px 0',
                            fontSize: '0.9rem'
                          }}>
                            • {dayjs(slot.date).format('DD/MM/YYYY')} às {slot.horario} com {slot.professorNome}
                            {holidayDates.includes(dayjs(slot.date).format('YYYY-MM-DD')) ? 
                              " (Feriado/Férias)" : 
                              " (Horário ocupado)"}
                          </Typography>
                      ))}
                    </Box>
                  )}
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
                type="text"
                value={weekCountInput}
                onChange={handleWeekCountChange}
                onBlur={() => {
                  // Quando o campo perde o foco, garantir que tenha um valor válido
                  if (weekCountInput === '' || parseInt(weekCountInput) < 1) {
                    setWeekCountInput('1');
                    setWeekCount(1);
                    generateExpandedSlots(1);
                  }
                }}
                inputProps={{ 
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
                sx={{ width: 200 }}
                helperText="Valor padrão: 1 semana"
              />
              <Typography variant="subtitle1">
                Total de aulas: {expandedSlots.length > 0 ? expandedSlots.filter(slot => slot.available).length : selectedSlots.length}
              </Typography>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Valor total: R$ {(expandedSlots.length > 0 ? expandedSlots.filter(slot => slot.available).length : selectedSlots.length) * getValuePerClass(expandedSlots.length > 0 ? expandedSlots.filter(slot => slot.available).length : selectedSlots.length)}
            </Typography>

            <Autocomplete
              fullWidth
              id="nomeAluno"
              options={students}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.nome || ''}
              isOptionEqualToValue={(option, value) => {
                if (typeof value === 'string') {
                  return option.nome === value;
                }
                return option.id === value.id;
              }}
              freeSolo
              autoComplete
              includeInputInList
              filterSelectedOptions
              value={selectedStudent ? students.find(s => s.id === selectedStudent) : null}
              onChange={handleStudentSelect}
              onInputChange={(event, newInputValue) => {
                if (!newInputValue) {
                  setSelectedStudent(null);
                }
                setAgendamentoForm(prev => ({
                  ...prev,
                  nomeAluno: newInputValue
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
              label="Nome Completo"
              required
              margin="normal"
                  helperText="Digite um novo nome ou selecione um aluno existente"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                // Extrair a propriedade key para passá-la diretamente
                const { key, ...otherProps } = props;
                return (
                  <li key={option.id || key} {...otherProps}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body1">{option.nome}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.email || 'Sem email'} • {option.telefone || 'Sem telefone'}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
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

      <Snackbar
        open={copyNotification.open}
        autoHideDuration={3000}
        onClose={() => setCopyNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setCopyNotification(prev => ({ ...prev, open: false }))} 
          severity="success"
          sx={{ width: '100%' }}
        >
          {copyNotification.message}
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
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={editableObservacoes}
                onChange={(e) => setEditableObservacoes(e.target.value)}
                placeholder="Adicione observações aqui..."
                sx={{ mt: 1, mb: 2 }}
              />
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleSaveObservacoes}
                disabled={savingObservacoes}
                sx={{ mb: 2 }}
              >
                {savingObservacoes ? 'Salvando...' : 'Salvar Observações'}
              </Button>

              <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                Agendamento realizado em: {dayjs(viewBooking.createdAt?.toDate()).format('DD/MM/YYYY HH:mm')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {viewBooking && (
            <Button 
              color="primary" 
              variant="contained"
              onClick={() => handlePrintBooking(viewBooking)}
              sx={{ mr: 'auto' }}
              startIcon={<PrintIcon />}
            >
              Imprimir Ficha
            </Button>
          )}
          <Button onClick={() => setViewBookingOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Componente de impressão */}
      {printData && (
        <IndividualLessonForm 
          key={`print-form-${Date.now()}`}
          agendamentoData={printData} 
          onClose={handlePrintClose} 
        />
      )}
    </>
  );
} 