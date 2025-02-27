// Script para ser executado durante o build no Vercel
const fs = require('fs');
const path = require('path');

// Função para copiar o arquivo _redirects para a pasta dist
function copyRedirectsFile() {
  const publicDir = path.resolve(__dirname, 'public');
  const distDir = path.resolve(__dirname, 'dist');
  
  // Verifica se a pasta dist existe
  if (!fs.existsSync(distDir)) {
    console.log('❌ Pasta dist não encontrada');
    return;
  }
  
  // Verifica se o arquivo _redirects existe na pasta public
  const redirectsPath = path.resolve(publicDir, '_redirects');
  if (fs.existsSync(redirectsPath)) {
    // Copia o arquivo para a pasta dist
    fs.copyFileSync(redirectsPath, path.resolve(distDir, '_redirects'));
    console.log('✅ Arquivo _redirects copiado para a pasta dist');
  } else {
    // Cria o arquivo _redirects na pasta dist
    fs.writeFileSync(path.resolve(distDir, '_redirects'), '/* /index.html 200');
    console.log('✅ Arquivo _redirects criado na pasta dist');
  }
}

// Executa a função
copyRedirectsFile(); 