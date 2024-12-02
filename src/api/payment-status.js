import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.query;
    
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

    if (!response.ok) {
      throw new Error(JSON.stringify(data.error_messages || data));
    }

    return res.status(200).json({
      success: true,
      status: data.status
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
} 