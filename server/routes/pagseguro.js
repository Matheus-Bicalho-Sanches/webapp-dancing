const express = require('express');
const router = express.Router();
const axios = require('axios');

// Suas credenciais do PagSeguro (você precisará configurar isso no .env)
const PAGSEGURO_TOKEN = process.env.PAGSEGURO_TOKEN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// URL base da API do PagSeguro
const API_URL = IS_PRODUCTION
  ? 'https://ws.pagseguro.uol.com.br/v2'
  : 'https://ws.sandbox.pagbank.com.br/v2';

// Rota para criar uma ordem de pagamento
router.post('/create-order', async (req, res) => {
  try {
    const { amount, payer, items } = req.body;

    if (!amount || !payer || !items) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Monta o payload para o PagSeguro
    const payload = {
      currency: 'BRL',
      itemId1: '1',
      itemDescription1: items[0].name,
      itemAmount1: amount.toFixed(2),
      itemQuantity1: '1',
      reference: `ORDER_${Date.now()}`,
      senderName: payer.name,
      senderEmail: payer.email,
      senderCPF: payer.tax_id,
      redirectURL: 'http://localhost:3000/admin/pag-seguro',
      shippingAddressRequired: 'false',
      shippingCost: '0.00',
      enableRecover: 'false',
      acceptPaymentMethodGroup: 'CREDIT_CARD,DEBIT_CARD,PIX',
      excludePaymentMethodGroup: 'BOLETO,DEPOSIT,BALANCE'
    };

    // Adiciona notificationURL apenas em produção
    if (IS_PRODUCTION) {
      payload.notificationURL = 'https://dancing-webapp.com.br/api/pagseguro/webhook';
    }

    console.log('Enviando payload:', payload);

    // Faz a requisição para o PagSeguro
    const response = await axios.post(
      `${API_URL}/checkout?email=matheus.bs@up-gestora.com.br&token=${PAGSEGURO_TOKEN}`,
      new URLSearchParams(payload),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Resposta do PagSeguro:', response.data);

    // Extrai o código do checkout da resposta XML
    const checkoutCode = response.data.match(/<code>(.*?)<\/code>/)?.[1];

    if (!checkoutCode) {
      throw new Error('Código de checkout não encontrado na resposta');
    }

    // Retorna a URL de pagamento para o frontend
    const checkoutUrl = IS_PRODUCTION
      ? `https://pagseguro.uol.com.br/v2/checkout/payment.html?code=${checkoutCode}`
      : `https://sandbox.pagbank.com.br/checkout/v2/payment.html?code=${checkoutCode}`;

    res.json({
      payment_url: checkoutUrl,
      order_id: checkoutCode
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

    if (notificationType !== 'transaction') {
      return res.status(200).send('OK');
    }

    // Consulta os detalhes da transação
    const response = await axios.get(
      `${API_URL}/transactions/notifications/${notificationCode}?email=matheus.bs@up-gestora.com.br&token=${PAGSEGURO_TOKEN}`
    );

    const transaction = response.data;
    console.log('Detalhes da transação:', transaction);

    // Mapeia os status do PagSeguro
    const statusMap = {
      '1': 'Aguardando pagamento',
      '2': 'Em análise',
      '3': 'Paga',
      '4': 'Disponível',
      '5': 'Em disputa',
      '6': 'Devolvida',
      '7': 'Cancelada',
      '8': 'Debitado',
      '9': 'Retenção temporária'
    };

    const status = statusMap[transaction.status] || 'Status desconhecido';
    console.log(`Status da transação ${transaction.code}: ${status}`);

    // Aqui você implementaria a lógica para atualizar o status no seu banco de dados
    // Por exemplo:
    // await updateOrderStatus(transaction.reference, status);

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
module.exports = router; 