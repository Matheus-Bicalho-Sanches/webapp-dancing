import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Box } from '@mui/material';
import PaymentRejectionDetails from '../../components/PaymentRejectionDetails';

const PaymentFailure = () => {
  const [paymentDetails, setPaymentDetails] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const statusDetail = searchParams.get('status_detail');

    // Simular os detalhes da rejeição com base nos parâmetros da URL
    const rejectionDetails = {
      title: 'Pagamento não aprovado',
      message: 'Infelizmente não foi possível processar seu pagamento.',
      recommendation: 'Por favor, tente novamente com outro cartão ou entre em contato com seu banco.',
      status,
      status_detail: statusDetail,
      payment_id: paymentId
    };

    setPaymentDetails(rejectionDetails);
  }, [location]);

  const handleRetry = () => {
    // Voltar para a página de agendamento
    navigate('/schedule');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Falha no Pagamento
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Identificamos um problema ao processar seu pagamento.
          </Typography>
        </Box>

        {paymentDetails && (
          <PaymentRejectionDetails 
            rejectionDetails={paymentDetails}
            onRetry={handleRetry}
          />
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Se o problema persistir, entre em contato conosco através do WhatsApp.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PaymentFailure; 