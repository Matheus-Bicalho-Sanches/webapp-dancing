require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const pagseguroRoutes = require('./routes/pagseguro');

// Definição do ambiente
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
console.log('Variáveis de ambiente:', {
  NODE_ENV: process.env.NODE_ENV,
  IS_PRODUCTION,
  PWD: process.env.PWD,
  __dirname
});

const app = express();

// Configuração do CORS mais permissiva para desenvolvimento
const allowedOrigins = [
  'https://dancing-webapp.com.br',
  'https://www.mercadopago.com.br',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origin (como apps mobile ou curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Bloqueado pelo CORS'), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Configuração para aceitar JSON e aumentar limite
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos do React em produção
if (IS_PRODUCTION) {
  const buildPath = path.join(__dirname, '../build');
  console.log('Servindo arquivos estáticos de:', buildPath);
  console.log('Pasta build existe:', require('fs').existsSync(buildPath));
  app.use(express.static(buildPath));
}

// Configuração do Mercado Pago com token direto
const ACCESS_TOKEN = 'APP_USR-6064176381936791-120321-0e372e38e8a20e3838985ede57497984-659207396';

const client = new MercadoPagoConfig({ 
  accessToken: ACCESS_TOKEN
});

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  next();
});

// Rota para criar preferência de pagamento
app.post('/create_preference', async (req, res) => {
  try {
    const { amount, payer } = req.body;
    
    console.log('Valor recebido:', amount);
    console.log('Dados do pagador:', payer);
    
    if (!amount) {
      throw new Error('Valor não informado');
    }
    
    // Converte o valor para número e garante 2 casas decimais
    const numericAmount = Number(amount).toFixed(2);
    
    console.log('Valor formatado:', numericAmount);
    
    const preference = new Preference(client);
    
    const preferenceData = {
      items: [
        {
          id: 'MENSALIDADE_' + Date.now(),
          title: 'Pagamento Dancing Patinação',
          description: 'Pagamento de mensalidade',
          category_id: 'services',
          unit_price: Number(numericAmount),
          quantity: 1,
          currency_id: 'BRL'
        }
      ],
      payer: {
        first_name: payer?.first_name || '',
        last_name: payer?.last_name || '',
        email: payer?.email || '',
        identification: {
          type: payer?.doc_type || 'CPF',
          number: payer?.doc_number || ''
        }
      },
      back_urls: {
        success: "http://localhost:3000/admin/mercado-livre",
        failure: "http://localhost:3000/admin/mercado-livre",
        pending: "http://localhost:3000/admin/mercado-livre"
      },
      auto_return: "approved",
      payment_methods: {
        installments: 12,
        default_installments: 1,
        excluded_payment_types: [
          { id: "ticket" }
        ]
      },
      statement_descriptor: "DANCING PATINACAO",
      external_reference: "PAGAMENTO_" + Date.now(),
      notification_url: "https://dancing-webapp.com.br/api/webhook"
    };
    
    console.log('Dados da preferência:', JSON.stringify(preferenceData, null, 2));
    
    const result = await preference.create({ body: preferenceData });
    
    console.log('Resposta do Mercado Pago:', result);
    
    res.json(result);
  } catch (error) {
    console.error('Erro detalhado:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro ao criar preferência',
      details: error.message,
      stack: error.stack
    });
  }
});

// Webhook para receber notificações do Mercado Pago
app.post('/api/webhook', async (req, res) => {
  try {
    console.log('Headers do webhook:', req.headers);
    console.log('Corpo do webhook:', req.body);

    const { type, data } = req.body;
    
    console.log('Webhook recebido:', {
      type,
      data
    });

    // Aqui você pode adicionar a lógica para processar diferentes tipos de notificações
    if (type === 'payment') {
      const paymentId = data.id;
      // Buscar informações do pagamento e atualizar seu sistema
      console.log('Pagamento recebido:', paymentId);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ 
      error: 'Erro ao processar webhook',
      details: error.message
    });
  }
});

// Rota OPTIONS para o webhook (necessário para CORS)
app.options('/api/webhook', cors());

// Rota de teste
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando!' });
});

// Suas rotas da API vêm primeiro
app.use('/pagseguro', pagseguroRoutes);

// Em produção, todas as outras rotas não encontradas vão para o index.html do React
if (IS_PRODUCTION) {
  const indexPath = path.join(__dirname, '../build', 'index.html');
  console.log('Arquivo index.html existe:', require('fs').existsSync(indexPath));
  
  app.get('*', (req, res) => {
    console.log('Requisição recebida para:', req.path);
    res.sendFile(indexPath);
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('CORS configurado para:', allowedOrigins);
  console.log('PagSeguro configurado em:', IS_PRODUCTION ? 'Produção' : 'Sandbox');
  console.log('Rotas disponíveis:');
  console.log('- POST /pagseguro/create-order');
  console.log('- POST /pagseguro/webhook');
}); 