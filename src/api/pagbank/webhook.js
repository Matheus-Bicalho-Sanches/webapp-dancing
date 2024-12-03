import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { notificationCode } = req.body;

    if (!notificationCode) {
      return res.status(400).json({ error: 'Notification code is required' });
    }

    // URL base baseada no ambiente
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';

    // Consultar status da transação
    const response = await fetch(`${baseUrl}/orders/${notificationCode}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data.error_messages || data));
    }

    // Verificar status do pagamento
    const status = data.charges[0]?.status;
    const orderId = data.reference_id;

    console.log('Webhook recebido:', {
      notificationCode,
      status,
      orderId
    });

    // Aqui você pode atualizar o status do agendamento no seu banco de dados
    // baseado no status retornado pelo PagBank

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
} 