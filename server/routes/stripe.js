const express = require('express');
const router = express.Router();

// Verifica se a chave do Stripe está definida
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY não está definida!');
  throw new Error('STRIPE_SECRET_KEY não está definida!');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SUCCESS_URL = IS_PRODUCTION
  ? 'https://dancing-webapp.com.br/admin/stripe/success'
  : 'http://localhost:3001/admin/stripe/success';
const CANCEL_URL = IS_PRODUCTION
  ? 'https://dancing-webapp.com.br/admin/stripe/cancel'
  : 'http://localhost:3001/admin/stripe/cancel';

// Middleware para processar o corpo da requisição como raw para o webhook
const rawBodyMiddleware = express.raw({ type: 'application/json' });

// Rota para criar uma sessão de checkout
router.post('/create-session', express.json(), async (req, res) => {
  try {
    const { amount, payer, items } = req.body;

    if (!amount || !payer || !items) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    console.log('Criando sessão com os dados:', {
      amount,
      payer: { ...payer, tax_id: '***' }, // Log seguro do CPF
      items
    });

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: Math.round(amount * 100), // Valor em centavos
            product_data: {
              name: items[0].name || 'Pagamento Dancing Patinação',
              description: `Pagamento para ${payer.name}`,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: CANCEL_URL,
      customer_email: payer.email,
      metadata: {
        customer_name: payer.name,
        customer_tax_id: payer.tax_id,
      },
      payment_intent_data: {
        metadata: {
          customer_name: payer.name,
          customer_tax_id: payer.tax_id,
        },
      },
    });

    console.log('Sessão criada com sucesso:', {
      sessionId: session.id,
      url: session.url
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({
      error: 'Erro ao criar sessão de pagamento',
      details: error.message
    });
  }
});

// Webhook para receber notificações do Stripe
router.post('/webhook', rawBodyMiddleware, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não está definida!');
    return res.status(500).send('Webhook Secret não configurado');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Erro no webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processa o evento
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Pagamento bem-sucedido:', session);
      // TODO: Atualizar o status do pagamento no banco de dados
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent bem-sucedido:', paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Pagamento falhou:', failedPayment);
      break;
    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router; 