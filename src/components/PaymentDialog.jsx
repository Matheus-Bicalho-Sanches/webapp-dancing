import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';

const PaymentDialog = ({ open, onClose, agendamento }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    const redirectToPagSeguro = async () => {
      if (!open || loading) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/pagbank/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ agendamento })
        });

        const data = await response.json();
        
        if (data.success && data.payment_url) {
          // Redirecionar para a página de pagamento do PagSeguro
          window.location.href = data.payment_url;
        } else {
          setError(data.error || 'Erro ao gerar link de pagamento. Por favor, tente novamente.');
        }
      } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        setError('Erro ao conectar com o servidor. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    redirectToPagSeguro();
  }, [open, agendamento]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Pagamento
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>
              Redirecionando para o ambiente seguro do PagSeguro...
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog; 