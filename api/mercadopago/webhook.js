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