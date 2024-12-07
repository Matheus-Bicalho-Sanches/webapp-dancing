import { getLogs } from './logger';

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const logs = await getLogs();
    
    // Se solicitado em formato HTML
    if (req.headers.accept?.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Logs de Pagamento</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                background: #f5f5f5;
              }
              .log-entry {
                background: white;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 4px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .timestamp {
                color: #666;
                font-size: 0.9em;
              }
              .type {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 3px;
                font-size: 0.8em;
                font-weight: bold;
                margin-left: 10px;
              }
              .type.payment_event { background: #e3f2fd; color: #1565c0; }
              .type.error { background: #ffebee; color: #c62828; }
              .type.redirect { background: #f3e5f5; color: #6a1b9a; }
              .type.webhook { background: #e8f5e9; color: #2e7d32; }
              .data {
                margin-top: 10px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 3px;
                font-family: monospace;
                white-space: pre-wrap;
              }
              h1 {
                color: #333;
                margin-bottom: 20px;
              }
              .refresh {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background: #1976d2;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
              }
              .refresh:hover {
                background: #1565c0;
              }
            </style>
          </head>
          <body>
            <h1>Logs de Pagamento</h1>
            <button class="refresh" onclick="location.reload()">Atualizar</button>
            ${logs.reverse().map(log => `
              <div class="log-entry">
                <span class="timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                <span class="type ${log.type}">${log.type}</span>
                <div class="data">${JSON.stringify(log, null, 2)}</div>
              </div>
            `).join('')}
          </body>
        </html>
      `);
    }

    // Retornar como JSON
    return res.status(200).json(logs);
  } catch (error) {
    console.error('[Logs] Erro ao obter logs:', error);
    return res.status(500).json({ error: 'Erro ao obter logs' });
  }
} 