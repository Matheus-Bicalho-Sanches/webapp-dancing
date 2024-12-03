import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Recebendo requisição de checkout:', req.body);
    const { agendamento } = req.body;
    
    if (!agendamento || !agendamento.nomeAluno || !agendamento.email || !agendamento.valor) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'Nome do aluno, email e valor são obrigatórios',
        received: agendamento
      });
    }
    
    // URL base baseada no ambiente
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';

    console.log('Ambiente PagBank:', process.env.PAGBANK_ENV);
    console.log('Dados do agendamento:', agendamento);
    
    // Configurar o pedido para o PagBank
    const order = {
      reference_id: `AULA_${Date.now()}`,
      customer: {
        name: agendamento.nomeAluno,
        email: agendamento.email,
        tax_id: "12345678909" // CPF do cliente
      },
      items: [
        {
          name: "Aula Individual de Patinação",
          quantity: 1,
          unit_amount: Math.round(agendamento.valor * 100) // Converter para centavos e garantir número inteiro
        }
      ],
      notification_urls: ["https://dancing-webapp.com.br/api/pagbank/webhook"],
      charges: [{
        amount: {
          value: Math.round(agendamento.valor * 100), // Converter para centavos e garantir número inteiro
          currency: "BRL"
        },
        payment_methods: {
          enabled_methods: ["CREDIT_CARD", "PIX"],
          redirect_url: "https://dancing-webapp.com.br/agendar"
        }
      }]
    };

    console.log('Pedido a ser enviado:', order);

    // Gerar chave de idempotência
    const idempotencyKey = `order-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Criar o pedido no PagBank
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify(order)
    });

    const data = await response.json();
    console.log('Resposta do PagBank:', data);

    if (!response.ok) {
      throw new Error(JSON.stringify(data.error_messages || data));
    }

    // Encontrar a URL de pagamento
    const paymentUrl = data.links?.find(link => link.rel === "payment")?.href;
    
    if (!paymentUrl) {
      throw new Error('URL de pagamento não encontrada na resposta');
    }

    return res.status(200).json({
      success: true,
      order_id: data.id,
      payment_url: paymentUrl
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
} 