import { MercadoPagoConfig, Payment } from 'mercadopago';
import fs from 'fs/promises';
import path from 'path';
import { logWebhook, logError, logPaymentEvent } from './logger.js';

const TOKEN_FILE_PATH = '/tmp/mp_token.json';

// Função para obter detalhes da rejeição
async function getPaymentRejectionDetails(payment) {
  const status = payment.status;
  const statusDetail = payment.status_detail;
  const paymentMethodId = payment.payment_method_id;
  
  let rejectionDetail = {
    title: 'Pagamento rejeitado',
    message: 'O pagamento não pôde ser processado.',
    recommendation: 'Tente novamente com outro cartão ou entre em contato com o banco emissor.'
  };

  // cc_rejected_bad_filled_card_number
  if (statusDetail === 'cc_rejected_bad_filled_card_number') {
    rejectionDetail = {
      title: 'Cartão inválido',
      message: 'Verifique o número do cartão.',
      recommendation: 'Digite novamente o número do cartão.'
    };
  }
  // cc_rejected_bad_filled_date
  else if (statusDetail === 'cc_rejected_bad_filled_date') {
    rejectionDetail = {
      title: 'Data de validade incorreta',
      message: 'Verifique a data de validade.',
      recommendation: 'Digite novamente a data de validade.'
    };
  }
  // cc_rejected_bad_filled_security_code
  else if (statusDetail === 'cc_rejected_bad_filled_security_code') {
    rejectionDetail = {
      title: 'Código de segurança inválido',
      message: 'Verifique o código de segurança.',
      recommendation: 'Digite novamente o código de segurança.'
    };
  }
  // cc_rejected_bad_filled_other
  else if (statusDetail === 'cc_rejected_bad_filled_other') {
    rejectionDetail = {
      title: 'Dados incorretos',
      message: 'Verifique todos os dados do cartão.',
      recommendation: 'Digite novamente todos os dados do cartão.'
    };
  }
  // cc_rejected_high_risk
  else if (statusDetail === 'cc_rejected_high_risk') {
    rejectionDetail = {
      title: 'Pagamento recusado por risco',
      message: 'Por favor, utilize outro meio de pagamento.',
      recommendation: 'Use um cartão diferente ou outro meio de pagamento.'
    };
  }
  // cc_rejected_insufficient_amount
  else if (statusDetail === 'cc_rejected_insufficient_amount') {
    rejectionDetail = {
      title: 'Saldo insuficiente',
      message: 'O cartão não possui saldo suficiente.',
      recommendation: 'Use um cartão diferente ou entre em contato com seu banco.'
    };
  }
  // cc_rejected_max_attempts
  else if (statusDetail === 'cc_rejected_max_attempts') {
    rejectionDetail = {
      title: 'Você atingiu o limite de tentativas',
      message: 'Escolha outro cartão ou outro meio de pagamento.',
      recommendation: 'Use um cartão diferente ou aguarde alguns minutos.'
    };
  }
  // cc_rejected_duplicated_payment
  else if (statusDetail === 'cc_rejected_duplicated_payment') {
    rejectionDetail = {
      title: 'Pagamento duplicado',
      message: 'O pagamento já foi realizado.',
      recommendation: 'Verifique se o pagamento anterior foi processado.'
    };
  }
  // cc_rejected_card_disabled
  else if (statusDetail === 'cc_rejected_card_disabled') {
    rejectionDetail = {
      title: 'Cartão inativo',
      message: 'Entre em contato com seu banco para ativar seu cartão.',
      recommendation: 'Use outro cartão ou contate seu banco.'
    };
  }

  return {
    status,
    status_detail: statusDetail,
    payment_method_id: paymentMethodId,
    rejection_details: rejectionDetail
  };
}

// Função para ler o token salvo
async function getStoredToken() {
  try {
    console.log('[Webhook] Tentando ler token de:', TOKEN_FILE_PATH);
    const tokenData = JSON.parse(await fs.readFile(TOKEN_FILE_PATH, 'utf8'));
    console.log('[Webhook] Token encontrado:', { user_id: tokenData.user_id });
    
    // Verificar se o token ainda é válido
    const createdAt = new Date(tokenData.created_at);
    const expiresIn = tokenData.expires_in * 1000;
    const now = new Date();
    const timeUntilExpiry = (createdAt.getTime() + expiresIn) - now.getTime();
    
    await logPaymentEvent('token_check', {
      user_id: tokenData.user_id,
      expires_in: timeUntilExpiry / 1000 / 60 / 60 + ' horas'
    });

    // Se o token vai expirar em menos de 1 hora, tentar renovar
    const oneHour = 60 * 60 * 1000;
    if (timeUntilExpiry < oneHour) {
      await logPaymentEvent('token_refresh_attempt', { reason: 'Token próximo de expirar' });
      
      try {
        const response = await fetch('https://dancing-webapp.com.br/api/mercadopago/oauth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Falha ao renovar token: ${response.status} ${response.statusText}`);
        }
        
        await logPaymentEvent('token_refresh_success', { user_id: tokenData.user_id });
        
        // Ler o novo token
        const newTokenData = JSON.parse(await fs.readFile(TOKEN_FILE_PATH, 'utf8'));
        return newTokenData.access_token;
      } catch (refreshError) {
        await logError('token_refresh', refreshError);
        
        // Se falhar a renovação, retorna o token atual se ainda for válido
        if (timeUntilExpiry > 0) {
          await logPaymentEvent('using_current_token', { reason: 'Falha na renovação mas token ainda válido' });
          return tokenData.access_token;
        }
        
        await logPaymentEvent('token_expired', { reason: 'Token expirado e falha na renovação' });
        return null;
      }
    }
    
    return tokenData.access_token;
  } catch (error) {
    await logError('token_read', error);
    return null;
  }
}

export default async function handler(req, res) {
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body
  };

  await logWebhook('request_received', requestData);

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
    await logWebhook('method_not_allowed', { method: req.method });
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowedMethods: ['POST']
    });
  }

  try {
    // Verificar tipo de notificação
    const type = req.query.type || req.query.topic || req.body.type || req.body.action;
    const id = req.query['data.id'] || req.query.id || req.body.data?.id;

    await logWebhook('notification_received', { type, id });

    // Configurar cliente do Mercado Pago com o token de produção
    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
    });

    // Processar diferentes tipos de notificação
    switch (type) {
      case 'payment':
      case 'payment.created':
      case 'payment.updated': {
        await logPaymentEvent('processing_payment', { id });
        
        // Buscar informações do pagamento
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id });
        await logPaymentEvent('payment_info_received', paymentInfo);

        // Se o pagamento foi rejeitado, obter detalhes da rejeição
        if (paymentInfo.status === 'rejected') {
          const rejectionDetails = await getPaymentRejectionDetails(paymentInfo);
          await logPaymentEvent('payment_rejected', rejectionDetails);
        }
        
        break;
      }

      case 'merchant_order':
      case 'topic_merchant_order_wh': {
        await logWebhook('merchant_order_received', {
          id,
          data: req.body
        });
        break;
      }
      
      default:
        await logWebhook('unknown_notification_type', { type });
    }

    // Sempre retornar 200 OK para o Mercado Pago
    return res.status(200).json({ 
      status: 'OK',
      message: 'Webhook received successfully',
      type,
      id
    });

  } catch (error) {
    await logError('webhook_processing', error, { url: req.url, body: req.body });
    
    // Mesmo com erro, retornamos 200 para o Mercado Pago não retentar
    return res.status(200).json({ 
      status: 'Error processed',
      error: error.message
    });
  }
} 