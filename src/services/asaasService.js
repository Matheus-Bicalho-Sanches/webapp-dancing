import axios from 'axios';

const api = axios.create({
  baseURL: '/api/asaas',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use((config) => {
  // Não adiciona o token se já estiver presente
  if (!config.headers['access_token']) {
    config.headers['access_token'] = import.meta.env.VITE_ASAAS_API_KEY;
  }
  
  // Log da requisição
  console.log('Enviando requisição:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    data: config.data,
    headers: {
      ...config.headers,
      'access_token': '****' // Oculta o token no log
    }
  });
  
  return config;
}, (error) => {
  console.error('Erro no interceptor de requisição:', error);
  return Promise.reject(error);
});

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => {
    // Log de sucesso
    console.log('Resposta recebida:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Log detalhado do erro
    console.error('Erro na requisição:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: {
        ...error.config?.headers,
        'access_token': '****' // Oculta o token no log
      }
    });

    // Formata a mensagem de erro
    const errorMessage = error.response?.data?.errors?.[0]?.description 
      || error.response?.data?.message 
      || error.message 
      || 'Erro desconhecido';

    // Cria um erro mais informativo
    const enhancedError = new Error(errorMessage);
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    enhancedError.originalError = error;

    return Promise.reject(enhancedError);
  }
);

export const asaasService = {
  // Customer Management
  createCustomer: async (customerData) => {
    try {
      if (!customerData.name || !customerData.email || !customerData.cpfCnpj) {
        throw new Error('Nome, email e CPF/CNPJ são obrigatórios');
      }

      // Formatação dos dados conforme documentação
      const formattedData = {
        name: customerData.name,
        email: customerData.email,
        cpfCnpj: customerData.cpfCnpj?.replace(/\D/g, ''),
        phone: customerData.phone?.replace(/\D/g, ''),
        mobilePhone: customerData.mobilePhone?.replace(/\D/g, ''),
        postalCode: customerData.postalCode?.replace(/\D/g, ''),
        address: customerData.address,
        addressNumber: customerData.addressNumber,
        complement: customerData.complement,
        province: customerData.province,
        externalReference: customerData.externalReference,
        notificationDisabled: customerData.notificationDisabled,
        additionalEmails: customerData.additionalEmails,
        municipalInscription: customerData.municipalInscription,
        stateInscription: customerData.stateInscription,
        observations: customerData.observations
      };

      // Remove campos undefined
      Object.keys(formattedData).forEach(key => 
        formattedData[key] === undefined && delete formattedData[key]
      );

      console.log('Criando cliente com dados:', formattedData);
      const response = await api.post('/customers', formattedData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  },

  getCustomer: async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      throw error;
    }
  },

  updateCustomer: async (customerId, customerData) => {
    try {
      const response = await api.post(`/customers/${customerId}`, customerData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  },

  // Credit Card Management
  tokenizeCreditCard: async (data) => {
    try {
      if (!data.customer || !data.creditCard) {
        throw new Error('Dados do cliente e do cartão são obrigatórios');
      }

      const tokenData = {
        customer: data.customer,
        creditCard: {
          holderName: data.creditCard.holderName,
          number: data.creditCard.number.replace(/\D/g, ''),
          expiryMonth: data.creditCard.expiryMonth.padStart(2, '0'),
          expiryYear: data.creditCard.expiryYear.length === 2 ? `20${data.creditCard.expiryYear}` : data.creditCard.expiryYear,
          ccv: data.creditCard.ccv
        },
        creditCardHolderInfo: {
          name: data.holderInfo.name,
          email: data.holderInfo.email,
          cpfCnpj: data.holderInfo.cpfCnpj?.replace(/\D/g, ''),
          postalCode: data.holderInfo.postalCode?.replace(/\D/g, ''),
          addressNumber: data.holderInfo.addressNumber,
          addressComplement: data.holderInfo.addressComplement,
          phone: data.holderInfo.phone?.replace(/\D/g, ''),
          mobilePhone: data.holderInfo.mobilePhone?.replace(/\D/g, '')
        }
      };

      // Remove campos undefined do creditCardHolderInfo
      Object.keys(tokenData.creditCardHolderInfo).forEach(key => 
        tokenData.creditCardHolderInfo[key] === undefined && delete tokenData.creditCardHolderInfo[key]
      );

      console.log('Tokenizando cartão:', {
        ...tokenData,
        creditCard: {
          ...tokenData.creditCard,
          number: '****' // Ocultando número do cartão no log
        }
      });

      const response = await api.post('/creditCard/tokenize', tokenData);
      return response.data;
    } catch (error) {
      console.error('Erro ao tokenizar cartão:', error);
      throw error;
    }
  },

  // Subscription Management
  createSubscription: async (data) => {
    try {
      const subscriptionData = {
        customer: data.customerId,
        billingType: 'CREDIT_CARD',
        nextDueDate: data.nextDueDate,
        value: data.value,
        cycle: data.cycle,
        description: data.description,
        creditCardToken: data.creditCardToken,
        creditCard: data.creditCard,
        creditCardHolderInfo: data.creditCardHolderInfo,
        externalReference: data.externalReference,
        fine: data.fine,
        interest: data.interest,
        maxPayments: data.maxPayments
      };

      // Remove campos undefined
      Object.keys(subscriptionData).forEach(key => 
        subscriptionData[key] === undefined && delete subscriptionData[key]
      );

      const response = await api.post('/subscriptions', subscriptionData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  },

  getCustomerSubscriptions: async (customerId) => {
    try {
      const response = await api.get('/subscriptions', {
        params: { customer: customerId }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      throw error;
    }
  },

  getSubscriptionPayments: async (subscriptionId) => {
    try {
      const response = await api.get(`/subscriptions/${subscriptionId}/payments`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pagamentos da assinatura:', error);
      throw error;
    }
  },

  cancelSubscription: async (subscriptionId, data = {}) => {
    try {
      const response = await api.delete(`/subscriptions/${subscriptionId}`, { data });
      return response.data;
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  },

  // Payments
  getPayment: async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      throw error;
    }
  },

  // Webhooks
  getWebhooks: async () => {
    try {
      const response = await api.get('/webhooks');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar webhooks:', error);
      throw error;
    }
  },

  createWebhook: async (url, events) => {
    try {
      const response = await api.post('/webhooks', {
        url,
        email: import.meta.env.VITE_WEBHOOK_EMAIL,
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        events
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar webhook:', error);
      throw error;
    }
  },

  // Payment Processing
  createPayment: async (data) => {
    try {
      const paymentData = {
        customer: data.customerId,
        billingType: 'CREDIT_CARD',
        value: data.value,
        dueDate: data.dueDate,
        description: data.description,
        creditCardToken: data.creditCardToken,
        postalService: false,
      };

      // Remove campos undefined
      Object.keys(paymentData).forEach(key => 
        paymentData[key] === undefined && delete paymentData[key]
      );

      console.log('Criando pagamento:', {
        ...paymentData,
        creditCardToken: '****' // Ocultando token no log
      });

      const response = await api.post('/payments', paymentData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      throw error;
    }
  }
}; 