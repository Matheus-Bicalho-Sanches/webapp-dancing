import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, CircularProgress, Alert } from '@mui/material';
import MainLayout from '../../layouts/MainLayout';
import { createPagSeguroOrder } from '../../api/pagseguro/create-order';

const PagSeguro = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payerData, setPayerData] = useState({
    name: '',
    email: '',
    cpf: ''
  });

  const handleInputChange = (field) => (event) => {
    setPayerData({
      ...payerData,
      [field]: event.target.value
    });
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const orderData = {
        amount: parseFloat(amount),
        payer: {
          name: payerData.name,
          email: payerData.email,
          tax_id: payerData.cpf.replace(/[^0-9]/g, ''), // Remove todos os caracteres não numéricos
        },
        items: [{
          name: 'Pagamento Dancing Patinação',
          quantity: 1,
          amount: parseFloat(amount)
        }]
      };

      console.log('Enviando dados:', orderData);

      const response = await createPagSeguroOrder(orderData);
      
      console.log('Resposta:', response);

      if (!response.payment_url) {
        throw new Error('URL de pagamento não encontrada na resposta');
      }

      // Abre a URL de pagamento em uma nova aba
      window.open(response.payment_url, '_blank');

    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      let errorMessage = 'Erro ao criar ordem de pagamento. Por favor, tente novamente.';
      
      // Se houver detalhes do erro na resposta
      if (err.response?.data?.details?.error_messages) {
        errorMessage = err.response.data.details.error_messages
          .map(e => `${e.description} (${e.code})`)
          .join(', ');
      } else if (err.response?.data?.details) {
        errorMessage = err.response.data.details;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Pagamento via PagSeguro
        </Typography>
        <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome Completo"
              value={payerData.name}
              onChange={handleInputChange('name')}
              required
              fullWidth
            />

            <TextField
              label="E-mail"
              type="email"
              value={payerData.email}
              onChange={handleInputChange('email')}
              required
              fullWidth
            />

            <TextField
              label="CPF"
              value={payerData.cpf}
              onChange={handleInputChange('cpf')}
              required
              fullWidth
              inputProps={{
                maxLength: 14,
                pattern: '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}'
              }}
              helperText="Digite apenas números"
            />

            <TextField
              label="Valor (R$)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
              inputProps={{
                min: 0,
                step: 0.01
              }}
            />

            <Button
              variant="contained"
              onClick={handlePayment}
              disabled={loading || !amount || !payerData.name || !payerData.email || !payerData.cpf}
              fullWidth
              size="large"
            >
              {loading ? <CircularProgress size={24} /> : 'Pagar com PagSeguro'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default PagSeguro; 