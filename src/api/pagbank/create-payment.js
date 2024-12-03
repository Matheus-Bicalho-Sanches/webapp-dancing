import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { nome, email, valor } = req.body;

    // Validar dados
    if (!nome || !email || !valor) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Nome, email e valor são obrigatórios'
      });
    }

    // Converter valor para centavos
    const valorCentavos = Math.round(Number(valor) * 100);

    // URL do PagBank
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';

    // Criar pedido
    const order = {
      customer: {
        name: nome,
        email: email,
        tax_id: "12345678909"
      },
      items: [
        {
          name: "Aula de Patinação",
          quantity: 1,
          unit_amount: valorCentavos
        }
      ],
      qr_codes: [
        {
          amount: {
            value: valorCentavos
          }
        }
      ],
      charges: [
        {
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

    // Enviar para o PagBank
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_messages?.[0]?.message || 'Erro ao processar pagamento');
    }

    // Pegar URL de pagamento
    const paymentUrl = data.links?.find(link => link.rel === "payment")?.href;

    if (!paymentUrl) {
      throw new Error('URL de pagamento não encontrada');
    }

    return res.status(200).json({
      success: true,
      url: paymentUrl
    });

  } catch (error) {
    console.error('Erro no pagamento:', error);
    return res.status(500).json({
      error: 'Erro ao processar pagamento',
      message: error.message
    });
  }
} 