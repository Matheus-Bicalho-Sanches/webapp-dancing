import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  TextField,
  Alert
} from '@mui/material';
import ReCAPTCHA from 'react-google-recaptcha';
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
  const [scriptsLoaded, setScriptsLoaded] = useState({
    recaptcha: false,
    pagbank: false
  });
  const recaptchaRef = useRef();
  const initializationAttempted = useRef(false);

  // Verificar se os scripts estão carregados
  useEffect(() => {
    const checkScripts = () => {
      // Debug logs detalhados
      console.group('Debug de Scripts - ' + new Date().toISOString());
      
      const scriptsLoaded = window.externalScriptsLoaded === true;
      console.log('Scripts carregados:', {
        global: scriptsLoaded,
        recaptcha: !!window.grecaptcha,
        pagbank: !!window.PagSeguro
      });

      if (scriptsLoaded) {
        setScriptsLoaded({
          recaptcha: true,
          pagbank: true
        });
      } else {
        // Tentar novamente em 1 segundo
        setTimeout(checkScripts, 1000);
      }

      console.groupEnd();
    };

    if (open) {
      checkScripts();
    }

    return () => {
      console.log('Componente desmontado ou diálogo fechado');
    };
  }, [open]);

  // Resetar estados quando o diálogo é aberto
  useEffect(() => {
    if (open) {
      setError(null);
      setPaymentData(null);
      initializationAttempted.current = false;
      
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.reset();
        } catch (error) {
          console.error('Erro ao resetar reCAPTCHA:', error);
        }
      }
    }
  }, [open]);

  // Iniciar pagamento PIX quando tudo estiver carregado
  useEffect(() => {
    if (open && 
        !paymentData && 
        !loading && 
        paymentMethod === 'pix' && 
        scriptsLoaded.recaptcha && 
        scriptsLoaded.pagbank && 
        !initializationAttempted.current) {
      initializationAttempted.current = true;
      handlePayment();
    }
  }, [open, paymentMethod, scriptsLoaded]);

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

      // Verificar se os scripts estão carregados
      if (!scriptsLoaded.recaptcha || !scriptsLoaded.pagbank) {
        setError('Aguarde o carregamento dos componentes de pagamento...');
        setLoading(false);
        return;
      }

      // Verificar se o reCAPTCHA está disponível
      if (!recaptchaRef.current) {
        setError('Erro ao carregar o reCAPTCHA. Por favor, recarregue a página.');
        setLoading(false);
        return;
      }

      // Obter o valor do reCAPTCHA
      const recaptchaValue = recaptchaRef.current.getValue();
      if (!recaptchaValue) {
        setError('Por favor, marque a caixa de verificação do reCAPTCHA');
        setLoading(false);
        return;
      }

      // Processar pagamento com cartão
      let encryptedCard;
      if (paymentMethod === 'credit_card') {
        try {
          const card = window.PagSeguro.encryptCard({
            publicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr+ZqgD892U9/HXsa7XqBZUayPquAfh9xx4iwUbTSUAvTlmiXFQNTp0Bvt/5vK2FhMj39qrsORk4Q9zXfMpArTTzR9R0Tgc3gn6h+s2VJaKXsJ1fkbYvZj0S3Oi6U3lOnr2/aK4LRrx9a4Kh3GOvNqf8YrNtM7nztFWp7xQFjH5u/B6iJqB7QUGZsF5t7mWrwwOmMLQBJV3Kk4mSqKVxGZotPsWX2dT9XtKuAX4WZgPHROizXybQrHcgxqwy8oi5AVS5lc7pxgWBh4OQXF8t+N/GdTPqQXedUzRYUZyxGwGAqm7LCpYtXjHV3XGPL0l2vDpzCgPp5p5wXwBXgEwIDAQAB",
            holder: cardData.holderName,
            number: cardData.number,
            expMonth: cardData.expMonth,
            expYear: cardData.expYear,
            securityCode: cardData.securityCode
          });
          
          if (!card.hasErrors) {
            encryptedCard = card.encryptedCard;
          } else {
            console.error('Erro na criptografia do cartão:', card.errors);
            setError('Erro ao processar dados do cartão. Verifique os dados informados.');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Erro ao criptografar cartão:', error);
          setError('Erro ao processar dados do cartão. Por favor, tente novamente.');
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/pagbank/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          agendamento,
          paymentMethod,
          cardData: paymentMethod === 'credit_card' ? { encryptedCard } : undefined,
          recaptchaToken: recaptchaValue
        })
      });

      const data = await response.json();
        
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
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                size="normal"
                onChange={(value) => {
                  if (value) {
                    setError(null);
                  }
                }}
                onExpired={() => {
                  setError('Verificação expirada. Por favor, marque a caixa novamente.');
                }}
                onErrored={(err) => {
                  console.error('Erro no reCAPTCHA:', err);
                  setError('Erro ao carregar verificação de segurança');
                  setLoading(false);
                }}
              />
            </Box>
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
        {!scriptsLoaded.recaptcha || !scriptsLoaded.pagbank ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Carregando componentes de pagamento...
          </Typography>
        ) : null}
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && paymentMethod === 'pix' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
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