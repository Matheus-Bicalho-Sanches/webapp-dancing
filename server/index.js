require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Configuração para aceitar JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas do PagSeguro - Mapeando tanto /api/pagseguro quanto /pagseguro
app.use('/api/pagseguro', pagseguroRoutes);
app.use('/pagseguro', pagseguroRoutes);

// Rotas do Stripe - Mapeando tanto /api/stripe quanto /stripe
app.use('/api/stripe', stripeRoutes);
app.use('/stripe', stripeRoutes);

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

// Inicia o servidor se não estiver em produção
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

// Exporta o app para o Vercel
module.exports = app; 