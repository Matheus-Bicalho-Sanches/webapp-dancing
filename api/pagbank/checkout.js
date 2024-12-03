import { db } from '../../src/config/firebase';
import { doc, setDoc, collection, updateDoc } from 'firebase/firestore';
import axios from 'axios';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { agendamento } = request.body;
    
    // Criar o pagamento usando a função createPayment
    const paymentResult = await createPayment({
      referenceId: agendamento.id, // ID do agendamento no Firestore
      customerName: agendamento.nomeCliente,
      customerEmail: agendamento.email,
      customerTaxId: agendamento.cpf,
      serviceName: 'Aula de Dança',
      amount: agendamento.valor * 100, // Converter para centavos
    });

    if (paymentResult.success) {
      // Atualizar o agendamento com o status inicial
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
    console.error('Checkout error:', error);
    return response.status(400).json({ error: error.message });
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