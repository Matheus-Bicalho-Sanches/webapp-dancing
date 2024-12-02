import { db } from '../../src/config/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Teste das variáveis de ambiente
    console.log('PagBank Environment:', process.env.PAGBANK_ENV);
    console.log('Token exists:', !!process.env.PAGBANK_TOKEN);

    // Teste de conexão com PagBank
    const headers = {
      'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
      'Content-Type': 'application/json'
    };

    // URL base baseada no ambiente
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';

    console.log('Using PagBank URL:', baseUrl);

    const { agendamento } = request.body;
    
    return response.status(200).json({
      environment: process.env.PAGBANK_ENV,
      baseUrl,
      tokenExists: !!process.env.PAGBANK_TOKEN,
      agendamento
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return response.status(400).json({ 
      error: error.message,
      env: process.env.PAGBANK_ENV
    });
  }
} 