const express = require('express');
const router = express.Router();
const axios = require('axios');

// Suas credenciais do PagSeguro
const PAGSEGURO_TOKEN = process.env.PAGSEGURO_TOKEN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// URL base da API do PagSeguro (v4.1)
const API_URL = IS_PRODUCTION
  ? 'https://api.pagseguro.com'
  : 'https://sandbox.api.pagseguro.com';

// Rota para criar uma ordem de pagamento
router.post('/create-order', async (req, res) => {
  try {
    const { amount, payer, items } = req.body;

    if (!amount || !payer || !items) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // 1. Primeiro criamos o pedido
    const orderPayload = {
      reference_id: `ORDER_${Date.now()}`,
      customer: {
        name: payer.name,
        email: payer.email,
        tax_id: payer.tax_id
      },
      items: [{
        reference_id: `ITEM_${Date.now()}`,
        name: items[0].name,
        quantity: 1,
        unit_amount: Math.round(amount * 100) // Valor em centavos
      }],
      notification_urls: [
        IS_PRODUCTION 
          ? 'https://dancing-webapp.com.br/api/pagseguro/webhook'
          : 'http://localhost:3001/api/pagseguro/webhook'
      ]
    };

    console.log('Criando pedido:', orderPayload);

    // Cria o pedido
    const orderResponse = await axios.post(
      `${API_URL}/orders`,
      orderPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAGSEGURO_TOKEN}`,
          'x-idempotency-key': `ORDER_${Date.now()}`
        }
      }
    );

    console.log('Pedido criado:', orderResponse.data);

    // 2. Depois criamos a cobrança para este pedido
    const chargePayload = {
      reference_id: `CHARGE_${Date.now()}`,
      description: 'Pagamento Dancing Patinação',
      amount: {
        value: Math.round(amount * 100), // Valor em centavos
        currency: 'BRL'
      },
      payment_method: {
        type: 'CREDIT_CARD',
        installments: 1,
        capture: true,
        card: {
          security_code: "123",
          holder: {
            name: payer.name
          },
          store: false
        },
        soft_descriptor: 'Dancing'
      }
    };

    console.log('Criando cobrança:', chargePayload);

    // Cria a cobrança
    const chargeResponse = await axios.post(
      `${API_URL}/orders/${orderResponse.data.id}/charges`,
      chargePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAGSEGURO_TOKEN}`,
          'x-idempotency-key': `CHARGE_${Date.now()}`
        }
      }
    );

    console.log('Cobrança criada:', chargeResponse.data);

    // Retorna a URL de pagamento
    if (!chargeResponse.data.payment_method?.payment_url) {
      throw new Error('URL de pagamento não encontrada na resposta');
    }

    res.json({
      payment_url: chargeResponse.data.payment_method.payment_url,
      order_id: orderResponse.data.id
    });

  } catch (error) {
    console.error('Erro ao criar ordem:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao criar ordem de pagamento',
      details: error.response?.data || error.message
    });
  }
});

// Rota para receber notificações (webhook)
router.post('/webhook', async (req, res) => {
  try {
    const { notificationCode, notificationType } = req.body;
    console.log('Notificação recebida:', { notificationCode, notificationType });

    // Consulta os detalhes da transação
    const response = await axios.get(
      `${API_URL}/orders/${notificationCode}`,
      {
        headers: {
          'Authorization': `Bearer ${PAGSEGURO_TOKEN}`
        }
      }
    );

    const order = response.data;
    console.log('Detalhes do pedido:', order);

    // Mapeia os status do PagBank
    const statusMap = {
      'AUTHORIZED': 'Autorizado',
      'PAID': 'Pago',
      'DECLINED': 'Recusado',
      'CANCELED': 'Cancelado',
      'PENDING': 'Pendente'
    };

    const status = statusMap[order.status] || 'Status desconhecido';
    console.log(`Status do pedido ${order.id}: ${status}`);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro ao processar notificação:', error);
    res.status(500).json({ 
      error: 'Erro ao processar notificação',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router; 