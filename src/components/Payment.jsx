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

const Payment = ({ open, onClose, nome, email, valor }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    const processPayment = async () => {
      if (!open || loading) return;

      try {
        setLoading(true);
        setError(null);

        // Validar dados
        if (!nome || !email || !valor) {
          setError('Dados incompletos. Verifique nome, email e valor.');
          return;
        }

        console.log('Iniciando pagamento:', { nome, email, valor });

        // Enviar para API
        const response = await fetch('/api/pagbank/create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nome,
            email,
            valor: Number(valor)
          })
        });

        const data = await response.json();

        if (data.success && data.url) {
          // Redirecionar para PagBank
          window.location.href = data.url;
        } else {
          throw new Error(data.message || 'Erro ao gerar pagamento');
        }
      } catch (error) {
        console.error('Erro:', error);
        setError(error.message || 'Erro ao processar pagamento');
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [open, nome, email, valor, loading]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Pagamento
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Nome: {nome}<br />
              Email: {email}<br />
              Valor: R$ {Number(valor).toFixed(2)}
            </Typography>
          </Alert>
        ) : (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>
              Redirecionando para o ambiente seguro do PagBank...
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Payment; 