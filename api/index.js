require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const axios = require('axios');

const app = express();

// Configuração do CORS
const allowedOrigins = [
  'https://dancing-webapp.com.br',
  'https://www.mercadopago.com.br',
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
  allowedHeaders: ['Content-Type', 'Authorization', 'access_token'],
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
const asaasBaseUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const asaasApiKey = process.env.ASAAS_API_KEY;

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

// Rota para criar clientes
app.post('/api/asaas/customers', async (req, res) => {
  try {
    const response = await axios.post(`${asaasBaseUrl}/customers`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'access_token': req.asaasToken
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro ao criar cliente no Asaas:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Rota para buscar cliente por ID
app.get('/api/asaas/customers/:id', async (req, res) => {
  try {
    const response = await axios.get(`${asaasBaseUrl}/customers/${req.params.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'access_token': req.asaasToken
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro ao buscar cliente no Asaas:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Rota para atualizar cliente
app.post('/api/asaas/customers/:id', async (req, res) => {
  try {
    const response = await axios.post(`${asaasBaseUrl}/customers/${req.params.id}`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'access_token': req.asaasToken
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro ao atualizar cliente no Asaas:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Exporta o handler para o Vercel
module.exports = app; 