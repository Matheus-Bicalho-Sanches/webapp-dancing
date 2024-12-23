import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, CircularProgress, Alert } from '@mui/material';
import MainLayout from '../../layouts/MainLayout';

const Stripe = () => {
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

      // Corrigindo a URL da API
      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://dancing-webapp.com.br/stripe/create-session'
        : 'http://localhost:3001/stripe/create-session';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const data = await response.json();

      // Redireciona para a página de checkout do Stripe
      window.location.href = data.url;

    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      setError(err.message || 'Erro ao processar pagamento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Pagamento via Stripe
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
              {loading ? <CircularProgress size={24} /> : 'Pagar com Stripe'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default Stripe; 