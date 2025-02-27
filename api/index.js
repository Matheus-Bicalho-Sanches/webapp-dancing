import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

// Configuração do CORS
const allowedOrigins = [
  'https://dancing-webapp.com.br',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelo CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'access_token', 'User-Agent'],
  credentials: true
}));

// Configuração para aceitar JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

// Configuração da API do Asaas
const asaasBaseUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
const asaasApiKey = process.env.ASAAS_API_KEY;

// Verificação das variáveis de ambiente
console.log('🔍 Verificando variáveis de ambiente:');
console.log(`- ASAAS_API_URL: ${process.env.ASAAS_API_URL || 'não definida, usando padrão'}`);
console.log(`- ASAAS_API_KEY: ${process.env.ASAAS_API_KEY ? `${process.env.ASAAS_API_KEY.substring(0, 10)}...` : 'não definida ⚠️'}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
console.log(`- asaasBaseUrl: ${asaasBaseUrl}`);
console.log(`- asaasApiKey configurada: ${!!asaasApiKey}`);

if (!asaasApiKey) {
  console.error('⚠️ ATENÇÃO: ASAAS_API_KEY não está configurada. As requisições para o Asaas falharão.');
}

// Middleware para validar token do Asaas
const validateAsaasToken = (req, res, next) => {
  const token = req.headers['access_token'];
  
  if (!token && !asaasApiKey) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }
  
  // Use o token do header ou o da env se não houver token no header
  req.asaasToken = token || asaasApiKey;
  next();
};

// Rotas da API do Asaas
app.use('/api/asaas', validateAsaasToken);

// Função helper para requisições ao Asaas
const asaasRequest = async (method, endpoint, data = null, token) => {
  console.log(`🚀 Enviando requisição para Asaas: ${method.toUpperCase()} ${endpoint}`);
  console.log(`🔑 Token: ${token ? token.substring(0, 10) + '...' : 'undefined'}`);
  
  if (!token) {
    console.error('⚠️ Token não fornecido para requisição ao Asaas');
    throw new Error('Token de autenticação não fornecido');
  }
  
  const config = {
    method,
    url: `${asaasBaseUrl}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'access_token': token,
      'User-Agent': 'webapp-dancing'
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    console.log('📝 Configuração da requisição:', {
      method: config.method,
      url: config.url,
      baseURL: asaasBaseUrl,
      data: config.data ? JSON.stringify(config.data).substring(0, 500) + (JSON.stringify(config.data).length > 500 ? '...' : '') : null,
      headers: { 
        ...config.headers, 
        'access_token': token ? `${token.substring(0, 10)}...` : 'undefined'
      }
    });
    
    const response = await axios(config);
    
    console.log('✅ Resposta do Asaas:', {
      status: response.status,
      data: response.data
    });
    
    return response;
  } catch (error) {
    console.error('❌ Erro do Asaas:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      headers: error.config?.headers ? {
        ...error.config.headers,
        'access_token': token ? `${token.substring(0, 10)}...` : 'undefined'
      } : 'No headers available',
      stack: error.stack
    });
    throw error;
  }
};

// Rota para criar clientes
app.post('/api/asaas/customers', async (req, res) => {
  try {
    console.log('Recebendo requisição para criar cliente:');
    console.log('- Headers:', { 
      ...req.headers, 
      'access_token': req.headers['access_token'] ? `${req.headers['access_token'].substring(0, 10)}...` : 'não definido' 
    });
    console.log('- Body:', req.body);
    console.log('- asaasToken:', req.asaasToken ? `${req.asaasToken.substring(0, 10)}...` : 'não definido');
    
    const response = await asaasRequest('post', '/customers', req.body, req.asaasToken);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Erro detalhado ao criar cliente:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Erro interno ao processar a requisição', message: error.message });
    }
  }
});

