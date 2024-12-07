import { MercadoPagoConfig, OAuth } from 'mercadopago';

const CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_API_URL}/api/mercadopago/oauth/callback`;

// Configurar o cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET
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

    // Redirecionar para uma página de sucesso
    res.redirect('/oauth-success');
  } catch (error) {
    console.error('[OAuth] Erro ao obter token:', error);
    res.status(500).json({ error: 'Erro ao obter token de acesso' });
  }
} 