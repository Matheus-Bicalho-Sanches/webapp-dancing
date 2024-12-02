import fetch from 'node-fetch';

// Handler para a função serverless
export default async function handler(req, res) {
  // Verificar se é um POST
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
      ? 'https://api.pagseguro.com/orders'
      : 'https://sandbox.api.pagseguro.com/orders';

    console.log('Ambiente PagBank:', process.env.PAGBANK_ENV);
    console.log('URL Base:', baseUrl);
    console.log('Token presente:', !!process.env.PAGBANK_TOKEN);
    
    // Configurar o pedido para o PagBank
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

    // Adicionar método de pagamento específico baseado na escolha
    if (paymentMethod === 'credit_card' && cardData) {
      order.charges = [{
        amount: {
          value: agendamento.valor * 100,
          currency: "BRL"
        },
        payment_method: {
          type: "CREDIT_CARD",
          installments: 1,
          card: {
            number: cardData.number,
            exp_month: cardData.expMonth,
            exp_year: cardData.expYear,
            security_code: cardData.securityCode,
            holder: {
              name: cardData.holderName
            }
          }
        }
      }];
    } else {
      // Pagamento PIX
      order.qr_codes = [
        {
          amount: {
            value: agendamento.valor * 100
          }
        }
      ];
    }

    console.log('Dados do pedido:', JSON.stringify(order, null, 2));

    // Gerar chave de idempotência
    const idempotencyKey = `order-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Fazer a requisição para o PagBank
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify(order)
    });

    // Log da resposta bruta para debug
    const responseText = await response.text();
    console.log('Resposta bruta do PagBank:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao fazer parse da resposta:', e);
      return res.status(500).json({
        error: 'Erro ao processar resposta do PagBank',
        details: responseText
      });
    }

    console.log('Resposta do PagBank (parsed):', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(JSON.stringify(data.error_messages || data));
    }

    return res.status(200).json({
      success: true,
      order_id: data.id,
      qr_code: data.qr_codes?.[0],
      payment_response: data,
      links: data.links
    });

  } catch (error) {
    console.error('Checkout error detalhado:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
} 