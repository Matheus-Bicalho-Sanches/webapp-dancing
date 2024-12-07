import { Box, Paper, Typography, Container, AppBar, Toolbar, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ScheduleTab from '../../components/tabs/ScheduleTab';
import { useState } from 'react';

export default function Schedule() {
  const [openDialog, setOpenDialog] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setPaymentData(null);
    setError(null);
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
    </Box>
  );
}