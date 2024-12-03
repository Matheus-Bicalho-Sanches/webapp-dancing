import React, { useEffect, useState } from 'react';
import { CircularProgress, Alert, Box } from '@mui/material';

const ScriptLoader = ({ children }) => {
  const [status, setStatus] = useState({
    recaptcha: false,
    pagbank: false,
    error: null
  });

  useEffect(() => {
    // Função para adicionar script
    const addScript = (src, id) => {
      const script = document.createElement('script');
      script.src = src;
      script.id = id;
      script.async = true;
      document.head.appendChild(script);
      return script;
    };

    // Adicionar reCAPTCHA
    const recaptchaScript = addScript(
      'https://www.google.com/recaptcha/api.js',
      'recaptcha'
    );

    // Adicionar PagBank
    const pagbankScript = addScript(
      'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js',
      'pagbank'
    );

    // Verificar carregamento a cada 500ms
    const interval = setInterval(() => {
      const recaptchaLoaded = !!window.grecaptcha;
      const pagbankLoaded = !!window.PagSeguro;

      setStatus(prev => ({
        ...prev,
        recaptcha: recaptchaLoaded,
        pagbank: pagbankLoaded
      }));

      // Se ambos carregaram, limpar intervalo
      if (recaptchaLoaded && pagbankLoaded) {
        clearInterval(interval);
      }
    }, 500);

    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      if (!status.recaptcha || !status.pagbank) {
        setStatus(prev => ({
          ...prev,
          error: 'Tempo limite excedido ao carregar componentes. Por favor, recarregue a página.'
        }));
        clearInterval(interval);
      }
    }, 10000);

    // Tratamento de erros
    recaptchaScript.onerror = () => {
      setStatus(prev => ({
        ...prev,
        error: 'Erro ao carregar reCAPTCHA. Verifique sua conexão.'
      }));
    };

    pagbankScript.onerror = () => {
      setStatus(prev => ({
        ...prev,
        error: 'Erro ao carregar PagBank. Verifique sua conexão.'
      }));
    };

    // Cleanup
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (status.error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {status.error}
      </Alert>
    );
  }

  if (!status.recaptcha || !status.pagbank) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return children;
};

export default ScriptLoader; 