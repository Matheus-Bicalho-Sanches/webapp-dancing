import crypto from 'crypto';
import { MercadoPagoConfig, OAuth } from 'mercadopago';

// Configurações do Mercado Pago
const WEBHOOK_SECRET = '8176de12b3ec21fb29a38d9b10a1573f21361a98e5f30b9068a55c8d19826bcf';
const CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;

// Configurar o cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET
});

// Função para obter token OAuth
async function getOAuthToken() {
  try {
    const oauth = new OAuth(client);
    const response = await oauth.create({
      body: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code'
      }
    });
    return response.access_token;
  } catch (error) {
    console.error('[OAuth] Erro ao obter token:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Log inicial para debug
  console.log('[Webhook] Requisição recebida');
  console.log('[Webhook] Método:', req.method);
  console.log('[Webhook] URL:', req.url);
  console.log('[Webhook] Headers:', JSON.stringify(req.headers, null, 2));

  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Signature, X-Hub-Signature, User-Agent, Authorization'
  );

  // Preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Aceitar apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowedMethods: ['POST']
    });
  }

  try {
    // Tentar obter token OAuth
    try {
      const oauthToken = await getOAuthToken();
      console.log('[OAuth] Token obtido com sucesso');
    } catch (oauthError) {
      console.error('[OAuth] Erro na autenticação:', oauthError);
    }

    // Log do corpo da requisição
    const rawBody = JSON.stringify(req.body);
    console.log('[Webhook] Body:', rawBody);

    // Verificar tipo de notificação
    const type = req.query.type || req.query.topic || req.body.type || req.body.action;
    const id = req.query.id || req.query.data_id || req.body.data?.id;

    console.log('[Webhook] Tipo de notificação:', type);
    console.log('[Webhook] ID:', id);

    if (!type || !id) {
      console.error('[Webhook] Dados inválidos na requisição');
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'A requisição deve conter type/topic e id/data_id'
      });
    }

    // Processar diferentes tipos de notificação
    switch (type) {
      case 'payment':
      case 'payment.created':
      case 'payment.updated':
        console.log('[Webhook] Processando notificação de pagamento:', id);
        // Aqui você implementaria a lógica de atualização do pagamento
        break;
      
      default:
        console.log('[Webhook] Tipo de notificação não processado:', type);
    }

    // Sempre retornar 200 OK para o Mercado Pago
    return res.status(200).json({ 
      status: 'OK',
      message: 'Webhook received successfully',
      type,
      id
    });

  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook:', error);
    console.error('[Webhook] Stack trace:', error.stack);
    
    // Mesmo com erro, retornamos 200 para o Mercado Pago não retentar
    return res.status(200).json({ 
      status: 'Error processed',
      error: error.message
    });
  }
} 