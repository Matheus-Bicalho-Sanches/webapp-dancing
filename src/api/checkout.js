import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Armazenamento temporário de status para teste
const paymentStatus = new Map();

router.post('/checkout', async (req, res) => {
  try {
    const { agendamento } = req.body;
    
    // URL base baseada no ambiente
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com/orders'
      : 'https://sandbox.api.pagseguro.com/orders';

    console.log('Ambiente PagBank:', process.env.PAGBANK_ENV);
    console.log('URL Base:', baseUrl);
    console.log('Token:', process.env.PAGBANK_TOKEN);
    
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
      ],
      qr_codes: [
        {
          amount: {
            value: agendamento.valor * 100
          }
        }
      ]
    };

    console.log('Dados do pedido:', JSON.stringify(order, null, 2));

    // Gerar chave de idempotência no formato correto (apenas letras, números e hífen)
    const idempotencyKey = `order-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Fazer a requisição para o PagBank
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': process.env.PAGBANK_TOKEN,
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify(order)
    });

    const data = await response.json();
    console.log('Resposta do PagBank:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(JSON.stringify(data.error_messages || data));
    }

    return res.status(200).json({
      success: true,
      order_id: data.id,
      qr_code: data.qr_codes?.[0],
      links: data.links
    });

  } catch (error) {
    console.error('Checkout error detalhado:', error);
    return res.status(400).json({ 
      error: error.message,
      details: error.toString()
    });
  }
});

// Função para verificar status do pagamento
export async function checkPaymentStatus(orderId) {
  try {
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com/orders'
      : 'https://sandbox.api.pagseguro.com/orders';

    const response = await fetch(`${baseUrl}/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': process.env.PAGBANK_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Status do pagamento:', data.status);
    return data.status;
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    throw error;
  }
}

// Função para implementar o polling
export function startPaymentStatusCheck(orderId, onSuccess, onError) {
  const checkInterval = setInterval(async () => {
    try {
      const status = await checkPaymentStatus(orderId);
      
      if (status === 'PAID' || status === 'COMPLETED') {
        clearInterval(checkInterval);
        onSuccess(status);
      } else if (status === 'DECLINED' || status === 'CANCELLED') {
        clearInterval(checkInterval);
        onError(status);
      }
      // Continua verificando se o status for 'PENDING' ou similar
    } catch (error) {
      clearInterval(checkInterval);
      onError(error);
    }
  }, 3000); // Verifica a cada 3 segundos

  // Retorna uma função para cancelar o polling se necessário
  return () => clearInterval(checkInterval);
}

// Endpoint de teste para simular mudança de status do pagamento
router.post('/test-payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    console.log(`Simulando mudança de status para pedido ${orderId}: ${status}`);
    
    // Armazena o status do pagamento
    paymentStatus.set(orderId, status);
    
    return res.status(200).json({
      success: true,
      orderId,
      status
    });
  } catch (error) {
    console.error('Erro ao simular pagamento:', error);
    return res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Endpoint para verificar status do pagamento
router.get('/payment-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Verifica se existe um status de teste para este pedido
    const status = paymentStatus.get(orderId) || 'PENDING';
    
    return res.status(200).json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router; 