import { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { 
  Typography,
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import TeachersTab from './tabs/TeachersTab';
import TimeTab from './tabs/TimeTab';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function IndividualClasses() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <MainLayout title="Aulas Individuais">
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
          <Tab label="Pesquisa" />
        </Tabs>
      </Paper>

      <TabPanel value={currentTab} index={0}>
        <Typography variant="h6">Agenda</Typography>
        <Typography variant="body1">Conteúdo da agenda virá aqui</Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <TimeTab />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <TeachersTab />
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Typography variant="h6">Pesquisa</Typography>
        <Typography variant="body1">Conteúdo da pesquisa virá aqui</Typography>
      </TabPanel>
    </MainLayout>
  );
} 