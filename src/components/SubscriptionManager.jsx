import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Chip,
  Stack,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { asaasService } from '../services/asaasService';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import CustomerManager from './CustomerManager';
import CreditCardManager from './CreditCardManager';
import dayjs from 'dayjs';

const steps = ['Dados do Cliente', 'Cartão de Crédito', 'Dados da Assinatura'];

export const SubscriptionManager = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPaymentsDialog, setOpenPaymentsDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [asaasCustomerId, setAsaasCustomerId] = useState(null);
  const [creditCardToken, setCreditCardToken] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [subscriptionData, setSubscriptionData] = useState({
    value: '',
    cycle: 'MONTHLY',
    description: '',
    nextDueDate: dayjs().add(1, 'day').format('YYYY-MM-DD')
  });

  useEffect(() => {
    loadCustomerData();
  }, [currentUser]);

  const loadCustomerData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();

      if (userData?.asaasCustomerId) {
        setAsaasCustomerId(userData.asaasCustomerId);
        await loadSubscriptions(userData.asaasCustomerId);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
      setError('Erro ao carregar dados do cliente. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async (customerId) => {
    try {
      const response = await asaasService.getCustomerSubscriptions(customerId);
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
      setError('Erro ao carregar assinaturas. Por favor, tente novamente.');
    }
  };

  const loadSubscriptionPayments = async (subscriptionId) => {
    try {
      setLoading(true);
      const response = await asaasService.getSubscriptionPayments(subscriptionId);
      setPayments(response.data);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      setError('Erro ao carregar pagamentos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setError(null);
    setActiveStep(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSubscriptionData({
      value: '',
      cycle: 'MONTHLY',
      description: '',
      nextDueDate: dayjs().add(1, 'day').format('YYYY-MM-DD')
    });
    setCreditCardToken(null);
    setActiveStep(0);
  };

  const handleOpenPaymentsDialog = async (subscription) => {
    setSelectedSubscription(subscription);
    setOpenPaymentsDialog(true);
    await loadSubscriptionPayments(subscription.id);
  };

  const handleClosePaymentsDialog = () => {
    setOpenPaymentsDialog(false);
    setSelectedSubscription(null);
    setPayments([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSubscriptionData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleCustomerCreated = (customerResponse) => {
    setAsaasCustomerId(customerResponse.id);
    handleNext();
  };

  const handleCardCreated = (token) => {
    setCreditCardToken(token);
    handleNext();
  };

  const handleSubmit = async () => {
    if (!creditCardToken) {
      setError('Por favor, adicione um cartão de crédito.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await asaasService.createSubscription({
        customerId: asaasCustomerId,
        creditCardToken,
        value: parseFloat(subscriptionData.value),
        nextDueDate: subscriptionData.nextDueDate,
        cycle: subscriptionData.cycle,
        description: subscriptionData.description,
        externalReference: `subscription_${currentUser.uid}_${Date.now()}`
      });

      await loadSubscriptions(asaasCustomerId);
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      setError('Erro ao criar assinatura. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta assinatura?')) return;

    try {
      setLoading(true);
      await asaasService.cancelSubscription(subscriptionId);
      await loadSubscriptions(asaasCustomerId);
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      setError('Erro ao cancelar assinatura. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date) => {
    return dayjs(date).format('DD/MM/YYYY');
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'RECEIVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'OVERDUE':
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'RECEIVED':
        return 'Pago';
      case 'PENDING':
        return 'Pendente';
      case 'OVERDUE':
        return 'Vencido';
      case 'FAILED':
        return 'Falhou';
      default:
        return status;
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <CustomerManager
            onCustomerCreated={handleCustomerCreated}
          />
        );
      case 1:
        return (
          <CreditCardManager
            customerId={asaasCustomerId}
            onSuccess={handleCardCreated}
          />
        );
      case 2:
        return (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Valor"
                  name="value"
                  type="number"
                  value={subscriptionData.value}
                  onChange={handleInputChange}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Ciclo</InputLabel>
                  <Select
                    name="cycle"
                    value={subscriptionData.cycle}
                    onChange={handleInputChange}
                    label="Ciclo"
                  >
                    <MenuItem value="WEEKLY">Semanal</MenuItem>
                    <MenuItem value="BIWEEKLY">Quinzenal</MenuItem>
                    <MenuItem value="MONTHLY">Mensal</MenuItem>
                    <MenuItem value="QUARTERLY">Trimestral</MenuItem>
                    <MenuItem value="SEMIANNUAL">Semestral</MenuItem>
                    <MenuItem value="ANNUAL">Anual</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição"
                  name="description"
                  value={subscriptionData.description}
                  onChange={handleInputChange}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Próximo Vencimento"
                  name="nextDueDate"
                  type="date"
                  value={subscriptionData.nextDueDate}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return 'Passo desconhecido';
    }
  };

  if (loading && !openDialog && !openPaymentsDialog) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon />
          Assinaturas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Nova Assinatura
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {subscriptions.map((subscription) => (
          <Grid item xs={12} sm={6} md={4} key={subscription.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    {formatCurrency(subscription.value)}
                  </Typography>
                  <Box>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenPaymentsDialog(subscription)}
                      size="small"
                    >
                      <HistoryIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteSubscription(subscription.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {subscription.description}
                </Typography>
                <Typography variant="body2">
                  Próximo vencimento: {formatDate(subscription.nextDueDate)}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Chip
                    label={subscription.cycle}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={subscription.status}
                    color={subscription.status === 'ACTIVE' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog para nova assinatura */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Nova Assinatura</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {getStepContent(activeStep)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>
              Voltar
            </Button>
          )}
          {activeStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Criar Assinatura'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      {/* Dialog para histórico de pagamentos */}
      <Dialog
        open={openPaymentsDialog}
        onClose={handleClosePaymentsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Histórico de Pagamentos
          {selectedSubscription && (
            <Typography variant="subtitle2" color="textSecondary">
              {selectedSubscription.description}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                {payments.map((payment) => (
                  <Paper key={payment.id} sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Data
                        </Typography>
                        <Typography>
                          {formatDate(payment.dueDate)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Valor
                        </Typography>
                        <Typography>
                          {formatCurrency(payment.value)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Status
                        </Typography>
                        <Chip
                          label={getPaymentStatusLabel(payment.status)}
                          color={getPaymentStatusColor(payment.status)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Forma de Pagamento
                        </Typography>
                        <Typography>
                          {payment.billingType}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
                {payments.length === 0 && (
                  <Typography align="center" color="textSecondary">
                    Nenhum pagamento encontrado
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentsDialog}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 