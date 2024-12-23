// Função para criar uma ordem de pagamento no PagSeguro
export async function createPagSeguroOrder(orderData) {
  try {
    // URL da API baseada no ambiente
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://dancing-webapp.com.br/api/pagseguro/create-order'
      : 'http://localhost:3001/api/pagseguro/create-order';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(orderData.amount),
        payer: {
          name: orderData.payer.name,
          email: orderData.payer.email,
          tax_id: orderData.payer.tax_id.replace(/[^0-9]/g, '')
        },
        items: [{
          name: orderData.items[0].name,
          quantity: 1,
          amount: Number(orderData.amount)
        }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'Erro ao criar ordem de pagamento');
      error.response = { data }; // Adiciona os detalhes da resposta ao objeto de erro
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar ordem de pagamento:', error);
    throw error;
  }
} 