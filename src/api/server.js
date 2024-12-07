import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference } from 'mercadopago';

dotenv.config();

const app = express();
const port = process.env.PORT || 5173;

// Configuração do CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://dancing-webapp.com.br', process.env.NEXT_PUBLIC_API_URL],
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
    console.log('[Payment] Nova requisição de pagamento recebida');
    console.log('[Payment] Dados da requisição:', JSON.stringify(req.body, null, 2));
    
    const { items, payer } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('[Payment] Erro: Items inválidos');
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
        success: `${process.env.NEXT_PUBLIC_API_URL}/success`,
        failure: `${process.env.NEXT_PUBLIC_API_URL}/failure`,
        pending: `${process.env.NEXT_PUBLIC_API_URL}/pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_API_URL}/api/mercadopago/webhook`,
      statement_descriptor: "Dancing Patinação",
      external_reference: new Date().getTime().toString()
    };

    console.log('[Payment] Criando preferência:', JSON.stringify(preference, null, 2));

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    
    console.log('[Payment] Preferência criada com sucesso');
    console.log('[Payment] Resposta do Mercado Pago:', JSON.stringify(response, null, 2));

    // Retornar a resposta com o formato correto
    return res.status(200).json({
      success: true,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      preferenceId: response.id
    });

  } catch (error) {
    console.error('[Payment] Erro ao criar preferência:', error);
    console.error('[Payment] Stack trace:', error.stack);
    return res.status(500).json({
      error: 'Erro ao criar preferência de pagamento',
      details: error.message
    });
  }
});

// Rotas de retorno do Mercado Pago
app.get('/success', (req, res) => {
  console.log('[Payment] Pagamento bem-sucedido');
  console.log('[Payment] Dados do retorno:', JSON.stringify(req.query, null, 2));
  res.redirect('/#/payment-success');
});

app.get('/failure', (req, res) => {
  console.log('[Payment] Pagamento falhou');
  console.log('[Payment] Dados do retorno:', JSON.stringify(req.query, null, 2));
  res.redirect('/#/payment-failure');
});

app.get('/pending', (req, res) => {
  console.log('[Payment] Pagamento pendente');
  console.log('[Payment] Dados do retorno:', JSON.stringify(req.query, null, 2));
  res.redirect('/#/payment-pending');
});

// Webhook do Mercado Pago
app.post('/api/mercadopago/webhook', async (req, res) => {
  try {
    console.log('[Webhook] Notificação recebida do Mercado Pago');
    console.log('[Webhook] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Webhook] Corpo da requisição:', JSON.stringify(req.body, null, 2));
    
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      console.log('[Webhook] Notificação de pagamento recebida. ID:', paymentId);
      
      // Aqui você pode adicionar a lógica para atualizar o status do pagamento no seu banco de dados
      // Por exemplo, atualizar o status da matrícula do aluno
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook:', error);
    console.error('[Webhook] Stack trace:', error.stack);
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