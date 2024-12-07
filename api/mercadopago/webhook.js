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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('[Webhook] Notificação recebida do Mercado Pago');
    console.log('[Webhook] Headers:', JSON.stringify(req.headers, null, 2));
    
    // Verificar a assinatura do webhook
    const signature = req.headers['x-signature'] || req.headers['x-hub-signature'];
    if (!signature) {
      console.error('[Webhook] Erro: Assinatura não encontrada nos headers');
      return res.status(401).json({ error: 'Assinatura não encontrada' });
    }

    const rawBody = JSON.stringify(req.body);
    try {
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('[Webhook] Erro: Assinatura inválida');
        return res.status(401).json({ error: 'Assinatura inválida' });
      }
    } catch (signatureError) {
      console.error('[Webhook] Erro ao verificar assinatura:', signatureError);
      return res.status(401).json({ error: 'Erro ao verificar assinatura' });
    }

    console.log('[Webhook] Assinatura verificada com sucesso');
    console.log('[Webhook] Corpo da requisição:', JSON.stringify(req.body, null, 2));
    
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      console.log('[Webhook] Notificação de pagamento recebida. ID:', paymentId);
      
      // Aqui você pode adicionar a lógica para atualizar o status do pagamento no seu banco de dados
      // Por exemplo, atualizar o status da matrícula do aluno
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook:', error);
    console.error('[Webhook] Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
} 