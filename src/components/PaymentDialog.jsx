import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';

const PaymentDialog = ({ open, onClose, agendamento }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    const redirectToPagSeguro = async () => {
      if (!open || loading) return;

      try {
        if (!agendamento) {
          setError('Dados do agendamento não encontrados');
          return;
        }

        const { nomeAluno, email, valor } = agendamento;
        const valorNumerico = Number(valor);
        
        if (!nomeAluno || !email || isNaN(valorNumerico) || valorNumerico <= 0) {
          setError('Dados incompletos ou inválidos. Verifique nome, email e valor.');
          console.error('Dados do agendamento:', {
            ...agendamento,
            valorNumerico,
            valorValido: !isNaN(valorNumerico) && valorNumerico > 0
          });
          return;
        }

        setLoading(true);
        setError(null);

        console.log('Enviando dados para checkout:', {
          nomeAluno,
          email,
          valor: valorNumerico
        });

        const response = await fetch('/api/pagbank/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            agendamento: {
              nomeAluno,
              email,
              valor: valorNumerico
            }
          })
        });

        const data = await response.json();
        console.log('Resposta do checkout:', data);
        
        if (data.success && data.payment_url) {
          window.location.href = data.payment_url;
        } else {
          setError(data.error || 'Erro ao gerar link de pagamento. Por favor, tente novamente.');
          console.error('Erro no checkout:', data);
        }
      } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        setError('Erro ao conectar com o servidor. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    redirectToPagSeguro();
  }, [open, agendamento, loading]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Pagamento
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            {agendamento && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Detalhes: 
                Nome: {agendamento.nomeAluno || 'não informado'}, 
                Email: {agendamento.email || 'não informado'}, 
                Valor: R$ {Number(agendamento.valor).toFixed(2) || '0,00'}
              </Typography>
            )}
          </Alert>
        ) : (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>
              Redirecionando para o ambiente seguro do PagSeguro...
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog; 