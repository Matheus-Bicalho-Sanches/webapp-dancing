import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const PaymentStatus = ({ orderId, onPaymentCompleted, onPaymentRetry }) => {
  const [status, setStatus] = useState('PENDING');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment-status?orderId=${orderId}`);
        const data = await response.json();
        
        if (!isMounted) return;

        if (data.success) {
          setStatus(data.status);
          if (data.status === 'PAID' || data.status === 'COMPLETED') {
            clearInterval(checkInterval);
            onPaymentCompleted(data.status);
          } else if (data.status === 'DECLINED' || data.status === 'CANCELLED') {
            clearInterval(checkInterval);
            onPaymentRetry(data.status);
          }
        } else {
          setError(data.error);
          clearInterval(checkInterval);
          onPaymentRetry(data.error);
        }
      } catch (error) {
        if (!isMounted) return;
        setError(error.message);
        clearInterval(checkInterval);
        onPaymentRetry(error);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(checkInterval);
    };
  }, [orderId, onPaymentCompleted, onPaymentRetry]);

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">
          Erro ao verificar status do pagamento: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <CircularProgress size={20} sx={{ mr: 1 }} />
      <Typography component="span">
        Verificando status do pagamento...
      </Typography>
    </Box>
  );
};

export default PaymentStatus; 