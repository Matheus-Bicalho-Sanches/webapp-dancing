import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import MainLayout from '../../layouts/MainLayout';

const Oficina = () => {
  return (
    <MainLayout title="Oficina">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Oficina
        </Typography>
        <Paper elevation={3} sx={{ p: 3, minHeight: '70vh' }}>
          {/* Conteúdo da página Oficina será adicionado aqui */}
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default Oficina; 