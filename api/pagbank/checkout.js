import { db } from '../../src/config/firebase';
import { doc, setDoc, collection, updateDoc } from 'firebase/firestore';
import axios from 'axios';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { agendamento } = request.body;
    
    // Log para debug
    console.log('Dados do agendamento recebidos:', {
      ...agendamento,
      cpf: 'XXXXX' // Não logar o CPF completo por segurança
    });
    
    // Log das variáveis de ambiente (não logar o token completo)
    console.log('Variáveis de ambiente:', {
      tokenExists: !!process.env.PAGBANK_TOKEN,
      tokenFirstChars: process.env.PAGBANK_TOKEN?.substring(0, 5),
      apiUrl: process.env.NEXT_PUBLIC_API_URL
    });

    const paymentResult = await createPayment({
      referenceId: agendamento.id,
      customerName: agendamento.nomeCliente,
      customerEmail: agendamento.email,
      customerTaxId: agendamento.cpf,
      serviceName: 'Aula de Dança',
      amount: agendamento.valor * 100,
    });

    // Log do resultado
    console.log('Resultado do pagamento:', {
      success: paymentResult.success,
      hasUrl: !!paymentResult.paymentUrl
    });

    if (paymentResult.success) {
      const agendamentoRef = doc(db, 'agendamentos', agendamento.id);
      await updateDoc(agendamentoRef, {
        statusPagamento: 'pendente',
        urlPagamento: paymentResult.paymentUrl
      });

      return response.status(200).json({
        success: true,
        paymentUrl: paymentResult.paymentUrl
      });
    } else {
      throw new Error(paymentResult.error);
    }

  } catch (error) {
    console.error('Erro completo:', error);
    console.error('Detalhes do erro:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    return response.status(400).json({ error: error.message });
  }
} 

export async function createPayment(orderData) {
  try {
    console.log('Iniciando criação do pagamento:', orderData);

    // Define a URL base baseada no ambiente
    const baseUrl = process.env.PAGBANK_ENV === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';

    const paymentRequest = {
      reference_id: orderData.referenceId,
      customer: {
        name: orderData.customerName,
        email: orderData.customerEmail,
        tax_id: orderData.customerTaxId,
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

    console.log('Requisição para o PagBank:', paymentRequest);
    console.log('Ambiente:', process.env.PAGBANK_ENV);
    console.log('URL base:', baseUrl);
    console.log('Token PagBank existe:', !!process.env.PAGBANK_TOKEN);

    const response = await axios.post(
      `${baseUrl}/orders`,
      paymentRequest,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Resposta do PagBank:', response.data);

    return {
      success: true,
      paymentUrl: response.data.links.find(link => link.rel === "payment").href
    };

  } catch (error) {
    console.error('Erro detalhado:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
} 