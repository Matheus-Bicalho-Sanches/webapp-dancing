import { Box, Paper, Typography, Container, AppBar, Toolbar, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ScheduleTab from '../../components/tabs/ScheduleTab';
import { useState } from 'react';

export default function Schedule() {
  const [openDialog, setOpenDialog] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para testar a API do Mercado Pago
  const testMercadoPago = async () => {
    try {
      setLoading(true);
      setError(null);

      // Dados de teste
      const testData = {
        items: [{
          id: "TEST-1",
          title: "Aula de Patinação",
          description: "Aula individual de patinação",
          quantity: 1,
          currency_id: "BRL",
          unit_price: getValuePerClass(1)
        }],
        payer: {
          email: "test_user_123456@testuser.com",
          first_name: "Test",
          last_name: "User",
          identification: {
            type: "CPF",
            number: "19119119100"
          }
        }
      };

      console.log('Enviando dados para criação de preferência:', testData);

      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar preferência de pagamento');
      }

      const data = await response.json();
      console.log('Resposta do Mercado Pago:', data);
      
      if (data.success) {
        // Em ambiente de desenvolvimento, usar sandbox_init_point
        const paymentUrl = data.sandbox_init_point || data.init_point;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          throw new Error('URL de pagamento não encontrada na resposta');
        }
      } else {
        throw new Error('URL de pagamento não encontrada na resposta');
      }
    } catch (error) {
      console.error('Erro ao testar Mercado Pago:', error);
      setError(error.message || 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setPaymentData(null);
    setError(null);
  };

  // Sempre mostrar o botão de teste por enquanto
  const showTestButton = true;

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
          {showTestButton && (
            <Button 
              color="inherit" 
              onClick={testMercadoPago}
              disabled={loading}
              sx={{ mr: 2 }}
            >
              {loading ? 'Processando...' : 'Testar Mercado Pago'}
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

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {error ? 'Erro no Pagamento' : 'Pagamento via Mercado Pago'}
        </DialogTitle>
        <DialogContent>
          {error ? (
            <Typography color="error" sx={{ p: 2 }}>
              {error}
            </Typography>
          ) : (
            <Typography sx={{ p: 2 }}>
              Redirecionando para o Mercado Pago...
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {error ? 'Tentar Novamente' : 'Fechar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}