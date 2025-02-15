import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  InputAdornment,
  Divider,
  Alert
} from '@mui/material';
import { productService } from '../../../services/productService';

// Constantes para tipos de pagamento
const PAYMENT_TYPES = {
  MENSALIDADE: 'Mensalidade',
  OUTROS: 'Outros'
};

function NewPaymentModal({ open, onClose, onConfirm }) {
  console.log('NewPaymentModal renderizado, open:', open);

  const [formData, setFormData] = useState({
    description: '',
    paymentType: '',
    value: '',
    dueDate: ''
  });
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    console.log('Modal open state changed:', open);
    if (open) {
      setFormData({
        description: '',
        paymentType: '',
        value: '',
        dueDate: ''
      });
      setError('');
    }
  }, [open]);

  const selectPaymentType = (type) => {
    console.log('selectPaymentType chamado com:', type);
    setFormData(prev => {
      const newState = {
        ...prev,
        paymentType: type,
        value: '',
        description: ''
      };
      console.log('Novo estado após alteração do tipo de pagamento:', newState);
      return newState;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('handleInputChange:', { name, value });
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      onConfirm({
        ...formData,
        createdAt: new Date(),
        status: 'pendente',
        value: parseFloat(formData.value)
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setError('Erro ao processar pagamento. Por favor, tente novamente.');
    }
  };

  const isFormValid = () => {
    return formData.description && formData.value && formData.paymentType && formData.dueDate;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid #e0e0e0',
        px: 3,
        py: 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Novo Pagamento
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Tipo de Pagamento</InputLabel>
              <Select
                value={formData.paymentType}
                label="Tipo de Pagamento"
              >
                <MenuItem value="" onClick={() => selectPaymentType("")}>
                  Selecione...
                </MenuItem>
                <MenuItem 
                  value={PAYMENT_TYPES.MENSALIDADE} 
                  onClick={() => selectPaymentType(PAYMENT_TYPES.MENSALIDADE)}
                >
                  {PAYMENT_TYPES.MENSALIDADE}
                </MenuItem>
                <MenuItem 
                  value={PAYMENT_TYPES.OUTROS} 
                  onClick={() => selectPaymentType(PAYMENT_TYPES.OUTROS)}
                >
                  {PAYMENT_TYPES.OUTROS}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descrição"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Valor"
              name="value"
              type="number"
              value={formData.value}
              onChange={handleInputChange}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Data de Vencimento"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleInputChange}
              required
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button 
          onClick={onClose}
          sx={{ color: 'text.secondary' }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid()}
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default NewPaymentModal; 