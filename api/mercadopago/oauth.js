import { MercadoPagoConfig, OAuth } from 'mercadopago';

const CLIENT_ID = '6064176381936791'; // ID da aplicação que aparece na sua tela
const REDIRECT_URI = 'https://dancing-webapp.com.br/api/mercadopago/oauth/callback';

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