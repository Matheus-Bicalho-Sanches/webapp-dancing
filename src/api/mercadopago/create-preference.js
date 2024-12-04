import mercadopago from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Configurar o Mercado Pago com seu token de acesso
    mercadopago.configure({
      access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
    });

    const { items, payer } = req.body;

    // Criar a preferência
    const preference = {
      items,
      payer,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_API_URL}/success`,
        failure: `${process.env.NEXT_PUBLIC_API_URL}/failure`,
        pending: `${process.env.NEXT_PUBLIC_API_URL}/pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_API_URL}/api/mercadopago/webhook`
    };

    const response = await mercadopago.preferences.create(preference);
    console.log('Preferência criada:', response);

    return res.status(200).json({
      success: true,
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point
    });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    return res.status(500).json({
      error: 'Erro ao criar preferência de pagamento',
      details: error.message
    });
  }
} 