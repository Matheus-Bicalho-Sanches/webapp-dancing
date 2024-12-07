import { MercadoPagoConfig, OAuth } from 'mercadopago';
import fs from 'fs/promises';
import path from 'path';

const CLIENT_ID = '6064176381936791';
const CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const REDIRECT_URI = 'https://dancing-webapp.com.br/api/mercadopago/oauth/callback';
const TOKEN_FILE_PATH = '/tmp/mp_token.json';

// Configurar o cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

// Função para salvar o token
async function saveToken(tokenData) {
  try {
    console.log('[OAuth] Salvando token em:', TOKEN_FILE_PATH);
    await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2));
    console.log('[OAuth] Token salvo com sucesso');
    
    // Verificar se o arquivo foi salvo corretamente
    try {
      const content = await fs.readFile(TOKEN_FILE_PATH, 'utf8');
      console.log('[OAuth] Conteúdo do arquivo:', content);
      return true;
    } catch (err) {
      console.error('[OAuth] Erro ao ler arquivo após salvar:', err);
      return false;
    }
  } catch (error) {
    console.error('[OAuth] Erro ao salvar token:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  console.log('[OAuth] Callback recebido:', {
    method: req.method,
    query: req.query,
    headers: req.headers
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { code, error } = req.query;

  if (error) {
    console.error('[OAuth] Erro na autorização:', error);
    return res.status(400).json({ error: 'Erro na autorização', details: error });
  }

  if (!code) {
    console.error('[OAuth] Código de autorização não fornecido');
    return res.status(400).json({ error: 'Código de autorização não fornecido' });
  }

  try {
    console.log('[OAuth] Iniciando troca de código por token');
    
    // Trocar o código de autorização por um token de acesso
    const oauth = new OAuth(client);
    const response = await oauth.create({
      body: {
        client_secret: CLIENT_SECRET,
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }
    });

    console.log('[OAuth] Resposta do Mercado Pago:', JSON.stringify(response, null, 2));

    if (!response || !response.access_token) {
      console.error('[OAuth] Resposta inválida do Mercado Pago');
      return res.status(500).json({ 
        error: 'Resposta inválida do Mercado Pago',
        response: response 
      });
    }

    // Salvar o token
    const tokenData = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      user_id: response.user_id,
      expires_in: response.expires_in,
      created_at: new Date().toISOString()
    };

    const saved = await saveToken(tokenData);
    if (!saved) {
      console.error('[OAuth] Falha ao salvar o token');
      return res.status(500).json({ error: 'Falha ao salvar o token' });
    }

    console.log('[OAuth] Token obtido e salvo com sucesso:', { user_id: tokenData.user_id });

    // Retornar uma página HTML com a mensagem de sucesso
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Autorização Concluída</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              max-width: 600px;
              width: 90%;
            }
            .success-icon {
              color: #4CAF50;
              font-size: 48px;
              margin-bottom: 16px;
            }
            .details {
              margin-top: 20px;
              padding: 15px;
              background: #f9f9f9;
              border-radius: 4px;
              text-align: left;
            }
            .details code {
              background: #eee;
              padding: 2px 5px;
              border-radius: 3px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Autorização Concluída com Sucesso!</h1>
            <p>A integração com o Mercado Pago foi configurada corretamente.</p>
            <div class="details">
              <p><strong>User ID:</strong> <code>${tokenData.user_id}</code></p>
              <p><strong>Status:</strong> Token salvo e pronto para uso</p>
              <p><strong>Próximos passos:</strong> Você pode fechar esta janela e voltar para a aplicação.</p>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('[OAuth] Erro ao obter token:', error);
    console.error('[OAuth] Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Erro ao obter token de acesso',
      message: error.message,
      details: error.response?.data || error
    });
  }
} 