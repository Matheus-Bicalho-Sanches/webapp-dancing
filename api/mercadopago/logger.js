import fs from 'fs/promises';
import path from 'path';

const LOG_FILE = '/tmp/mp_payment_logs.json';

// Função para formatar data
const getFormattedDate = () => {
  return new Date().toISOString();
};

// Função para salvar logs
async function saveLog(logEntry) {
  try {
    // Tentar ler logs existentes
    let logs = [];
    try {
      const existingLogs = await fs.readFile(LOG_FILE, 'utf8');
      logs = JSON.parse(existingLogs);
    } catch (error) {
      // Se o arquivo não existir, começamos com um array vazio
      console.log('[Logger] Criando novo arquivo de logs');
    }

    // Adicionar novo log
    logs.push({
      timestamp: getFormattedDate(),
      ...logEntry
    });

    // Manter apenas os últimos 100 logs
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }

    // Salvar logs
    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
    console.log('[Logger] Log salvo com sucesso');
  } catch (error) {
    console.error('[Logger] Erro ao salvar log:', error);
  }
}

// Função para ler logs
async function getLogs() {
  try {
    const logs = await fs.readFile(LOG_FILE, 'utf8');
    return JSON.parse(logs);
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