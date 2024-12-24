require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pagseguroRoutes = require('./routes/pagseguro');
const stripeRoutes = require('./routes/stripe');

const app = express();

// Configuração do CORS
const allowedOrigins = [
  'https://dancing-webapp.com.br',
  'https://www.mercadopago.com.br',
  'https://checkout.stripe.com',
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
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  credentials: true
}));

// Configuração para aceitar JSON - exceto para o webhook do Stripe
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook' || req.originalUrl === '/stripe/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Rotas da API
app.use('/api/pagseguro', pagseguroRoutes);
app.use('/api/stripe', stripeRoutes);

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

// Rota para todas as outras requisições em produção
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Inicia o servidor se não estiver em produção
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

// Exporta o app para o Vercel
module.exports = app; 