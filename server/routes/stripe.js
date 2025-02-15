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
  ? 'https://dancing-webapp.com.br/agendar?success=true'
  : 'http://localhost:3000/agendar?success=true';
const CANCEL_URL = IS_PRODUCTION
  ? 'https://dancing-webapp.com.br/agendar'
  : 'http://localhost:3000/agendar';

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
        .doc(`${horario.data}_${horario.horario}`);
      
      const scheduleDoc = await scheduleRef.get();
      if (scheduleDoc.exists && scheduleDoc.data().status === 'confirmado') {
        unavailableSlots.push(`${horario.data} ${horario.horario}`);
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
      const horarioRef = db.collection('horarios').doc();
      batch.set(horarioRef, {
        data: horario.data,
        horario: horario.horario,
        professorId: horario.professorId,
        professorNome: horario.professorNome,
        nomeAluno: session.metadata.customer_name,
        observacoes: session.metadata.observacoes || '',
        status: 'confirmado',
        telefone: session.metadata.customer_phone
      });

      // Bloquear o slot no calendário do professor
      const teacherSlotRef = db.collection('teacherSchedules')
        .doc(horario.professorId)
        .collection('slots')
        .doc(`${horario.data}_${horario.horario}`);

      batch.set(teacherSlotRef, {
        status: 'confirmado',
        agendamentoId: agendamentoRef.id,
        nomeAluno: session.metadata.customer_name,
        email: session.customer_details?.email,
        telefone: session.metadata.customer_phone,
        bookedAt: new Date(),
        data: horario.data,
        horario: horario.horario,
        professorId: horario.professorId,
        professorNome: horario.professorNome
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
      observacoes,
      horarios  // Array of { data, horario, professorId, professorNome }
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
        .doc(`${horario.data}_${horario.horario}`)
        .get();

      if (scheduleRef.exists && scheduleRef.data().status === 'confirmado') {
        unavailableSlots.push(`${horario.data} ${horario.horario}`);
      }
    }

    if (unavailableSlots.length > 0) {
      return res.status(400).json({ 
        error: 'Horários indisponíveis',
        unavailableSlots 
      });
    }

    // Create a unique session ID for tracking
    const sessionUniqueId = Math.random().toString(36).substring(2, 15);

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
      success_url: `${SUCCESS_URL}&session_id=${sessionUniqueId}`,
      cancel_url: CANCEL_URL,
      metadata: {
        customer_name,
        customer_phone,
        observacoes,
        horarios: JSON.stringify(horarios),
        sessionUniqueId
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

// Rota para buscar detalhes do agendamento após o pagamento
router.get('/appointment-details/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Buscar o agendamento pelo sessionUniqueId nos metadados
    const agendamentosSnapshot = await db.collection('agendamentos')
      .where('stripeSessionId', '==', sessionId)
      .limit(1)
      .get();

    if (agendamentosSnapshot.empty) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const agendamento = agendamentosSnapshot.docs[0].data();
    
    // Buscar os horários associados
    const horariosSnapshot = await db.collection('horarios')
      .where('nomeAluno', '==', agendamento.nomeAluno)
      .where('status', '==', 'confirmado')
      .get();

    const horarios = horariosSnapshot.docs.map(doc => doc.data());

    return res.json({
      success: true,
      agendamento: {
        ...agendamento,
        horarios
      }
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do agendamento:', error);
    return res.status(500).json({ error: 'Erro ao buscar detalhes do agendamento' });
  }
});

// Rota para criar ou recuperar um cliente Stripe
router.post('/create-customer', async (req, res) => {
  try {
    const { userId, email, name, phone } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'UserId e email são obrigatórios'
      });
    }

    // Verificar se o usuário já tem um documento no Firebase
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    // Se já existe um customer_id, retorna o customer existente
    if (userDoc.exists && userDoc.data().stripeCustomerId) {
      const customer = await stripe.customers.retrieve(userDoc.data().stripeCustomerId);
      return res.json({
        status: 'success',
        message: 'Cliente Stripe já existe',
        customerId: customer.id
      });
    }

    // Se não existe, cria um novo customer no Stripe
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        firebaseUserId: userId
      }
    });

    // Atualiza ou cria o documento do usuário no Firebase
    if (userDoc.exists) {
      await userRef.update({
        stripeCustomerId: customer.id,
        updatedAt: new Date()
      });
    } else {
      await userRef.set({
        email,
        name: name || '',
        phone: phone || '',
        stripeCustomerId: customer.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return res.json({
      status: 'success',
      message: 'Cliente Stripe criado com sucesso',
      customerId: customer.id
    });

  } catch (error) {
    console.error('Erro ao criar cliente Stripe:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao criar cliente Stripe',
      error: error.message
    });
  }
});

// Rota para buscar um cliente Stripe
router.get('/customer/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Buscar o documento do usuário no Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists || !userDoc.data().stripeCustomerId) {
      return res.json({
        status: 'success',
        customer: null
      });
    }

    // Buscar o cliente no Stripe
    const customer = await stripe.customers.retrieve(userDoc.data().stripeCustomerId);
    
    return res.json({
      status: 'success',
      customer
    });

  } catch (error) {
    console.error('Erro ao buscar cliente Stripe:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar cliente Stripe',
      error: error.message
    });
  }
});

// Rota para criar uma sessão de setup de pagamento
router.post('/create-setup-session', async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({
        status: 'error',
        message: 'ID do cliente é obrigatório'
      });
    }

    const session = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session' // Permite uso futuro do cartão
    });

    return res.json({
      status: 'success',
      clientSecret: session.client_secret
    });

  } catch (error) {
    console.error('Erro ao criar sessão de setup:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao criar sessão de setup',
      error: error.message
    });
  }
});

// Rota para processar um pagamento
router.post('/create-payment', async (req, res) => {
  try {
    const { customerId, amount, description } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({
        status: 'error',
        message: 'ID do cliente e valor são obrigatórios'
      });
    }

    // Criar o pagamento
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Converter para centavos
      currency: 'brl',
      customer: customerId,
      description,
      payment_method_types: ['card'],
      off_session: true,
      confirm: true
    });

    return res.json({
      status: 'success',
      paymentIntent
    });

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao processar pagamento',
      error: error.message
    });
  }
});

module.exports = router; 