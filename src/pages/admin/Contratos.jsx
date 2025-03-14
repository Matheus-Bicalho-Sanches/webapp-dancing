import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import MainLayout from '../../layouts/MainLayout';

const Contratos = () => {
  return (
    <MainLayout title="Contratos">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Contratos
        </Typography>
        <Paper elevation={3} sx={{ p: 3, minHeight: '70vh' }}>
          {/* Conteúdo da página de Contratos será adicionado aqui */}
          <Typography variant="body1" color="text.secondary">
            Esta página permitirá a gestão de contratos com assinaturas digitais através da integração com ZapSign.
          </Typography>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default Contratos; 