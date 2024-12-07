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
  if (req.method === 'GET') {
    // Gerar URL de autorização
    const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${CLIENT_ID}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    
    // Redirecionar para a página de autorização do Mercado Pago
    res.redirect(authUrl);
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
} 