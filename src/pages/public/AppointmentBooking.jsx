import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

const steps = ['Selecionar Data', 'Escolher Horário', 'Informações Pessoais', 'Pagamento'];

export default function AppointmentBooking() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    observacoes: ''
  });

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async (date) => {
    setLoading(true);
    try {
      const formattedDate = dayjs(date).format('YYYY-MM-DD');
      const response = await fetch(`/api/stripe/check-slot/${formattedDate}`);
      const data = await response.json();
      setAvailableSlots(data.slots);
      setError(null);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setError('Erro ao carregar horários disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      await handlePayment();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 5000, // R$ 50,00
          payer: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            cpf: formData.cpf,
            observacoes: formData.observacoes
          },
          items: [{
            name: 'Aula de Patinação',
            quantity: 1
          }],
          horarios: [{
            date: dayjs(selectedDate).format('YYYY-MM-DD'),
            horario: selectedSlot.time,
            professorId: selectedSlot.teacherId,
            professorNome: selectedSlot.teacherName
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar sessão de pagamento');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Payment error:', error);
      setError('Erro ao processar pagamento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <DatePicker
              label="Data da Aula"
              value={selectedDate}
              onChange={setSelectedDate}
              minDate={dayjs().add(1, 'day')}
              maxDate={dayjs().add(30, 'days')}
              disableWeekends
            />
          </LocalizationProvider>
        );
      case 1:
        return (
          <Grid container spacing={2}>
            {loading ? (
              <CircularProgress />
            ) : (
              availableSlots.map((slot) => (
                <Grid item xs={12} sm={6} md={4} key={slot.id}>
                  <Button
                    variant={selectedSlot?.id === slot.id ? "contained" : "outlined"}
                    onClick={() => setSelectedSlot(slot)}
                    fullWidth
                  >
                    {slot.time} - {slot.teacherName}
                  </Button>
                </Grid>
              ))
            )}
          </Grid>
        );
      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome Completo"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CPF"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações"
                  name="observacoes"
                  multiline
                  rows={4}
                  value={formData.observacoes}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </Box>
        );
      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resumo do Agendamento
            </Typography>
            <Typography>
              Data: {dayjs(selectedDate).format('DD/MM/YYYY')}
            </Typography>
            <Typography>
              Horário: {selectedSlot?.time}
            </Typography>
            <Typography>
              Professor: {selectedSlot?.teacherName}
            </Typography>
            <Typography>
              Valor: R$ 50,00
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 4 }}>
        {renderStepContent(activeStep)}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          sx={{ mr: 1 }}
        >
          Voltar
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading || 
            (activeStep === 0 && !selectedDate) ||
            (activeStep === 1 && !selectedSlot) ||
            (activeStep === 2 && (!formData.name || !formData.email || !formData.phone || !formData.cpf))
          }
        >
          {loading ? <CircularProgress size={24} /> : 
            activeStep === steps.length - 1 ? 'Pagar' : 'Próximo'}
        </Button>
      </Box>
    </Box>
  );
} 