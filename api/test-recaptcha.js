import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recaptchaToken } = req.body;
    
    if (!recaptchaToken) {
      return res.status(400).json({ 
        error: 'Token do reCAPTCHA é obrigatório'
      });
    }

    // Validar reCAPTCHA
    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    });

    const recaptchaData = await recaptchaResponse.json();
    console.log('Resposta do reCAPTCHA:', recaptchaData);

    if (!recaptchaData.success) {
      return res.status(400).json({
        error: 'Verificação de segurança falhou',
        details: recaptchaData['error-codes']
      });
    }

    return res.status(200).json({
      success: true,
      message: 'reCAPTCHA validado com sucesso!',
      details: recaptchaData
    });

  } catch (error) {
    console.error('Erro ao validar reCAPTCHA:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
} 