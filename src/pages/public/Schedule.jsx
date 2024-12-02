import { Box, Paper, Typography, Container, AppBar, Toolbar, Button } from '@mui/material';
import ScheduleTab from '../../components/tabs/ScheduleTab';

export default function Schedule() {
  // Função para testar a API
  const testCheckoutAPI = async () => {
    try {
      const response = await fetch('/api/pagbank/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agendamento: {
            nomeAluno: 'Teste',
            email: 'teste@teste.com'
          }
        })
      });

      const data = await response.json();
      console.log('Resposta da API:', data);
    } catch (error) {
      console.error('Erro ao testar API:', error);
    }
  };

  const isDevelopment = import.meta.env.DEV;

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
          {isDevelopment && (
            <Button 
              color="inherit" 
              onClick={testCheckoutAPI}
            >
              Testar API PagBank
            </Button>
          )}
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