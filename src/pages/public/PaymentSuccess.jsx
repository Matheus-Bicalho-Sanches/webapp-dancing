import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      verifyPayment(sessionId);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId) => {
    try {
      // First verify payment status
      const response = await fetch(`/api/stripe/payment-status/${sessionId}`);
      const paymentData = await response.json();
      
      if (paymentData.status === 'succeeded') {
        // Then get appointment details
        const appointmentResponse = await fetch(`/api/stripe/appointments/${sessionId}`);
        if (!appointmentResponse.ok) {
          throw new Error('Erro ao buscar detalhes do agendamento');
        }
        const appointmentData = await appointmentResponse.json();
        setAppointment(appointmentData);
      } else {
        setError('Pagamento pendente ou não confirmado');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Erro ao verificar status do pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/schedule')}
          sx={{ mt: 2 }}
        >
          Tentar Novamente
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
      <Typography variant="h4" gutterBottom>
        Pagamento Confirmado!
      </Typography>
      <Typography variant="body1" paragraph>
        Seu agendamento foi realizado com sucesso.
      </Typography>
      {appointment && (
        <Box sx={{ mt: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Detalhes do Agendamento
          </Typography>
          <Typography>
            Data: {appointment.date}
          </Typography>
          <Typography>
            Horário: {appointment.time}
          </Typography>
          <Typography>
            Professor: {appointment.teacherName}
          </Typography>
        </Box>
      )}
      <Button
        variant="contained"
        onClick={() => navigate('/')}
      >
        Voltar para Home
      </Button>
    </Box>
  );
} 