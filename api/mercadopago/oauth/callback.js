import { MercadoPagoConfig, OAuth } from 'mercadopago';

const CLIENT_ID = '6064176381936791';
const CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const REDIRECT_URI = 'https://dancing-webapp.com.br/api/mercadopago/oauth/callback';

// Configurar o cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

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

    // Salvar o token (você deve implementar isso de acordo com sua necessidade)
    const { access_token, refresh_token, user_id } = response;
    console.log('[OAuth] Token obtido com sucesso:', { user_id, access_token });

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
            }
            .success-icon {
              color: #4CAF50;
              font-size: 48px;
              margin-bottom: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Autorização Concluída com Sucesso!</h1>
            <p>Você pode fechar esta janela e voltar para a aplicação.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('[OAuth] Erro ao obter token:', error);
    res.status(500).json({ error: 'Erro ao obter token de acesso' });
  }
} 