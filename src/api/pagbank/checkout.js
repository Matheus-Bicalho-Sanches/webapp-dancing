import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Recebendo requisição de checkout:', req.body);
    const { agendamento } = req.body;
    
    // Validar dados essenciais
    if (!agendamento?.nomeAluno || !agendamento?.email || typeof agendamento?.valor !== 'number') {
      console.error('Dados inválidos:', {
        temAgendamento: !!agendamento,
        nomeAluno: agendamento?.nomeAluno,
        email: agendamento?.email,
        valor: agendamento?.valor,
        tipoValor: typeof agendamento?.valor
      });
      
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

    // Valor em centavos
    const valorCentavos = Math.round(agendamento.valor * 100);
    
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
          reference_id: `AULA_${Date.now()}`,
          name: "Aula Individual de Patinação",
          quantity: 1,
          unit_amount: valorCentavos
        }
      ],
      notification_urls: ["https://dancing-webapp.com.br/api/pagbank/webhook"],
      charges: [
        {
          reference_id: `AULA_${Date.now()}`,
          description: "Aula Individual de Patinação",
          amount: {
            value: valorCentavos,
            currency: "BRL"
          },
          payment_method: {
            type: "CREDIT_CARD",
            installments: 1,
            capture: true
          }
        }
      ]
    };

    console.log('Pedido a ser enviado:', JSON.stringify(order, null, 2));

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
    console.log('Resposta do PagBank:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('Erro do PagBank:', data);
      throw new Error(JSON.stringify(data.error_messages || data));
    }

    // Encontrar a URL de pagamento
    const paymentUrl = data.links?.find(link => link.rel === "payment")?.href;
    
    if (!paymentUrl) {
      console.error('Resposta sem URL de pagamento:', data);
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