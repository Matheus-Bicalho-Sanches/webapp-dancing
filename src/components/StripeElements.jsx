import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/stripe-js/pure';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Typography
} from '@mui/material';

// Carrega a instância do Stripe com a chave pública
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Componente do formulário de pagamento
const SetupForm = ({ onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (submitError) {
        setError(submitError.message);
        onError(submitError);
      } else {
        onSuccess();
      }
    } catch (error) {
      setError(error.message);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <PaymentElement />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={!stripe || loading}
        fullWidth
      >
        {loading ? (
          <CircularProgress size={24} sx={{ mr: 1 }} />
        ) : (
          'Salvar Cartão'
        )}
      </Button>
    </form>
  );
};

// Componente principal que envolve o formulário com o Stripe Elements
const StripeElements = ({ clientSecret, onSuccess, onError }) => {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#1976d2',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'Roboto, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px',
      },
    },
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configurar Cartão de Crédito
      </Typography>
      
      {clientSecret ? (
        <Elements stripe={stripePromise} options={options}>
          <SetupForm onSuccess={onSuccess} onError={onError} />
        </Elements>
      ) : (
        <CircularProgress />
      )}
    </Paper>
  );
};

export default StripeElements; 