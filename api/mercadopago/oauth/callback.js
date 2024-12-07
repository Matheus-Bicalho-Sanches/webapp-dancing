import { MercadoPagoConfig, OAuth } from 'mercadopago';
import fs from 'fs/promises';
import path from 'path';

const CLIENT_ID = '6064176381936791';
const CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const REDIRECT_URI = 'https://dancing-webapp.com.br/api/mercadopago/oauth/callback';

// Configurar o cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

// Função para salvar o token
async function saveToken(tokenData) {
  try {
    // Tentar diferentes caminhos para salvar o token
    const possiblePaths = [
      path.join(process.cwd(), 'mp_token.json'),
      path.join('/tmp', 'mp_token.json'),
      './mp_token.json'
    ];

    console.log('[OAuth] Tentando salvar token nos seguintes caminhos:', possiblePaths);

    let savedSuccessfully = false;
    let errors = [];

    for (const tokenFilePath of possiblePaths) {
      try {
        console.log(`[OAuth] Tentando salvar em: ${tokenFilePath}`);
        await fs.writeFile(tokenFilePath, JSON.stringify(tokenData, null, 2));
        console.log(`[OAuth] Token salvo com sucesso em: ${tokenFilePath}`);
        savedSuccessfully = true;
        break;
      } catch (err) {
        console.error(`[OAuth] Erro ao salvar em ${tokenFilePath}:`, err);
        errors.push({ path: tokenFilePath, error: err.message });
      }
    }

    if (!savedSuccessfully) {
      throw new Error(`Falha ao salvar token em todos os caminhos. Erros: ${JSON.stringify(errors)}`);
    }

    // Tentar ler o arquivo para confirmar
    for (const tokenFilePath of possiblePaths) {
      try {
        const content = await fs.readFile(tokenFilePath, 'utf8');
        console.log(`[OAuth] Conteúdo do arquivo ${tokenFilePath}:`, content);
      } catch (err) {
        console.log(`[OAuth] Não foi possível ler ${tokenFilePath}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[OAuth] Erro ao salvar token:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { code, error } = req.query;

  if (error) {
    console.error('[OAuth] Erro na autorização:', error);
    return res.status(400).json({ error: 'Erro na autorização' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Código de autorização não fornecido' });
  }

  try {
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

    // Salvar o token
    const tokenData = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      user_id: response.user_id,
      expires_in: response.expires_in,
      created_at: new Date().toISOString()
    };

    await saveToken(tokenData);
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
    res.status(500).json({ error: 'Erro ao obter token de acesso' });
  }
} 