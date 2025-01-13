import { useEffect, useState } from 'react';
import { Box, Paper, Typography, Container, AppBar, Toolbar } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ScheduleTab from '../../components/tabs/ScheduleTab';
import ScheduleSuccessDialog from '../../components/ScheduleSuccessDialog';
import axios from 'axios';

export default function Schedule() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      setSuccessDialogOpen(true);
      setLoading(true);
      
      axios.get(`/api/stripe/appointment-details/${sessionId}`)
        .then(response => {
          setAppointmentDetails(response.data.agendamento);
          setError(null);
        })
        .catch(err => {
          console.error('Erro ao buscar detalhes do agendamento:', err);
          setError('Não foi possível carregar os detalhes do agendamento. Por favor, entre em contato com o suporte.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [searchParams]);

  const handleCloseDialog = () => {
    setSuccessDialogOpen(false);
    // Remove query parameters
    navigate('/agendar', { replace: true });
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <AppBar position="fixed" sx={{ backgroundColor: '#1976d2' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Dancing Patinação
          </Typography>
        </Toolbar>
      </AppBar>

      <Container 
        maxWidth="xl" 
        sx={{ 
          mt: 8,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ p: 3 }}>
          <Paper 
            sx={{ 
              p: 3, 
              mb: 3,
              backgroundColor: '#fff'
            }}
          >
            <Typography variant="h5" gutterBottom>
              Agende sua Aula Individual
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Clique nos horários e professores de sua preferência e, depois, em "Agendar horários" para marcar as aulas.
            </Typography>
          </Paper>
          
          <ScheduleTab isPublic={true} />
        </Box>
      </Container>

      <ScheduleSuccessDialog
        open={successDialogOpen}
        onClose={handleCloseDialog}
        appointmentDetails={appointmentDetails}
        loading={loading}
        error={error}
      />
    </Box>
  );
}