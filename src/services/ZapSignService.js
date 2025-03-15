/**
 * Serviço para integração com a API ZapSign
 */
import zapsignConfig from '../config/zapsign';

class ZapSignService {
  /**
   * Construtor do serviço
   */
  constructor() {
    this.timeout = zapsignConfig.requestTimeout;
    this._customToken = null;
    this._forceProduction = null;
    
    // Verificar se estamos em ambiente de desenvolvimento (localhost)
    this.isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }

  /**
   * Obtém a URL da API atual
   * @param {boolean} useProduction - Se verdadeiro, força o uso da API de produção
   * @returns {string} URL da API
   */
  getApiUrl(useProduction = null) {
    // Se estamos em localhost, use o proxy para evitar erros de CORS
    if (this.isDevelopment) {
      const useProductionEnv = useProduction !== null ? useProduction : 
                            this._forceProduction !== null ? this._forceProduction : 
                            zapsignConfig.isProduction;
                            
      return useProductionEnv 
        ? '/zapsign-api/prod'
        : '/zapsign-api/sandbox';
    }
    
    // Caso contrário, usar as URLs diretas (para produção)
    // Se useProduction for explicitamente definido (não null), respeitar essa escolha
    if (useProduction !== null) {
      return useProduction
        ? 'https://api.zapsign.com.br'
        : 'https://api-sandbox.zapsign.com.br';
    }
    
    // Caso contrário, usar a configuração global
    if (this._forceProduction !== null) {
      return this._forceProduction
        ? 'https://api.zapsign.com.br'
        : 'https://api-sandbox.zapsign.com.br';
    }
    
    return zapsignConfig.apiUrl;
  }

  /**
   * Obtém o caminho base da API
   * @returns {string} Caminho base da API
   */
  getApiBasePath() {
    return '/api/v1';
  }

  /**
   * Obtém o token de API atual
   * @param {boolean} useProduction - Se verdadeiro, retorna o token de produção
   * @returns {string} Token de API
   */
  getApiToken(useProduction = null) {
    // Se há um token personalizado, esse tem prioridade
    if (this._customToken) {
      return this._customToken;
    }
    
    // Se useProduction for explicitamente definido (não null), respeitar essa escolha
    if (useProduction !== null) {
      return useProduction
        ? (import.meta.env.VITE_ZAPSIGN_API_TOKEN_PROD || import.meta.env.REACT_APP_ZAPSIGN_API_TOKEN_PROD || '')
        : (import.meta.env.VITE_ZAPSIGN_API_TOKEN_DEV || import.meta.env.REACT_APP_ZAPSIGN_API_TOKEN_DEV || '');
    }
    
    // Caso contrário, usar a configuração global
    if (this._forceProduction !== null) {
      return this._forceProduction
        ? (import.meta.env.VITE_ZAPSIGN_API_TOKEN_PROD || import.meta.env.REACT_APP_ZAPSIGN_API_TOKEN_PROD || '')
        : (import.meta.env.VITE_ZAPSIGN_API_TOKEN_DEV || import.meta.env.REACT_APP_ZAPSIGN_API_TOKEN_DEV || '');
    }
    
    return zapsignConfig.apiToken;
  }

  /**
   * Configuração dos headers padrão para as requisições
   * @param {boolean} useProduction - Se verdadeiro, usa o token de produção
   * @returns {Object} Headers da requisição
   */
  getHeaders(useProduction = null) {
    const token = this.getApiToken(useProduction);
    console.log('Token sendo usado:', token ? '********' + token.slice(-4) : 'não definido');
    
    // A API ZapSign espera o token com o prefixo "Bearer"
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Realiza uma requisição para a API do ZapSign
   * @param {string} endpoint - Endpoint da API
   * @param {Object} options - Opções da requisição (method, body, etc)
   * @param {boolean} useProduction - Se verdadeiro, força o uso da API de produção
   * @returns {Promise<Object>} Resposta da requisição
   */
  async request(endpoint, options = {}, useProduction = null) {
    const baseUrl = this.getApiUrl(useProduction);
    const basePath = this.getApiBasePath();
    const url = `${baseUrl}${basePath}${endpoint}`;
    
    console.log('\n=== REQUISIÇÃO ZAPSIGN ===');
    console.log('URL:', url);
    
    const fetchOptions = {
      method: options.method || 'GET',
      headers: this.getHeaders(useProduction),
      ...options,
    };

    // Log dos headers (mascarando apenas o token)
    const headersLog = {
      ...fetchOptions.headers,
      'Authorization': fetchOptions.headers.Authorization ? 
        fetchOptions.headers.Authorization.replace(/Bearer (.{4}).*(.{4})/, 'Bearer $1***$2') : 
        'não definido'
    };
    console.log('Headers:', JSON.stringify(headersLog, null, 2));

    if (options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body);
      console.log('Body:', fetchOptions.body);
    }

    try {
      // Implementação com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      fetchOptions.signal = controller.signal;
      
      console.log('\nEnviando requisição...');
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      console.log('\n=== RESPOSTA ZAPSIGN ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

      // Processar resposta
      const data = await response.json();
      console.log('Body da resposta:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'Erro ao comunicar com a API ZapSign',
          data
        };
      }
      
      return data;
    } catch (error) {
      console.log('\n=== ERRO NA REQUISIÇÃO ===');
      if (error.name === 'AbortError') {
        console.error(`Timeout: A requisição excedeu ${this.timeout}ms`);
        throw new Error(`Requisição para ${endpoint} excedeu o tempo limite de ${this.timeout}ms`);
      }
      
      console.error('Detalhes do erro:', error);
      throw error;
    } finally {
      console.log('\n=== FIM DA REQUISIÇÃO ===\n');
    }
  }

