import { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { 
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Snackbar,
  Alert
} from '@mui/material';
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
  doc
} from 'firebase/firestore';

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

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const saveAgendamento = async (agendamentoData) => {
    try {
      const db = getFirestore();
      const agendamentosRef = collection(db, 'agendamentos');
      
      // Remove o Timestamp do objeto antes de salvar
      const { dataAgendamento, ...restData } = agendamentoData;
      
      // Adiciona o documento à coleção
      const agendamentoDoc = await addDoc(agendamentosRef, {
        ...restData,
        createdAt: serverTimestamp(),
        status: 'confirmado'
      });

      // Adiciona os horários como subcoleção
      const horariosRef = collection(agendamentoDoc, 'horarios');
      const batch = writeBatch(db);

      agendamentoData.horarios.forEach(horario => {
        const horarioRef = doc(horariosRef);
        batch.set(horarioRef, horario); // Salva o horário diretamente
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
            <Typography variant="h6">Pesquisa</Typography>
            <Typography variant="body1">Conteúdo da pesquisa virá aqui</Typography>
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