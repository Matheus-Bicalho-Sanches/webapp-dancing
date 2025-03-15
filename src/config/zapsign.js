/**
 * Configuração da API ZapSign
 * Este arquivo contém as configurações necessárias para a integração com a API ZapSign
 */

// Configurações de ambiente
const ENV = import.meta.env.MODE || 'development';

// URLs da API baseados no ambiente
const API_URLS = {
  development: 'https://sandbox.zapsign.com.br/api/v1',
  production: 'https://api.zapsign.com.br/api/v1',
};

// Token de acesso - Deve ser preenchido com seu token da ZapSign
// Importante: O ideal é que este token seja armazenado em variáveis de ambiente e não diretamente no código
const API_TOKENS = {
  development: import.meta.env.VITE_ZAPSIGN_API_TOKEN_DEV || import.meta.env.REACT_APP_ZAPSIGN_API_TOKEN_DEV || '',
  production: import.meta.env.VITE_ZAPSIGN_API_TOKEN_PROD || import.meta.env.REACT_APP_ZAPSIGN_API_TOKEN_PROD || '',
};

// URLs de interface do ZapSign
const INTERFACE_URLS = {
  development: 'https://sandbox.zapsign.com.br',
  production: 'https://app.zapsign.com.br',
};

// Configuração de timeouts de requisições (em milissegundos)
const REQUEST_TIMEOUT = 30000; // 30 segundos

// Exporta configurações com base no ambiente atual
const zapsignConfig = {
  apiUrl: API_URLS[ENV],
  apiToken: API_TOKENS[ENV],
  interfaceUrl: INTERFACE_URLS[ENV],
  requestTimeout: REQUEST_TIMEOUT,
  isProduction: ENV === 'production',
};

export default zapsignConfig; 