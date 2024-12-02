import fetch from 'node-fetch';

// Handler para a função serverless
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Recebendo requisição de checkout:', req.body);
    const { agendamento, paymentMethod, cardData } = req.body;
    
    if (!agendamento || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'agendamento e paymentMethod são obrigatórios'
      });
    }
    
    // URL base baseada no ambiente
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';

    console.log('Ambiente PagBank:', process.env.PAGBANK_ENV);
    console.log('URL Base:', baseUrl);
    
    // 1. Criar o pedido
    const order = {
      reference_id: `AULA_${Date.now()}`,
      customer: {
        name: agendamento.nomeAluno,
        email: agendamento.email,
        tax_id: "12345678909"
      },
      items: [
        {
          name: "Aula Individual de Patinação",
          quantity: 1,
          unit_amount: agendamento.valor * 100
        }
      ]
    };

    // Gerar chave de idempotência para criação do pedido
    const orderIdempotencyKey = `order-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Criar o pedido
    const orderResponse = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': orderIdempotencyKey
      },
      body: JSON.stringify(order)
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(JSON.stringify(orderData.error_messages || orderData));
    }

    // 2. Processar o pagamento
    if (paymentMethod === 'credit_card' && cardData) {
      // Gerar chave de idempotência para o pagamento
      const paymentIdempotencyKey = `payment-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const paymentResponse = await fetch(`${baseUrl}/charges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
          'Content-Type': 'application/json',
          'x-idempotency-key': paymentIdempotencyKey
        },
        body: JSON.stringify({
          reference_id: orderData.id,
          description: "Aula Individual de Patinação",
          amount: {
            value: agendamento.valor * 100,
            currency: "BRL"
          },
          payment_method: {
            type: "CREDIT_CARD",
            installments: 1,
            card: {
              encrypted: cardData.encryptedCard
            }
          }
        })
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(JSON.stringify(paymentData.error_messages || paymentData));
      }

      return res.status(200).json({
        success: true,
        order_id: orderData.id,
        payment_id: paymentData.id,
        status: paymentData.status
      });

    } else if (paymentMethod === 'pix') {
      // Para PIX, gerar QR Code
      const qrCodeResponse = await fetch(`${baseUrl}/orders/${orderData.id}/qr_codes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: {
            value: agendamento.valor * 100
          }
        })
      });

      const qrCodeData = await qrCodeResponse.json();

      if (!qrCodeResponse.ok) {
        throw new Error(JSON.stringify(qrCodeData.error_messages || qrCodeData));
      }

      return res.status(200).json({
        success: true,
        order_id: orderData.id,
        qr_code: qrCodeData
      });
    }

  } catch (error) {
    console.error('Checkout error detalhado:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
} 