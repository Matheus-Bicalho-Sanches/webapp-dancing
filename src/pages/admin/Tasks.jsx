import React, { useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';

// Componente TabPanel para renderizar o conteúdo de cada aba
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`task-tabpanel-${index}`}
      aria-labelledby={`task-tab-${index}`}
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

export default function Tasks() {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <MainLayout title="Tarefas">
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Não recorrentes" />
            <Tab label="Diárias" />
            <Tab label="Semanais" />
            <Tab label="Mensais" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <Typography>Conteúdo das tarefas não recorrentes será implementado aqui.</Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Typography>Conteúdo das tarefas diárias será implementado aqui.</Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography>Conteúdo das tarefas semanais será implementado aqui.</Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Typography>Conteúdo das tarefas mensais será implementado aqui.</Typography>
        </TabPanel>
      </Box>
    </MainLayout>
  );
} 