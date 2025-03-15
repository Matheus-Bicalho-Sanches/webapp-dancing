import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Alert, 
  Paper, 
  TextField,
  FormControlLabel,
  Switch,
  ToggleButtonGroup,
  ToggleButton,
  AlertTitle
} from '@mui/material';
import ZapSignService from '../../../services/ZapSignService';
import zapsignConfig from '../../../config/zapsign';

const ZapSignConnectionTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customToken, setCustomToken] = useState('');
  const [useCustomToken, setUseCustomToken] = useState(false);
  const [environment, setEnvironment] = useState(zapsignConfig.isProduction ? 'production' : 'development');
  const [currentApiUrl, setCurrentApiUrl] = useState('');
  
  // Quando o ambiente muda, atualize a URL da API usada para testes
  useEffect(() => {
    const useProductionApi = environment === 'production';
    
    // Usar o serviço para obter a URL correta (considerando o proxy)
    const apiUrl = ZapSignService.getApiUrl(useProductionApi);
    setCurrentApiUrl(apiUrl);
  }, [environment]);
  
  const handleEnvironmentChange = (event, newEnvironment) => {
    if (newEnvironment !== null) {
      setEnvironment(newEnvironment);
      setResult(null); // Limpar resultados anteriores
    }
  };
  
  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Usar API URL baseada no ambiente selecionado para este teste
      const useProductionApi = environment === 'production';
      
      // Se estiver usando token customizado, passar o token para o método testConnection
      if (useCustomToken && customToken) {
        const testResult = await ZapSignService.testConnection(customToken, useProductionApi);
        setResult(testResult);
      } else {
        // Usar o token configurado
        const testResult = await ZapSignService.testConnection(null, useProductionApi);
        setResult(testResult);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Erro ao testar conexão',
        error: error.toString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getApiDescription = () => {
    // Verifica se estamos usando o proxy
    if (currentApiUrl.startsWith('/zapsign-api')) {
      const isProduction = currentApiUrl.includes('/prod');
      const actualUrl = isProduction 
        ? 'https://api.zapsign.com.br/api/v1 (via proxy local)'
        : 'https://sandbox.zapsign.com.br/api/v1 (via proxy local)';
      
      return actualUrl;
    }
    
    return currentApiUrl;
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Teste de Conexão com ZapSign
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Ambiente de Teste
        </Typography>
        <ToggleButtonGroup
          value={environment}
          exclusive
          onChange={handleEnvironmentChange}
          aria-label="Ambiente da API"
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="development" aria-label="sandbox">
            Sandbox
          </ToggleButton>
          <ToggleButton value="production" aria-label="produção">
            Produção
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Ambiente selecionado: <strong>{environment === 'production' ? 'Produção' : 'Desenvolvimento (Sandbox)'}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          URL da API: <strong>{getApiDescription()}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Token configurado: Bearer {ZapSignService.getApiToken(environment === 'production') || 'Não configurado'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Token de produção: Bearer {import.meta.env.VITE_ZAPSIGN_API_TOKEN_PROD || 'Não configurado'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Token de sandbox: Bearer {import.meta.env.VITE_ZAPSIGN_API_TOKEN_DEV || 'Não configurado'}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <FormControlLabel 
          control={
            <Switch 
              checked={useCustomToken} 
              onChange={(e) => setUseCustomToken(e.target.checked)} 
            />
          } 
          label="Usar token personalizado" 
        />
        
        {useCustomToken && (
          <TextField
            fullWidth
            label="Token da API ZapSign"
            variant="outlined"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
            margin="normal"
            size="small"
            type="password"
            helperText="Este token será usado apenas para este teste e não será salvo"
          />
        )}
      </Box>
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleTest}
        disabled={loading || (useCustomToken && !customToken)}
        sx={{ mr: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Testar Conexão'}
      </Button>
      
      {result && (
        <Box sx={{ mt: 2 }}>
          {result.success ? (
            <Alert severity="success">
              <AlertTitle>Conexão bem-sucedida</AlertTitle>
              {result.message}
            </Alert>
          ) : (
            <Alert severity="error">
              <AlertTitle>Erro ao testar conexão</AlertTitle>
              {result.message}
              {result.error && (
                <>
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    Status: {result.error.status}
                  </Typography>
                  <Typography variant="body2" color="error">
                    Mensagem: {result.error.message}
                  </Typography>
                  {result.error.data && (
                    <Typography variant="body2" color="error">
                      Detalhes: {JSON.stringify(result.error.data, null, 2)}
                    </Typography>
                  )}
                </>
              )}
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ZapSignConnectionTest; 