import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { asaasService } from '../services/asaasService';

export default function CreditCardManager({ customerId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [cardData, setCardData] = useState({
    creditCard: {
      holderName: '',
      number: '',
      expiryMonth: '',
      expiryYear: '',
      ccv: ''
    },
    holderInfo: {
      name: '',
      email: '',
      cpfCnpj: '',
      phone: '',
      mobilePhone: '',
      postalCode: '',
      addressNumber: '',
      addressComplement: ''
    }
  });
  const [savedCards, setSavedCards] = useState([]);

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCardData({
      creditCard: {
        holderName: '',
        number: '',
        expiryMonth: '',
        expiryYear: '',
        ccv: ''
      },
      holderInfo: {
        name: '',
        email: '',
        cpfCnpj: '',
        phone: '',
        mobilePhone: '',
        postalCode: '',
        addressNumber: '',
        addressComplement: ''
      }
    });
  };

  const handleInputChange = (section, e) => {
    const { name, value } = e.target;
    setCardData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validação dos campos obrigatórios do cartão
      const requiredCardFields = ['holderName', 'number', 'expiryMonth', 'expiryYear', 'ccv'];
      const missingCardFields = requiredCardFields.filter(field => !cardData.creditCard[field]);
      
      if (missingCardFields.length > 0) {
        setError(`Os seguintes campos do cartão são obrigatórios: ${missingCardFields.join(', ')}`);
        return;
      }

      // Validação dos campos obrigatórios do titular
      const requiredHolderFields = ['name', 'email', 'cpfCnpj'];
      const missingHolderFields = requiredHolderFields.filter(field => !cardData.holderInfo[field]);
      
      if (missingHolderFields.length > 0) {
        setError(`Os seguintes campos do titular são obrigatórios: ${missingHolderFields.join(', ')}`);
        return;
      }

      const response = await asaasService.tokenizeCreditCard({
        customer: customerId,
        creditCard: cardData.creditCard,
        holderInfo: cardData.holderInfo
      });

      if (onSuccess) {
        onSuccess(response.creditCardToken);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
      setError(
        'Erro ao salvar cartão. ' +
        (error.response?.data?.errors?.[0]?.description || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (number) => {
    return `•••• •••• •••• ${number.slice(-4)}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreditCardIcon />
          Cartões de Crédito
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          disabled={!customerId}
        >
          Adicionar Cartão
        </Button>
      </Box>

      {!customerId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          É necessário cadastrar o cliente antes de adicionar um cartão
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {savedCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.token}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    {formatCardNumber(card.number)}
                  </Typography>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteCard(card.token)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {card.holderName}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Chip
                    label={`${card.brand}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Expira em ${card.expiryMonth}/${card.expiryYear}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Adicionar Cartão de Crédito</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Dados do Cartão
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome no Cartão"
                  name="holderName"
                  value={cardData.creditCard.holderName}
                  onChange={(e) => handleInputChange('creditCard', e)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Número do Cartão"
                  name="number"
                  value={cardData.creditCard.number}
                  onChange={(e) => handleInputChange('creditCard', e)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Mês de Expiração"
                  name="expiryMonth"
                  value={cardData.creditCard.expiryMonth}
                  onChange={(e) => handleInputChange('creditCard', e)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Ano de Expiração"
                  name="expiryYear"
                  value={cardData.creditCard.expiryYear}
                  onChange={(e) => handleInputChange('creditCard', e)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="CCV"
                  name="ccv"
                  value={cardData.creditCard.ccv}
                  onChange={(e) => handleInputChange('creditCard', e)}
                  required
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
              Dados do Titular
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome do Titular"
                  name="name"
                  value={cardData.holderInfo.name}
                  onChange={(e) => handleInputChange('holderInfo', e)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={cardData.holderInfo.email}
                  onChange={(e) => handleInputChange('holderInfo', e)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CPF/CNPJ"
                  name="cpfCnpj"
                  value={cardData.holderInfo.cpfCnpj}
                  onChange={(e) => handleInputChange('holderInfo', e)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  name="phone"
                  value={cardData.holderInfo.phone}
                  onChange={(e) => handleInputChange('holderInfo', e)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Celular"
                  name="mobilePhone"
                  value={cardData.holderInfo.mobilePhone}
                  onChange={(e) => handleInputChange('holderInfo', e)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CEP"
                  name="postalCode"
                  value={cardData.holderInfo.postalCode}
                  onChange={(e) => handleInputChange('holderInfo', e)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número"
                  name="addressNumber"
                  value={cardData.holderInfo.addressNumber}
                  onChange={(e) => handleInputChange('holderInfo', e)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Complemento"
                  name="addressComplement"
                  value={cardData.holderInfo.addressComplement}
                  onChange={(e) => handleInputChange('holderInfo', e)}
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
            {loading ? <CircularProgress size={24} /> : 'Salvar Cartão'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 