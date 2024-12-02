import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid
} from '@mui/material';
import PaymentStatus from './PaymentStatus';

const PaymentDialog = ({ open, onClose, agendamento, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [cardData, setCardData] = useState({
    number: '',
    expMonth: '',
    expYear: '',
    securityCode: '',
    holderName: ''
  });

  const handleCardDataChange = (field) => (event) => {
    setCardData({
      ...cardData,
      [field]: event.target.value
    });
  };

  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
    setPaymentData(null);
    setError(null);
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/pagbank/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          agendamento,
          paymentMethod,
          cardData: paymentMethod === 'credit_card' ? cardData : undefined
        })
      });

      const data = await response.json();
      console.log('Resposta do pagamento:', data);
      
      if (data.success) {
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

  // Iniciar o pagamento quando o diálogo for aberto e for PIX
  React.useEffect(() => {
    if (open && !paymentData && !loading && paymentMethod === 'pix') {
      handlePayment();
    }
  }, [open, paymentMethod]);

  const renderPaymentForm = () => {
    if (paymentMethod === 'credit_card') {
      return (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Número do Cartão"
              value={cardData.number}
              onChange={handleCardDataChange('number')}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Mês de Expiração"
              value={cardData.expMonth}
              onChange={handleCardDataChange('expMonth')}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Ano de Expiração"
              value={cardData.expYear}
              onChange={handleCardDataChange('expYear')}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="CVV"
              value={cardData.securityCode}
              onChange={handleCardDataChange('securityCode')}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nome no Cartão"
              value={cardData.holderName}
              onChange={handleCardDataChange('holderName')}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Pagar com Cartão'}
            </Button>
          </Grid>
        </Grid>
      );
    }
    
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Pagamento
      </DialogTitle>
      <DialogContent>
        <RadioGroup
          value={paymentMethod}
          onChange={handlePaymentMethodChange}
          sx={{ mb: 2 }}
        >
          <FormControlLabel value="pix" control={<Radio />} label="PIX" />
          <FormControlLabel value="credit_card" control={<Radio />} label="Cartão de Crédito" />
        </RadioGroup>

        {loading && paymentMethod === 'pix' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : paymentData && paymentMethod === 'pix' ? (
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
        ) : paymentData && paymentMethod === 'credit_card' ? (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h6" color="primary">
              Pagamento Processado!
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              ID do Pedido: {paymentData.order_id}
            </Typography>
            <PaymentStatus
              orderId={paymentData.order_id}
              onPaymentCompleted={handlePaymentCompleted}
              onPaymentRetry={handlePaymentRetry}
            />
          </Box>
        ) : renderPaymentForm()}
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