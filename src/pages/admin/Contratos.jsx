import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import MainLayout from '../../layouts/MainLayout';
import ZapSignConnectionTest from './components/ZapSignConnectionTest';

const Contratos = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <MainLayout title="Contratos">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Contratos
        </Typography>

        {/* Componente de teste de conexão */}
        <ZapSignConnectionTest />

        <Paper elevation={3} sx={{ p: 3, minHeight: '50vh' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="Tabs de Contratos">
              <Tab label="Contratos" id="tab-0" aria-controls="tabpanel-0" />
              <Tab label="Modelos" id="tab-1" aria-controls="tabpanel-1" />
              <Tab label="Configurações" id="tab-2" aria-controls="tabpanel-2" />
            </Tabs>
          </Box>

          {/* Painel de Contratos */}
          <div
            role="tabpanel"
            hidden={tabValue !== 0}
            id="tabpanel-0"
            aria-labelledby="tab-0"
          >
            {tabValue === 0 && (
              <Box>
                <Typography variant="body1">
                  Lista de contratos será exibida aqui.
                </Typography>
              </Box>
            )}
          </div>

          {/* Painel de Modelos */}
          <div
            role="tabpanel"
            hidden={tabValue !== 1}
            id="tabpanel-1"
            aria-labelledby="tab-1"
          >
            {tabValue === 1 && (
              <Box>
                <Typography variant="body1">
                  Modelos de contrato serão exibidos aqui.
                </Typography>
              </Box>
            )}
          </div>

          {/* Painel de Configurações */}
          <div
            role="tabpanel"
            hidden={tabValue !== 2}
            id="tabpanel-2"
            aria-labelledby="tab-2"
          >
            {tabValue === 2 && (
              <Box>
                <Typography variant="body1">
                  Configurações serão exibidas aqui.
                </Typography>
              </Box>
            )}
          </div>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default Contratos; 