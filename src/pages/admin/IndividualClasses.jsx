import { useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { 
  Typography,
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import TeachersTab from '../../components/tabs/TeachersTab';
import TimeTab from '../../components/tabs/TimeTab';
import ScheduleTab from '../../components/tabs/ScheduleTab';
import ValuesTab from '../../components/tabs/ValuesTab';
import { useAuth } from '../../contexts/AuthContext';

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

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
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
            <ScheduleTab />
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
        </>
      ) : (
        <ScheduleTab isPublic={true} />
      )}
    </MainLayout>
  );
}