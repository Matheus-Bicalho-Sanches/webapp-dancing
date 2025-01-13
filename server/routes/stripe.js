const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Verifica se a chave do Stripe está definida
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY não está definida!');
  throw new Error('STRIPE_SECRET_KEY não está definida!');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Rota de teste para verificar a configuração do Stripe
router.get('/test-config', async (req, res) => {
  try {
    // Tenta buscar as configurações da conta
    const account = await stripe.accounts.retrieve();
    console.log('Configuração do Stripe OK:', {
      accountId: account.id,
      country: account.country,
      defaultCurrency: account.default_currency,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Configurado' : 'Não configurado'
    });
    
    // Testa a conexão com o Firestore
    try {
      await db.collection('test').doc('test').set({ test: true });
      await db.collection('test').doc('test').delete();
      console.log('Conexão com o Firestore OK');
    } catch (dbError) {
      console.error('Erro ao testar conexão com Firestore:', dbError);
      throw new Error('Erro na conexão com o Firestore: ' + dbError.message);
    }
    
    return res.json({
      status: 'success',
      message: 'Configuração do Stripe está correta',
      accountDetails: {
        accountId: account.id,
        country: account.country,
        defaultCurrency: account.default_currency,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Configurado' : 'Não configurado'
      }
    });
  } catch (error) {
    console.error('Erro na configuração:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro na configuração',
      error: error.message
    });
  }
});

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SUCCESS_URL = IS_PRODUCTION
  ? 'https://dancing-webapp.com.br/admin/stripe/success'
  : 'http://localhost:3000/admin/stripe/success';
const CANCEL_URL = IS_PRODUCTION
  ? 'https://dancing-webapp.com.br/admin/stripe/cancel'
  : 'http://localhost:3000/admin/stripe/cancel';

// Middleware para processar o corpo da requisição como raw para o webhook
const rawBodyMiddleware = express.raw({ type: 'application/json' });

// Função para salvar o agendamento no Firebase
const saveAgendamento = async (sessionId, paymentIntent) => {
  try {
    // Recuperar a sessão do Stripe para obter os metadados
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['metadata', 'customer_details']
    });

    console.log('Dados da sessão recuperados:', {
      sessionId,
      paymentIntentId: paymentIntent.id,
      customerEmail: session.customer_details?.email
    });

    // Recuperar os horários selecionados do metadata
    const horariosSelecionados = JSON.parse(session.metadata.horarios || '[]');

    // Verificar se os horários ainda estão disponíveis
    const batch = db.batch();
    const unavailableSlots = [];

    // Verificar disponibilidade de cada horário
    for (const horario of horariosSelecionados) {
      const scheduleRef = db.collection('teacherSchedules')
        .doc(horario.professorId)
        .collection('slots')
        .doc(`${horario.date}_${horario.horario}`);
      
      const scheduleDoc = await scheduleRef.get();
      if (scheduleDoc.exists && scheduleDoc.data().isBooked) {
        unavailableSlots.push(`${horario.date} ${horario.horario}`);
      }
    }

    // Se algum horário estiver indisponível, lançar erro
    if (unavailableSlots.length > 0) {
      throw new Error(`Os seguintes horários não estão mais disponíveis: ${unavailableSlots.join(', ')}`);
    }

    // Criar o documento principal do agendamento
    const agendamentoRef = await db.collection('agendamentos').add({
      nomeAluno: session.metadata.customer_name,
      email: session.customer_details?.email,
      telefone: session.metadata.customer_phone,
      cpf: session.metadata.customer_tax_id,
      observacoes: session.metadata.observacoes || '',
      status: 'confirmado',
      createdAt: new Date(),
      updatedAt: new Date(),
      paymentIntentId: paymentIntent.id,
      stripeSessionId: sessionId,
      valorTotal: session.amount_total / 100 // Converter de centavos para reais
    });

    console.log('Documento principal do agendamento criado:', agendamentoRef.id);

    // Adicionar os horários como subcoleção e bloquear os slots dos professores
    horariosSelecionados.forEach(horario => {
      // Adicionar horário na subcoleção do agendamento
      const horarioRef = agendamentoRef.collection('horarios').doc();
      batch.set(horarioRef, {
        data: horario.date,
        horario: horario.horario,
        professorId: horario.professorId,
        professorNome: horario.professorNome,
        createdAt: new Date()
      });

      // Bloquear o slot no calendário do professor
      const teacherSlotRef = db.collection('teacherSchedules')
        .doc(horario.professorId)
        .collection('slots')
        .doc(`${horario.date}_${horario.horario}`);

      batch.set(teacherSlotRef, {
        isBooked: true,
        agendamentoId: agendamentoRef.id,
        studentName: session.metadata.customer_name,
        studentEmail: session.customer_details?.email,
        bookedAt: new Date(),
        date: horario.date,
        time: horario.horario
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
router.post('/create-session', async (req, res) => {
  try {
    const { 
      amount, 
      customer_name,
      customer_phone,
      customer_tax_id,
      observacoes,
      horarios  // Array of { date, horario, professorId, professorNome }
    } = req.body;

    if (!horarios || !Array.isArray(horarios) || horarios.length === 0) {
      return res.status(400).json({ error: 'Horários não fornecidos' });
    }

    // Verificar disponibilidade dos horários antes de criar a sessão
    const unavailableSlots = [];
    for (const horario of horarios) {
      const scheduleRef = await db.collection('teacherSchedules')
        .doc(horario.professorId)
        .collection('slots')
        .doc(`${horario.date}_${horario.horario}`)
        .get();

      if (scheduleRef.exists && scheduleRef.data().isBooked) {
        unavailableSlots.push(`${horario.date} ${horario.horario}`);
      }
    }

    if (unavailableSlots.length > 0) {
      return res.status(400).json({ 
        error: 'Horários indisponíveis',
        unavailableSlots 
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'BRL',
            product_data: {
              name: 'Aula Particular',
              description: `${horarios.length} aula(s) agendada(s)`
            },
            unit_amount: amount * 100 // Convert to centavos
          },
          quantity: 1
        }
      ],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      metadata: {
        customer_name,
        customer_phone,
        customer_tax_id,
        observacoes,
        horarios: JSON.stringify(horarios)
      }
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    return res.status(500).json({ error: 'Não foi possível criar sessão do Stripe' });
  }
});

// Webhook para receber notificações do Stripe
router.post('/webhook', rawBodyMiddleware, async (req, res) => {
  console.log('Webhook recebido:', {
    headers: req.headers,
    body: typeof req.body === 'string' ? 'Raw body (string)' : 'Parsed body'
  });

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não está definida!');
    return res.status(500).send('Webhook Secret não configurado');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Evento do webhook construído com sucesso:', event.type);
  } catch (err) {
    console.error('Erro no webhook:', err.message, {
      signature: sig ? 'Presente' : 'Ausente',
      bodyLength: req.body ? req.body.length : 0
    });
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
        console.log('PaymentIntent recuperado:', paymentIntent.id);
        
        // Salvar o agendamento no Firebase
        await saveAgendamento(session.id, paymentIntent);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('PaymentIntent bem-sucedido:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object;
        console.log('Pagamento falhou:', failedPayment.id);
        break;
      }

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true, type: event.type });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook', details: error.message });
  }
});

module.exports = router; 