const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SUCCESS_URL = IS_PRODUCTION
  ? 'https://dancing-webapp.com.br/admin/stripe/success'
  : 'http://localhost:3001/admin/stripe/success';
const CANCEL_URL = IS_PRODUCTION
  ? 'https://dancing-webapp.com.br/admin/stripe/cancel'
  : 'http://localhost:3001/admin/stripe/cancel';

// Rota para criar uma sessão de checkout
router.post('/create-session', async (req, res) => {
  try {
    const { amount, payer, items } = req.body;

    if (!amount || !payer || !items) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: items[0].name,
            description: `Pagamento para ${payer.name}`,
          },
          unit_amount: Math.round(amount * 100), // Valor em centavos
        },
        quantity: 1,
      }],
      customer_email: payer.email,
      client_reference_id: `ORDER_${Date.now()}`,
      mode: 'payment',
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      metadata: {
        customer_name: payer.name,
        customer_tax_id: payer.tax_id,
      },
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
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

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