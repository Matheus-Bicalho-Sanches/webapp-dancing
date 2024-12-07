import { MercadoPagoConfig, OAuth } from 'mercadopago';
import fs from 'fs/promises';
import path from 'path';

const CLIENT_ID = '6064176381936791';
const CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;

// Função para salvar o token
async function saveToken(tokenData) {
  try {
    const tokenFilePath = path.join(process.cwd(), 'mp_token.json');
    await fs.writeFile(tokenFilePath, JSON.stringify(tokenData, null, 2));
    console.log('[OAuth] Token salvo com sucesso');
  } catch (error) {
    console.error('[OAuth] Erro ao salvar token:', error);
    throw error;
  }
}

// Função para ler o token atual
async function getStoredToken() {
  try {
    const tokenFilePath = path.join(process.cwd(), 'mp_token.json');
    return JSON.parse(await fs.readFile(tokenFilePath, 'utf8'));
  } catch (error) {
    console.error('[OAuth] Erro ao ler token:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Ler o token atual
    const currentToken = await getStoredToken();
    
    if (!currentToken || !currentToken.refresh_token) {
      return res.status(400).json({
        error: 'Token de atualização não encontrado',
        message: 'É necessário realizar uma nova autorização'
      });
    }

    // Configurar cliente do Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
    });

    // Renovar o token
    const oauth = new OAuth(client);
    const response = await oauth.create({
      body: {
        client_secret: CLIENT_SECRET,
        client_id: CLIENT_ID,
        refresh_token: currentToken.refresh_token,
        grant_type: 'refresh_token'
      }
    });

    // Salvar o novo token
    const tokenData = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      user_id: response.user_id,
      expires_in: response.expires_in,
      created_at: new Date().toISOString()
    };

    await saveToken(tokenData);
    console.log('[OAuth] Token renovado com sucesso');

    return res.status(200).json({
      success: true,
      message: 'Token renovado com sucesso'
    });

  } catch (error) {
    console.error('[OAuth] Erro ao renovar token:', error);
    return res.status(500).json({
      error: 'Erro ao renovar token',
      details: error.message
    });
  }
} 