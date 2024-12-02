import React, { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Box, Button, Typography, Alert } from '@mui/material';

const TestRecaptcha = () => {
  const recaptchaRef = useRef();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTest = async () => {
    try {
      setError(null);
      setResult(null);

      const recaptchaValue = recaptchaRef.current.getValue();
      if (!recaptchaValue) {
        setError('Por favor, complete a verificação de segurança');
        return;
      }

      const response = await fetch('/api/test-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recaptchaToken: recaptchaValue })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Erro na validação do reCAPTCHA');
      }
    } catch (error) {
      console.error('Erro ao testar reCAPTCHA:', error);
      setError('Erro ao testar reCAPTCHA');
    } finally {
      recaptchaRef.current.reset();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Teste do reCAPTCHA
      </Typography>

      <Box sx={{ my: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
          size="normal"
          theme="light"
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleTest}
          sx={{ mb: 2 }}
        >
          Testar reCAPTCHA
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          reCAPTCHA validado com sucesso!
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(result.details, null, 2)}
          </pre>
        </Alert>
      )}
    </Box>
  );
};

export default TestRecaptcha; 