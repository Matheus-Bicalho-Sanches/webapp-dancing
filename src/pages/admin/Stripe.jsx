import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import MainLayout from '../../layouts/MainLayout';

const Stripe = () => {
  const [payerData, setPayerData] = useState({
    name: '',
    email: '',
    cpf: ''
  });
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPayerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(value);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const orderData = {
        amount: parseFloat(amount),
        payer: {
          name: payerData.name,
          email: payerData.email,
          tax_id: payerData.cpf.replace(/[^0-9]/g, ''),
        },
        items: [{
          name: 'Pagamento Dancing Patinação',
          quantity: 1,
          amount: parseFloat(amount)
        }]
      };

      const apiUrl = process.env.NODE_ENV === 'production'
        ? '/api/stripe/create-session'
        : 'http://localhost:3001/api/stripe/create-session';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao criar sessão de pagamento');
      }

      // Mostra mensagem de sucesso antes de redirecionar
      setSnackbar({
        open: true,
        message: 'Redirecionando para a página de pagamento...',
        severity: 'success'
      });

      // Pequeno delay antes de redirecionar
      setTimeout(() => {
        window.location.href = data.url;
      }, 1500);
    } catch (err) {
      console.error('Erro:', err);
      setError(err.message);
      setSnackbar({
        open: true,
        message: err.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Pagamento com Stripe
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Nome Completo"
              name="name"
              value={payerData.name}
              onChange={handleInputChange}
              required
              margin="normal"
            />

            <TextField
              fullWidth
              label="E-mail"
              name="email"
              type="email"
              value={payerData.email}
              onChange={handleInputChange}
              required
              margin="normal"
            />

            <TextField
              fullWidth
              label="CPF"
              name="cpf"
              value={payerData.cpf}
              onChange={handleInputChange}
              required
              margin="normal"
              inputProps={{ maxLength: 11 }}
              helperText="Digite apenas números"
            />

            <TextField
              fullWidth
              label="Valor (R$)"
              value={amount}
              onChange={handleAmountChange}
              required
              margin="normal"
              type="number"
              inputProps={{ min: "1", step: "1" }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'PAGAR COM STRIPE'
              )}
            </Button>
          </form>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </MainLayout>
  );
};

export default Stripe; 