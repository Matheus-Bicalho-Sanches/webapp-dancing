import { Box, Paper, Typography, Container, AppBar, Toolbar, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ScheduleTab from '../../components/tabs/ScheduleTab';
import { useState } from 'react';

export default function Schedule() {
  const [openDialog, setOpenDialog] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para testar a API
  const testCheckoutAPI = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/pagbank/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agendamento: {
            nomeAluno: 'Teste',
            email: 'teste@teste.com',
            valor: 100
          }
        })
      });

      const data = await response.json();
      console.log('Resposta da API:', data);
      
      if (data.success && data.qr_code) {
        setPaymentData(data);
        setOpenDialog(true);
      } else {
        setError(data.error || 'Erro ao gerar pagamento. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao testar API:', error);
      setError('Erro ao conectar com o servidor. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setPaymentData(null);
    setError(null);
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
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Testar API PagBank'}
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
          {error ? 'Erro no Pagamento' : 'Pagamento via PIX'}
        </DialogTitle>
        <DialogContent>
          {error ? (
            <Typography color="error" sx={{ p: 2 }}>
              {error}
            </Typography>
          ) : paymentData?.qr_code ? (
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
                Código PIX expira em 24 horas
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                ID do Pedido: {paymentData.order_id}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ p: 2 }}>
              Aguarde, processando pagamento...
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