import { MercadoPagoConfig, Preference } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

// Configurar o Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { items, payer } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items inválidos',
        details: 'O array de items é obrigatório e não pode estar vazio'
      });
    }

    // Criar a preferência
    const preference = {
      items,
      payer,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      },
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

    console.log('Criando preferência:', preference);

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    
    console.log('Preferência criada:', JSON.stringify(response, null, 2));

    // Retornar a resposta com o formato correto
    return res.status(200).json({
      success: true,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      preferenceId: response.id
    });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    return res.status(500).json({
      error: 'Erro ao criar preferência de pagamento',
      details: error.message
    });
  }
} 