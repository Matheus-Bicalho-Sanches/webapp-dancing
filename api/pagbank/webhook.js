import { db } from '../../src/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Obtém os dados da notificação
    const notification = request.body;
    console.log('Webhook notification received:', notification);

    // Obtém o ID de referência do pedido
    const referenceId = notification.reference_id;
    
    // Mapeia os status do PagBank para seus status internos
    const statusMap = {
      PAID: 'pago',
      DECLINED: 'recusado',
      EXPIRED: 'expirado',
      CANCELED: 'cancelado',
      PENDING: 'pendente'
    };

    // Atualiza o status do agendamento no Firestore
    const agendamentoRef = doc(db, 'agendamentos', referenceId);
    await updateDoc(agendamentoRef, {
      statusPagamento: statusMap[notification.charges[0].status] || 'desconhecido',
      ultimaAtualizacao: new Date().toISOString()
    });

    return response.status(200).json({ message: 'Notificação processada com sucesso' });

  } catch (error) {
    console.error('Webhook error:', error);
    return response.status(400).json({ error: error.message });
  }
} 