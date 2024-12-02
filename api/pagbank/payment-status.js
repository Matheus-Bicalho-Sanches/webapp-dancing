import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.query;
    
    if (!orderId) {
      return res.status(400).json({
        error: 'orderId é obrigatório'
      });
    }

    console.log('Verificando status do pedido:', orderId);
    
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com/orders'
      : 'https://sandbox.api.pagseguro.com/orders';

    console.log('URL:', `${baseUrl}/${orderId}`);
    console.log('Token presente:', !!process.env.PAGBANK_TOKEN);

    const response = await fetch(`${baseUrl}/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json'
      }
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
      status: data.status
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
} 