// Armazenamento em memória para os logs
let memoryLogs = [];

// Função para formatar data
const getFormattedDate = () => {
  return new Date().toISOString();
};

// Função para salvar logs
async function saveLog(logEntry) {
  try {
    // Adicionar novo log
    memoryLogs.push({
      timestamp: getFormattedDate(),
      ...logEntry
    });

    // Manter apenas os últimos 100 logs
    if (memoryLogs.length > 100) {
      memoryLogs = memoryLogs.slice(-100);
    }

    console.log('[Logger] Log salvo com sucesso');
  } catch (error) {
    console.error('[Logger] Erro ao salvar log:', error);
  }
}

// Função para ler logs
async function getLogs() {
  try {
    return memoryLogs;
  } catch (error) {
    console.error('[Logger] Erro ao ler logs:', error);
    return [];
  }
}

// Função para registrar evento de pagamento
async function logPaymentEvent(eventType, data) {
  const logEntry = {
    type: 'payment_event',
    event: eventType,
    data
  };
  await saveLog(logEntry);
}

// Função para registrar erro
async function logError(context, error, additionalData = {}) {
  const logEntry = {
    type: 'error',
    context,
    error: {
      message: error.message,
      stack: error.stack,
      ...error
    },
    ...additionalData
  };
  await saveLog(logEntry);
}

// Função para registrar redirecionamento
async function logRedirect(from, to, params) {
  const logEntry = {
    type: 'redirect',
    from,
    to,
    params
  };
  await saveLog(logEntry);
}

// Função para registrar webhook
async function logWebhook(type, data) {
  const logEntry = {
    type: 'webhook',
    webhook_type: type,
    data
  };
  await saveLog(logEntry);
}

export {
  logPaymentEvent,
  logError,
  logRedirect,
  logWebhook,
  getLogs
}; 