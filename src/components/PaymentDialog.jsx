import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import PaymentStatus from './PaymentStatus';

const PaymentDialog = ({ open, onClose, agendamento, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  const handlePayment = async () => {
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
      console.log('Resposta do pagamento:', data); // Log para debug
      
      if (data.success && data.qr_code) {
        setPaymentData(data);
      } else {
        setError(data.error || 'Erro ao gerar pagamento. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setError('Erro ao conectar com o servidor. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentCompleted = () => {
    onPaymentSuccess();
    onClose();
  };

  const handlePaymentRetry = () => {
    setPaymentData(null);
    setError(null);
    handlePayment();
  };

  // Iniciar o pagamento quando o diálogo for aberto
  React.useEffect(() => {
    if (open && !paymentData && !loading) {
      handlePayment();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {error ? 'Erro no Pagamento' : 'Pagamento via PIX'}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : paymentData ? (
          <Box>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="body1" gutterBottom>
                Escaneie o QR Code abaixo para pagar:
              </Typography>
              <Box sx={{ my: 2 }}>
                <img 
                  src={paymentData.qr_code.links.find(link => link.media === 'image/png')?.href}
                  alt="QR Code PIX"
                  style={{ maxWidth: '200px' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Valor: R$ {(paymentData.qr_code.amount.value / 100).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Código PIX expira em 24 horas
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>
                ID do Pedido: {paymentData.order_id}
              </Typography>
            </Box>
            <PaymentStatus
              orderId={paymentData.order_id}
              onPaymentCompleted={handlePaymentCompleted}
              onPaymentRetry={handlePaymentRetry}
            />
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog; 