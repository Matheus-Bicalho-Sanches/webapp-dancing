import { db } from '../../src/config/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import axios from 'axios';

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

export async function createPayment(orderData) {
  try {
    const paymentRequest = {
      reference_id: orderData.referenceId, // ID único do seu pedido
      customer: {
        name: orderData.customerName,
        email: orderData.customerEmail,
        tax_id: orderData.customerTaxId, // CPF do cliente
      },
      items: [
        {
          name: orderData.serviceName,
          quantity: 1,
          unit_amount: orderData.amount
        }
      ],
      notification_urls: [
        `${process.env.NEXT_PUBLIC_API_URL}/api/pagbank/webhook`
      ],
      charges: [
        {
          amount: {
            value: orderData.amount,
            currency: "BRL"
          },
          payment_method: {
            type: "CREDIT_CARD",
            installments: 1,
            capture: true
          }
        }
      ]
    };

    const response = await axios.post(
      'https://api.pagseguro.com/orders',
      paymentRequest,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Retorna a URL de pagamento para redirecionamento
    return {
      success: true,
      paymentUrl: response.data.links.find(link => link.rel === "payment").href
    };

  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 