import crypto from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import fs from 'fs/promises';
import path from 'path';

// Função para ler o token salvo
async function getStoredToken() {
  try {
    const tokenFilePath = path.join(process.cwd(), 'mp_token.json');
    const tokenData = JSON.parse(await fs.readFile(tokenFilePath, 'utf8'));
    
    // Verificar se o token ainda é válido
    const createdAt = new Date(tokenData.created_at);
    const expiresIn = tokenData.expires_in * 1000; // converter para milissegundos
    const now = new Date();
    
    if (now.getTime() - createdAt.getTime() > expiresIn) {
      console.warn('[Webhook] Token expirado, necessário reautorizar');
      return null;
    }
    
    return tokenData.access_token;
  } catch (error) {
    console.error('[Webhook] Erro ao ler token:', error);
    return null;
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
    // Obter o token de acesso
    const accessToken = await getStoredToken();
    if (!accessToken) {
      console.error('[Webhook] Token de acesso não encontrado ou expirado');
      return res.status(401).json({
        error: 'Token não encontrado ou expirado',
        message: 'É necessário reautorizar o aplicativo'
      });
    }

    // Configurar cliente do Mercado Pago com o token
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken
    });

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
      case 'payment.updated': {
        console.log('[Webhook] Processando notificação de pagamento:', id);
        
        // Buscar informações do pagamento
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id });
        console.log('[Webhook] Informações do pagamento:', JSON.stringify(paymentInfo, null, 2));
        
        // Aqui você implementaria a lógica de atualização do pagamento
        break;
      }
      
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