// Rota para buscar cliente por ID
app.get('/api/asaas/customers/:id', async (req, res) => {
  try {
    const response = await asaasRequest('get', `/customers/${req.params.id}`, null, req.asaasToken);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro ao buscar cliente no Asaas:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Rota para atualizar cliente
app.post('/api/asaas/customers/:id', async (req, res) => {
  try {
    const response = await asaasRequest('post', `/customers/${req.params.id}`, req.body, req.asaasToken);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro ao atualizar cliente no Asaas:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Rota para tokenizar cartão de crédito
app.post('/api/asaas/creditCard/tokenize', async (req, res) => {
  try {
    console.log('🔄 Recebendo requisição para tokenizar cartão em', process.env.NODE_ENV);
    console.log('📌 URL da requisição:', req.originalUrl);
    console.log('📋 Headers:', { 
      ...req.headers, 
      'access_token': req.headers['access_token'] ? `${req.headers['access_token'].substring(0, 10)}...` : 'não definido' 
    });
    console.log('📦 Body:', {
      ...req.body,
      creditCard: req.body.creditCard ? {
        ...req.body.creditCard,
        number: req.body.creditCard.number ? '****' : undefined,
        ccv: req.body.creditCard.ccv ? '***' : undefined
      } : undefined
    });
    
    const response = await asaasRequest('post', '/creditCard/tokenize', req.body, req.asaasToken);
    console.log('✅ Tokenização bem-sucedida:', {
      token: response.data?.creditCardToken ? `${response.data.creditCardToken.substring(0, 10)}...` : 'não retornado'
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('❌ Erro detalhado ao tokenizar cartão:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Erro interno ao processar a requisição', message: error.message });
    }
  }
});

// Rota para criar assinaturas
app.post('/api/asaas/subscriptions', async (req, res) => {
  try {
    console.log('Recebendo requisição para criar assinatura:', {
      body: req.body,
      token: '****'
    });
    
    const response = await asaasRequest('post', '/subscriptions', req.body, req.asaasToken);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Erro ao criar assinatura:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Erro interno ao processar a requisição', message: error.message });
    }
  }
});

// Rota para buscar assinaturas de um cliente
app.get('/api/asaas/subscriptions', async (req, res) => {
  try {
    const response = await asaasRequest('get', '/subscriptions', null, req.asaasToken);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Erro interno ao processar a requisição', message: error.message });
    }
  }
});

// Rota para cancelar assinatura
app.delete('/api/asaas/subscriptions/:id', async (req, res) => {
  try {
    const response = await asaasRequest('delete', `/subscriptions/${req.params.id}`, req.body, req.asaasToken);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Erro interno ao processar a requisição', message: error.message });
    }
  }
});

// Rota para criar pagamento
app.post('/api/asaas/payments', async (req, res) => {
  try {
    console.log('Recebendo requisição para criar pagamento:', {
      body: req.body,
      token: '****'
    });
    
    const response = await asaasRequest('post', '/payments', req.body, req.asaasToken);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Erro ao criar pagamento:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Erro interno ao processar a requisição', message: error.message });
    }
  }
});

// Rota para buscar pagamento
app.get('/api/asaas/payments/:id', async (req, res) => {
  try {
    const response = await asaasRequest('get', `/payments/${req.params.id}`, null, req.asaasToken);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Erro ao buscar pagamento:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Erro interno ao processar a requisição', message: error.message });
    }
  }
});

// Rota de teste para tokenização
app.get('/api/asaas/creditCard/test', (req, res) => {
  try {
    console.log('Teste de rota de tokenização acessado');
    res.json({ 
      message: 'Rota de teste para tokenização de cartão funcionando!',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      asaasConfig: {
        apiUrl: asaasBaseUrl,
        apiKeyConfigured: !!asaasApiKey,
        environment: asaasBaseUrl.includes('sandbox') ? 'sandbox' : 'production'
      }
    });
  } catch (error) {
    console.error('Erro na rota de teste:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de teste para Asaas
app.get('/api/asaas/test', (req, res) => {
  try {
    res.json({ 
      message: 'API Asaas configurada!',
      config: {
        asaasBaseUrl,
        apiKeyConfigured: !!asaasApiKey,
        tokenFromRequest: !!req.asaasToken,
        environment: asaasBaseUrl.includes('sandbox') ? 'sandbox' : 'production'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inicializa o servidor apenas em ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log('Variáveis de ambiente carregadas:');
    console.log(`- ASAAS_API_URL: ${process.env.ASAAS_API_URL}`);
    console.log(`- ASAAS_API_KEY: ${process.env.ASAAS_API_KEY ? `${process.env.ASAAS_API_KEY.substring(0, 10)}...` : 'não definida'}`);
    console.log(`- asaasBaseUrl: ${asaasBaseUrl}`);
    console.log(`- asaasApiKey: ${asaasApiKey ? `${asaasApiKey.substring(0, 10)}...` : 'não definida'}`);
  });
}

// Exporta o handler para o Vercel
export default app; 