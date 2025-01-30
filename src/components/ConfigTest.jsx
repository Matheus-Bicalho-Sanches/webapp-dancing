import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { auth, db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const ConfigTest = () => {
  const [status, setStatus] = useState({
    firebase: { isLoading: true, isValid: false, error: null },
    firestore: { isLoading: true, isValid: false, error: null },
    stripe: { isLoading: true, isValid: false, error: null }
  });

  useEffect(() => {
    const testConfigs = async () => {
      // Test Firebase Auth
      try {
        await auth.signInAnonymously();
        setStatus(prev => ({
          ...prev,
          firebase: { isLoading: false, isValid: true, error: null }
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          firebase: { isLoading: false, isValid: false, error: error.message }
        }));
      }

      // Test Firestore
      try {
        const testCollection = collection(db, 'test');
        await getDocs(testCollection);
        setStatus(prev => ({
          ...prev,
          firestore: { isLoading: false, isValid: true, error: null }
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          firestore: { isLoading: false, isValid: false, error: error.message }
        }));
      }

      // Test Stripe Key Format
      try {
        const stripeKey = process.env.VITE_STRIPE_PUBLIC_KEY;
        const isValidStripeKey = stripeKey && stripeKey.startsWith('pk_');
        setStatus(prev => ({
          ...prev,
          stripe: { 
            isLoading: false, 
            isValid: isValidStripeKey, 
            error: isValidStripeKey ? null : 'Invalid Stripe public key format'
          }
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          stripe: { isLoading: false, isValid: false, error: error.message }
        }));
      }
    };

    testConfigs();
  }, []);

  const renderStatus = (name, { isLoading, isValid, error }) => (
    <Box mb={2}>
      <Typography variant="h6" gutterBottom>
        {name} Status: {' '}
        {isLoading ? (
          <CircularProgress size={20} />
        ) : isValid ? (
          '✅ Working'
        ) : (
          '❌ Error'
        )}
      </Typography>
      {error && (
        <Typography color="error" variant="body2">
          Error: {error}
        </Typography>
      )}
    </Box>
  );

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Configuration Test Results
        </Typography>

        {renderStatus('Firebase Auth', status.firebase)}
        {renderStatus('Firestore', status.firestore)}
        {renderStatus('Stripe', status.stripe)}

        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Environment Variables:
          </Typography>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '1rem', 
            borderRadius: '4px',
            overflowX: 'auto'
          }}>
            {`
FIREBASE_PROJECT_ID: ${process.env.VITE_FIREBASE_PROJECT_ID || 'Not set'}
FIREBASE_AUTH_DOMAIN: ${process.env.VITE_FIREBASE_AUTH_DOMAIN || 'Not set'}
STRIPE_PUBLIC_KEY: ${process.env.VITE_STRIPE_PUBLIC_KEY ? 
  '****' + process.env.VITE_STRIPE_PUBLIC_KEY.slice(-4) : 
  'Not set'}
            `.trim()}
          </pre>
        </Box>
      </Paper>
    </Box>
  );
};

export default ConfigTest; 