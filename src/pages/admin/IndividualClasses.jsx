import { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { 
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Tooltip
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Event as EventIcon
} from '@mui/icons-material';
import TeachersTab from '../../components/tabs/TeachersTab';
import TimeTab from '../../components/tabs/TimeTab';
import ScheduleTab from '../../components/tabs/ScheduleTab';
import ValuesTab from '../../components/tabs/ValuesTab';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch,
  doc,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

// Configurar dayjs para usar o locale pt-br
dayjs.locale('pt-br');

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function IndividualClasses() {
  const { currentUser } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Estados para a aba de pesquisa
  const [loading, setLoading] = useState(false);
  const [professors, setProfessors] = useState([]);
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [classes, setClasses] = useState([]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Carregar professores quando entrar na aba de pesquisa
    if (newValue === 4) {
      loadProfessors();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const saveAgendamento = async (agendamentoData) => {
    try {
      const db = getFirestore();
      const agendamentosRef = collection(db, 'agendamentos');
      const batch = writeBatch(db);
      
      // Remove o Timestamp do objeto antes de salvar
      const { dataAgendamento, ...restData } = agendamentoData;
      
      // Adiciona o documento à coleção agendamentos
      const agendamentoDoc = await addDoc(agendamentosRef, {
        ...restData,
        createdAt: serverTimestamp(),
        status: 'confirmado'
      });

      // Adiciona os horários como subcoleção do agendamento
      const horariosRef = collection(agendamentoDoc, 'horarios');

      agendamentoData.horarios.forEach(horario => {
        // Adicionar horário na subcoleção do agendamento
        const horarioRef = doc(horariosRef);
        batch.set(horarioRef, {
          data: horario.data,
          horario: horario.horario,
          professorId: horario.professorId,
          professorNome: horario.professorNome,
          nomeAluno: agendamentoData.nomeAluno,
          observacoes: agendamentoData.observacoes || '',
          status: 'confirmado',
          telefone: agendamentoData.telefone
        });

        // Bloquear o slot no calendário do professor
        const teacherSlotRef = doc(db, 'teacherSchedules', horario.professorId, 'slots', `${horario.data}_${horario.horario}`);
        batch.set(teacherSlotRef, {
          status: 'confirmado',
          agendamentoId: agendamentoDoc.id,
          nomeAluno: agendamentoData.nomeAluno,
          email: agendamentoData.email,
          telefone: agendamentoData.telefone,
          bookedAt: serverTimestamp(),
          data: horario.data,
          horario: horario.horario,
          professorId: horario.professorId,
          professorNome: horario.professorNome
        });
      });

      await batch.commit();
      
      setSnackbar({
        open: true,
        message: 'Agendamento salvo com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar agendamento. Tente novamente.',
        severity: 'error'
      });
      throw error;
    }
  };

  // Funções para a aba de pesquisa
  const loadProfessors = async () => {
    try {
      setLoading(true);
      const professorsRef = collection(db, 'professores');
      const q = query(professorsRef, orderBy('nome'));
      const snapshot = await getDocs(q);
      
      const professorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProfessors(professorsData);
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar professores. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async (professorId) => {
    if (!professorId) {
      setClasses([]);
      return;
    }

    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      console.log('Data de hoje:', today);
      console.log('Professor ID:', professorId);
      
      const slotsRef = collection(db, 'teacherSchedules', professorId, 'slots');
      
      // Primeiro, vamos verificar todos os documentos sem filtros
      const initialQuery = query(slotsRef);
      const initialSnapshot = await getDocs(initialQuery);
      console.log('Total de documentos sem filtros:', initialSnapshot.size);
      
      // Log dos primeiros documentos para ver sua estrutura
      initialSnapshot.forEach(doc => {
        console.log('Estrutura do documento:', {
          id: doc.id,
          data: doc.data().data,
          status: doc.data().status,
          horario: doc.data().horario
        });
      });

      // Agora vamos adicionar apenas o filtro de data
      const dateQuery = query(
        slotsRef,
        where('data', '>=', today),
        orderBy('data')
      );
      const dateSnapshot = await getDocs(dateQuery);
      console.log('Documentos após filtro de data:', dateSnapshot.size);

      // Por fim, adicionamos o filtro de status
      const finalQuery = query(
        slotsRef,
        where('data', '>=', today),
        where('status', '==', 'confirmado'),
        orderBy('data'),
        orderBy('horario')
      );
      
      const finalSnapshot = await getDocs(finalQuery);
      console.log('Documentos após todos os filtros:', finalSnapshot.size);
      
      const classesData = finalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Dados processados:', classesData);
      setClasses(classesData);
    } catch (error) {
      console.error('Erro detalhado ao carregar aulas:', error);
      console.error('Stack trace:', error.stack);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar aulas. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfessorChange = (event) => {
    const professorId = event.target.value;
    setSelectedProfessor(professorId);
    loadClasses(professorId);
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const formatDayOfWeek = (dateString) => {
    // Formata o dia da semana com primeira letra maiúscula
    return dayjs(dateString).format('dddd').replace(/^\w/, c => c.toUpperCase());
  };

  const formatTime = (time) => {
    return time.replace(':00', 'h');
  };

  return (
    <MainLayout title="Aulas Individuais">
      {currentUser ? (
        <>
          <Paper sx={{ width: '100%', mb: 2 }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              centered
            >
              <Tab label="Agenda" />
              <Tab label="Horários" />
              <Tab label="Professores" />
              <Tab label="Valores" />
              <Tab label="Pesquisa" />
            </Tabs>
          </Paper>

          <TabPanel value={currentTab} index={0}>
            <ScheduleTab 
              saveAgendamento={saveAgendamento}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <TimeTab />
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <TeachersTab />
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <ValuesTab />
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, bgcolor: '#fff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <SchoolIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Pesquisa de Aulas
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ maxWidth: 400 }}>
                  <InputLabel>Selecione o Professor</InputLabel>
                  <Select
                    value={selectedProfessor}
                    onChange={handleProfessorChange}
                    label="Selecione o Professor"
                  >
                    <MenuItem value="">
                      <em>Selecione...</em>
                    </MenuItem>
                    {professors.map((professor) => (
                      <MenuItem key={professor.id} value={professor.id}>
                        {professor.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : selectedProfessor && (
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: '#666' }}>Data</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666' }}>Dia da Semana</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666' }}>Horário</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666' }}>Aluno</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666' }}>Contato</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {classes.map((classItem) => (
                        <TableRow key={classItem.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EventIcon fontSize="small" sx={{ color: 'primary.main' }} />
                              {formatDate(classItem.data)}
                            </Box>
                          </TableCell>
                          <TableCell>{formatDayOfWeek(classItem.data)}</TableCell>
                          <TableCell>{formatTime(classItem.horario)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />
                              {classItem.nomeAluno}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={`Email: ${classItem.email}`}>
                              <Chip
                                label={classItem.telefone}
                                size="small"
                                variant="outlined"
                                sx={{ borderRadius: 1 }}
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={classItem.status}
                              color="success"
                              size="small"
                              sx={{ borderRadius: 1, textTransform: 'capitalize' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {classes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                            <Typography variant="body2" color="textSecondary">
                              Nenhuma aula encontrada para este professor
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </TabPanel>

          <Snackbar 
            open={snackbar.open} 
            autoHideDuration={6000} 
            onClose={handleCloseSnackbar}
          >
            <Alert 
              onClose={handleCloseSnackbar} 
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </>
      ) : (
        <ScheduleTab isPublic={true} />
      )}
    </MainLayout>
  );
}