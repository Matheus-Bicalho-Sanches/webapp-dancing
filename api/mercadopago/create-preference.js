import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configurar o Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[Payment] Nova requisição de pagamento recebida');
    console.log('[Payment] Dados da requisição:', JSON.stringify(req.body, null, 2));
    
    const { items, payer } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('[Payment] Erro: Items inválidos');
      return res.status(400).json({
        error: 'Items inválidos',
        details: 'O array de items é obrigatório e não pode estar vazio'
      });
    }

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
      notification_url: `${process.env.NEXT_PUBLIC_API_URL}/api/mercadopago/webhook`,
      statement_descriptor: "Dancing Patinação",
      external_reference: new Date().getTime().toString()
    };

    console.log('[Payment] Criando preferência:', JSON.stringify(preference, null, 2));

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    
    console.log('[Payment] Preferência criada com sucesso');
    console.log('[Payment] Resposta do Mercado Pago:', JSON.stringify(response, null, 2));

    return res.status(200).json({
      success: true,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      preferenceId: response.id
    });

  } catch (error) {
    console.error('[Payment] Erro ao criar preferência:', error);
    console.error('[Payment] Stack trace:', error.stack);
    return res.status(500).json({
      error: 'Erro ao criar preferência de pagamento',
      details: error.message
    });
  }
} 