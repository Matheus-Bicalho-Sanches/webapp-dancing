import crypto from 'crypto';

// Assinatura secreta do webhook
const WEBHOOK_SECRET = '8176de12b3ec21fb29a38d9b10a1573f21361a98e5f30b9068a55c8d19826bcf';

// Função para verificar a assinatura
function verifyWebhookSignature(payload, signature) {
  const generatedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  );
}

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Signature, X-Hub-Signature'
  );

  // Preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Aceitar apenas POST
  if (req.method !== 'POST') {
    console.error('[Webhook] Método não permitido:', req.method);
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowedMethods: ['POST']
    });
  }

  try {
    console.log('[Webhook] Notificação recebida do Mercado Pago');
    console.log('[Webhook] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Webhook] Método:', req.method);
    console.log('[Webhook] Body:', JSON.stringify(req.body, null, 2));
    
    // Verificar a assinatura do webhook
    const signature = req.headers['x-signature'] || req.headers['x-hub-signature'];
    
    // Durante testes, podemos aceitar requisições sem assinatura
    if (!signature) {
      console.warn('[Webhook] Aviso: Requisição sem assinatura - permitindo para testes');
    } else {
      const rawBody = JSON.stringify(req.body);
      try {
        if (!verifyWebhookSignature(rawBody, signature)) {
          console.error('[Webhook] Erro: Assinatura inválida');
          return res.status(401).json({ error: 'Assinatura inválida' });
        }
        console.log('[Webhook] Assinatura verificada com sucesso');
      } catch (signatureError) {
        console.error('[Webhook] Erro ao verificar assinatura:', signatureError);
        return res.status(401).json({ error: 'Erro ao verificar assinatura' });
      }
    }

    // Processar a notificação
    const { action, data } = req.body;
    
    console.log('[Webhook] Ação:', action);
    console.log('[Webhook] Dados:', JSON.stringify(data, null, 2));
    
    if (action === 'payment.updated' || action === 'payment.created') {
      const paymentId = data.id;
      console.log('[Webhook] Notificação de pagamento recebida. ID:', paymentId);
      
      // Aqui você pode adicionar a lógica para atualizar o status do pagamento no seu banco de dados
      // Por exemplo, atualizar o status da matrícula do aluno
    }
    
    // Sempre retornar 200 OK para o Mercado Pago
    return res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook:', error);
    console.error('[Webhook] Stack trace:', error.stack);
    // Mesmo com erro, retornamos 200 para o Mercado Pago não retentar
    return res.status(200).json({ status: 'Error processed' });
  }
} 