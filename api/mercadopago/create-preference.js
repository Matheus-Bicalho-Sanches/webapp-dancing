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

    // Garantir que os items estejam no formato correto
    const formattedItems = items.map(item => ({
      id: item.id || 'aula',
      title: item.title || 'Aula de Patinação',
      quantity: item.quantity || 1,
      unit_price: Number(item.unit_price) || 1,
      currency_id: 'BRL'
    }));

    // Criar a preferência
    const preference = {
      items: formattedItems,
      payer: {
        name: payer?.name || '',
        email: payer?.email || '',
        identification: payer?.identification || {},
        address: payer?.address || {},
        phone: payer?.phone || {},
        date_created: new Date().toISOString()
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
        default_installments: 1
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_API_URL}/success`,
        failure: `${process.env.NEXT_PUBLIC_API_URL}/payment-failure`,
        pending: `${process.env.NEXT_PUBLIC_API_URL}/pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_API_URL}/api/mercadopago/webhook`,
      statement_descriptor: "Dancing Patinação",
      external_reference: new Date().getTime().toString(),
      expires: false,
      binary_mode: false,
      purpose: 'wallet_purchase',
      marketplace: 'MP-MKT-6064176381936791'
    };

    console.log('[Payment] Criando preferência:', JSON.stringify(preference, null, 2));

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    
    console.log('[Payment] Preferência criada com sucesso');
    console.log('[Payment] Resposta do Mercado Pago:', JSON.stringify(response, null, 2));

    return res.status(200).json({
      success: true,
      init_point: response.init_point,
      id: response.id
    });

  } catch (error) {
    console.error('[Payment] Erro ao criar preferência:', error);
    console.error('[Payment] Stack trace:', error.stack);
    return res.status(500).json({
      error: 'Erro ao criar preferência de pagamento',
      details: error.message,
      stack: error.stack
    });
  }
} 