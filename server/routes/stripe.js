const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

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

// Função para salvar o agendamento no Firebase
const saveAgendamento = async (sessionId, paymentIntent) => {
  try {
    // Recuperar a sessão do Stripe para obter os metadados
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['metadata', 'customer_details']
    });

    // Recuperar os horários selecionados do metadata
    const horariosSelecionados = JSON.parse(session.metadata.horarios || '[]');

    // Criar o documento principal do agendamento
    const agendamentoRef = await db.collection('agendamentos').add({
      nomeAluno: session.metadata.customer_name,
      email: session.customer_details.email,
      telefone: session.metadata.customer_phone,
      cpf: session.metadata.customer_tax_id,
      observacoes: session.metadata.observacoes || '',
      status: 'confirmado',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentIntentId: paymentIntent.id,
      stripeSessionId: sessionId,
      valorTotal: session.amount_total / 100 // Converter de centavos para reais
    });

    // Adicionar os horários como subcoleção
    const batch = db.batch();
    horariosSelecionados.forEach(horario => {
      const horarioRef = agendamentoRef.collection('horarios').doc();
      batch.set(horarioRef, {
        data: horario.date,
        horario: horario.horario,
        professorId: horario.professorId,
        professorNome: horario.professorNome,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    console.log('Agendamento salvo com sucesso:', agendamentoRef.id);
    return agendamentoRef.id;
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error);
    throw error;
  }
};

// Rota para criar uma sessão de checkout
router.post('/create-session', express.json(), async (req, res) => {
  try {
    const { amount, payer, items, horarios } = req.body;

    if (!amount || !payer || !items || !horarios) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    console.log('Criando sessão com os dados:', {
      amount,
      payer: { ...payer, tax_id: '***' }, // Log seguro do CPF
      items,
      horarios
    });

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          unit_amount: Math.round(amount * 100), // Converter para centavos
          product_data: {
            name: `${items[0].name || 'Aulas de Patinação'}`,
            description: `Pagamento para ${payer.name}`
          }
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: CANCEL_URL,
      customer_email: payer.email,
      metadata: {
        customer_name: payer.name,
        customer_tax_id: payer.tax_id,
        customer_phone: payer.phone,
        observacoes: payer.observacoes || '',
        horarios: JSON.stringify(horarios)
      }
    });

    console.log('Sessão criada com sucesso:', {
      sessionId: session.id,
      url: session.url
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    return res.status(500).json({
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
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session);
        
        // Buscar o payment intent associado
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        
        // Salvar o agendamento no Firebase
        await saveAgendamento(session.id, paymentIntent);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('PaymentIntent bem-sucedido:', paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object;
        console.log('Pagamento falhou:', failedPayment);
        break;
      }

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

module.exports = router; 