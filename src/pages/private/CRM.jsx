import React from 'react';
import { Box, Typography, Container } from '@mui/material';

export default function CRM() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          CRM
        </Typography>
        <Typography variant="body1">
          Gerenciamento de Relacionamento com o Cliente
        </Typography>
      </Box>
    </Container>
  );
} 