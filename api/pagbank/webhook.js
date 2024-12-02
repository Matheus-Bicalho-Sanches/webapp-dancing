export default function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const notification = request.body;
    console.log('PagBank webhook received:', notification);

    // TODO: Validar assinatura do webhook
    // TODO: Processar notificação
    // TODO: Atualizar status do agendamento no Firestore

    return response.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return response.status(400).json({ error: error.message });
  }
} 