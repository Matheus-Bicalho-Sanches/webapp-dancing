export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { order_id } = request.query;

    // TODO: Consultar status do pagamento no PagBank
    // TODO: Retornar status atual do pagamento

    return response.status(200).json({
      status: 'pending',
      order_id
    });
  } catch (error) {
    console.error('Status check error:', error);
    return response.status(400).json({ error: error.message });
  }
} 