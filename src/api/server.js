import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference } from 'mercadopago';

dotenv.config();

const app = express();
const port = process.env.PORT || 5173;

// Configuração do CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Verificar se o token do Mercado Pago está configurado
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.error('ERRO: MERCADOPAGO_ACCESS_TOKEN não está configurado!');
  process.exit(1);
}

// Configurar o Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

// Rota de teste básica
app.get('/api/test', (req, res) => {
  res.json({ message: 'API está funcionando!' });
});

// Rota para criar preferência de pagamento
app.post('/api/mercadopago/create-preference', async (req, res) => {
  try {
    console.log('Recebendo requisição:', req.body);
    
    const { items, payer } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items inválidos',
        details: 'O array de items é obrigatório e não pode estar vazio'
      });
    }

    // Criar a preferência
    const preference = {
      items,
      payer,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/success`,
        failure: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/failure`,
        pending: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/mercadopago/webhook`
    };

    console.log('Criando preferência:', preference);

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    
    console.log('Preferência criada:', response);

    return res.status(200).json({
      success: true,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point
    });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    return res.status(500).json({
      error: 'Erro ao criar preferência de pagamento',
      details: error.message
    });
  }
});

// Rotas de retorno do Mercado Pago
app.get('/success', (req, res) => {
  console.log('Pagamento bem-sucedido:', req.query);
  res.redirect('/#/payment-success');
});

app.get('/failure', (req, res) => {
  console.log('Pagamento falhou:', req.query);
  res.redirect('/#/payment-failure');
});

app.get('/pending', (req, res) => {
  console.log('Pagamento pendente:', req.query);
  res.redirect('/#/payment-pending');
});

// Webhook do Mercado Pago
app.post('/api/mercadopago/webhook', async (req, res) => {
  try {
    console.log('Webhook recebido:', req.body);
    
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      console.log('ID do pagamento:', paymentId);
      
      // Aqui você pode adicionar a lógica para atualizar o status do pagamento no seu banco de dados
      // Por exemplo, atualizar o status da matrícula do aluno
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: err.message
  });
});

// Iniciar o servidor
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
}).on('error', (err) => {
  console.error('Erro ao iniciar o servidor:', err);
  process.exit(1);
}); 