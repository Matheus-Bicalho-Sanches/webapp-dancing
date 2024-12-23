import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, CircularProgress, Snackbar } from '@mui/material';
import MainLayout from '../../layouts/MainLayout';

const MercadoLivre = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payerData, setPayerData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    doc_type: 'CPF',
    doc_number: ''
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

      // URL da API baseada no ambiente
      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://dancing-webapp.com.br/api/create_preference'
        : 'http://localhost:3001/create_preference';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          payer: payerData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      // Redireciona para a página de pagamento do Mercado Pago
      window.location.href = data.init_point;

    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Mercado Livre
        </Typography>
        <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
          <Box component="form" sx={{ '& > :not(style)': { m: 1 } }}>
            <TextField
              fullWidth
              label="Nome"
              value={payerData.first_name}
              onChange={handleInputChange('first_name')}
              required
            />
            <TextField
              fullWidth
              label="Sobrenome"
              value={payerData.last_name}
              onChange={handleInputChange('last_name')}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={payerData.email}
              onChange={handleInputChange('email')}
              required
            />
            <TextField
              fullWidth
              label="CPF"
              value={payerData.doc_number}
              onChange={handleInputChange('doc_number')}
              required
            />
            <TextField
              fullWidth
              label="Valor (R$)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handlePayment}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Pagar'}
            </Button>
          </Box>
        </Paper>
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          message={error}
        />
      </Box>
    </MainLayout>
  );
};

export default MercadoLivre; 