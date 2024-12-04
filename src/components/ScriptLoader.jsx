import { useState, useEffect } from 'react';
import { Alert } from '@mui/material';

export default function ScriptLoader({ children }) {
  const [status, setStatus] = useState({
    recaptcha: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    const addScript = (src, id) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.id = id;
      return script;
    };

    // Verificar se os scripts já foram carregados
    const recaptchaLoaded = !!window.grecaptcha;

    // Atualizar status inicial
    setStatus(prev => ({
      ...prev,
      recaptcha: recaptchaLoaded
    }));

    // Se todos os scripts já estiverem carregados, não fazer nada
    if (recaptchaLoaded) {
      setStatus(prev => ({
        ...prev,
        loading: false
      }));
      return;
    }

    // Adicionar reCAPTCHA se necessário
    if (!recaptchaLoaded) {
      const recaptchaScript = addScript(
        'https://www.google.com/recaptcha/api.js',
        'recaptcha'
      );

      recaptchaScript.onload = () => {
        setStatus(prev => ({
          ...prev,
          recaptcha: true,
          loading: false
        }));
      };

      recaptchaScript.onerror = () => {
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar reCAPTCHA. Verifique sua conexão.'
        }));
      };

      document.body.appendChild(recaptchaScript);
    }

    // Cleanup
    return () => {
      const recaptchaScript = document.getElementById('recaptcha');
      if (recaptchaScript) {
        recaptchaScript.remove();
      }
    };
  }, []);

  if (status.loading) {
    return <Alert severity="info">Carregando recursos necessários...</Alert>;
  }

  if (status.error) {
    return <Alert severity="error">{status.error}</Alert>;
  }

  if (!status.recaptcha) {
    return <Alert severity="warning">Aguardando carregamento dos recursos...</Alert>;
  }

  return children;
} 