  /**
   * Verifica se o token da API está configurado
   * @param {boolean} useProduction - Se verdadeiro, verifica o token de produção
   * @returns {boolean}
   */
  isConfigured(useProduction = null) {
    return Boolean(this.getApiToken(useProduction) && this.getApiToken(useProduction).length > 0);
  }

  /**
   * Obtém a lista de documentos
   * @param {Object} filters - Filtros para a listagem
   * @param {boolean} useProduction - Se verdadeiro, usa a API de produção
   * @returns {Promise<Array>} Lista de documentos
   */
  async getDocuments(filters = {}, useProduction = null) {
    // Construir query params a partir dos filtros
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/docs/${queryString}`, {}, useProduction);
  }

  /**
   * Obtém os detalhes de um documento específico
   * @param {string} token - Token do documento
   * @param {boolean} useProduction - Se verdadeiro, usa a API de produção
   * @returns {Promise<Object>} Detalhes do documento
   */
  async getDocumentDetails(token, useProduction = null) {
    return this.request(`/docs/${token}/`, {}, useProduction);
  }

  /**
   * Obtém a lista de modelos disponíveis
   * @param {boolean} useProduction - Se verdadeiro, usa a API de produção
   * @returns {Promise<Array>} Lista de modelos
   */
  async getTemplates(useProduction = null) {
    return this.request('/templates/', {}, useProduction);
  }

  /**
   * Define temporariamente um token de API personalizado
   * @param {string} token - Token personalizado
   */
  setCustomToken(token) {
    this._customToken = token;
  }

  /**
   * Remove o token personalizado e volta a usar o token padrão
   */
  clearCustomToken() {
    this._customToken = null;
  }

  /**
   * Define temporariamente se deve usar o ambiente de produção
   * @param {boolean} useProduction - Se verdadeiro, força o uso da API de produção
   */
  setForceProduction(useProduction) {
    this._forceProduction = useProduction;
  }

  /**
   * Remove a configuração temporária de ambiente
   */
  clearForceProduction() {
    this._forceProduction = null;
  }

  /**
   * Método para teste de conexão com a API
   * @param {string} customToken - Token personalizado opcional
   * @param {boolean} useProduction - Se verdadeiro, usa a API de produção
   * @returns {Promise<Object>} Resultado do teste
   */
  async testConnection(customToken = null, useProduction = null) {
    const originalToken = this._customToken;
    const originalProduction = this._forceProduction;
    
    try {
      if (customToken) {
        this.setCustomToken(customToken);
      }
      
      if (useProduction !== null) {
        this.setForceProduction(useProduction);
      }
      
      if (!this.isConfigured(useProduction)) {
        throw new Error('API ZapSign não está configurada. Verifique o token de API.');
      }
      
      // Tenta obter a lista de documentos como teste (endpoint mais simples)
      const result = await this.request('/docs/?limit=1', {}, useProduction);
      return {
        success: true,
        message: 'Conexão com a API ZapSign estabelecida com sucesso',
        data: result
      };
    } catch (error) {
      console.error('Erro detalhado:', {
        message: error.message,
        status: error.status,
        data: error.data,
        stack: error.stack
      });
      
      return {
        success: false,
        message: 'Falha ao conectar com a API ZapSign',
        error: {
          message: error.message,
          status: error.status,
          data: error.data
        }
      };
    } finally {
      // Restaurar o token original se havia um
      if (customToken) {
        if (originalToken) {
          this.setCustomToken(originalToken);
        } else {
          this.clearCustomToken();
        }
      }
      
      // Restaurar configuração de ambiente
      if (useProduction !== null) {
        if (originalProduction !== null) {
          this.setForceProduction(originalProduction);
        } else {
          this.clearForceProduction();
        }
      }
    }
  }

  /**
   * Obtém informações do plano da conta
   * @param {boolean} useProduction - Se verdadeiro, usa a API de produção
   * @returns {Promise<Object>} Informações do plano
   */
  async getPlanInfo(useProduction = null) {
    return this.request('/accounts/plan-info/', {}, useProduction);
  }
}

// Singleton
const instance = new ZapSignService();
export default instance; 