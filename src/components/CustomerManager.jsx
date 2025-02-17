import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Person as PersonIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { asaasService } from '../services/asaasService';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function CustomerManager({ onCustomerCreated }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    phone: '',
    mobilePhone: '',
    address: '',
    addressNumber: '',
    complement: '',
    province: '',
    postalCode: '',
    notificationDisabled: false,
    observations: ''
  });
  const [asaasCustomerId, setAsaasCustomerId] = useState(null);

  useEffect(() => {
    loadCustomerData();
  }, [currentUser]);

  const loadCustomerData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();

      if (userData?.asaasCustomerId) {
        setAsaasCustomerId(userData.asaasCustomerId);
        const customerResponse = await asaasService.getCustomer(userData.asaasCustomerId);
        setCustomerData(customerResponse);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
      setError('Erro ao carregar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCustomerData({
      name: '',
      email: '',
      cpfCnpj: '',
      phone: '',
      mobilePhone: '',
      address: '',
      addressNumber: '',
      complement: '',
      province: '',
      postalCode: '',
      notificationDisabled: false,
      observations: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setCustomerData(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validação dos campos obrigatórios
      if (!customerData.name || !customerData.email || !customerData.cpfCnpj) {
        setError('Nome, email e CPF/CNPJ são obrigatórios');
        return;
      }

      // Validação do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerData.email)) {
        setError('Email inválido');
        return;
      }

      // Validação do CPF/CNPJ
      const cpfCnpjNumbers = customerData.cpfCnpj.replace(/\D/g, '');
      if (cpfCnpjNumbers.length !== 11 && cpfCnpjNumbers.length !== 14) {
        setError('CPF/CNPJ inválido');
        return;
      }

      // Validação do CEP (se fornecido)
      if (customerData.postalCode) {
        const cepNumbers = customerData.postalCode.replace(/\D/g, '');
        if (cepNumbers.length !== 8) {
          setError('CEP inválido');
          return;
        }
      }

      const formattedData = {
        ...customerData,
        externalReference: currentUser.uid,
        // Formata os campos numéricos
        cpfCnpj: customerData.cpfCnpj?.replace(/\D/g, ''),
        phone: customerData.phone?.replace(/\D/g, ''),
        mobilePhone: customerData.mobilePhone?.replace(/\D/g, ''),
        postalCode: customerData.postalCode?.replace(/\D/g, '')
      };

      let response;
      if (asaasCustomerId) {
        response = await asaasService.updateCustomer(asaasCustomerId, formattedData);
      } else {
        response = await asaasService.createCustomer(formattedData);
        // Atualiza o ID do cliente no Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
          asaasCustomerId: response.id
        });
        setAsaasCustomerId(response.id);
      }

      if (onCustomerCreated) {
        onCustomerCreated(response);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setError(error.message || 'Erro ao salvar cliente. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon />
          Dados do Cliente
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          {asaasCustomerId ? 'Atualizar Dados' : 'Cadastrar Cliente'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {asaasCustomerId ? 'Atualizar Dados do Cliente' : 'Cadastrar Novo Cliente'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome Completo"
                  name="name"
                  value={customerData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={customerData.email}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CPF/CNPJ"
                  name="cpfCnpj"
                  value={customerData.cpfCnpj}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  name="phone"
                  value={customerData.phone}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Celular"
                  name="mobilePhone"
                  value={customerData.mobilePhone}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Endereço"
                  name="address"
                  value={customerData.address}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Número"
                  name="addressNumber"
                  value={customerData.addressNumber}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Complemento"
                  name="complement"
                  value={customerData.complement}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Bairro"
                  name="province"
                  value={customerData.province}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CEP"
                  name="postalCode"
                  value={customerData.postalCode}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações"
                  name="observations"
                  value={customerData.observations}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={customerData.notificationDisabled}
                      onChange={handleInputChange}
                      name="notificationDisabled"
                    />
                  }
                  label="Desabilitar notificações"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (asaasCustomerId ? 'Atualizar' : 'Cadastrar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 