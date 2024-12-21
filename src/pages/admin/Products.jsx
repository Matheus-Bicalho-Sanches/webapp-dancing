import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Typography,
  Paper
} from '@mui/material';

export default function Products() {
  return (
    <MainLayout title="Produtos">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ color: '#000', mb: 4 }}>
          Produtos
        </Typography>
        <Paper sx={{ p: 3 }}>
          {/* Conteúdo da página será adicionado aqui */}
        </Paper>
      </Box>
    </MainLayout>
  );
} 