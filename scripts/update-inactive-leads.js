/**
 * Script para atualizar todos os leads com status "inativo" para "Inativo"
 * Este script corrige a capitalização do status para manter a consistência no banco de dados
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

// Função para configurar as credenciais do Firebase
function initializeFirebase() {
  try {
    // Caminho para o arquivo de credenciais do Firebase Admin SDK
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`${colors.red}ERRO: Arquivo de credenciais do Firebase não encontrado!${colors.reset}`);
      console.log('Por favor, siga as instruções abaixo para obter o arquivo:');
      console.log('1. Acesse o console do Firebase: https://console.firebase.google.com/');
      console.log('2. Selecione seu projeto');
      console.log('3. Vá para "Configurações do projeto" -> "Contas de serviço"');
      console.log('4. Clique em "Gerar nova chave privada"');
      console.log('5. Salve o arquivo JSON na raiz do projeto como "serviceAccountKey.json"');
      process.exit(1);
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    // Inicialize o Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log(`${colors.green}Firebase inicializado com sucesso!${colors.reset}`);
    return admin.firestore();
  } catch (error) {
    console.error(`${colors.red}Erro ao inicializar o Firebase:${colors.reset}`, error);
    process.exit(1);
  }
}

// Função principal para atualizar os leads
async function updateInactiveLeads() {
  console.log(`\n${colors.bold}=== ATUALIZADOR DE STATUS DE LEADS INATIVOS ===${colors.reset}\n`);
  console.log(`Este script irá atualizar todos os leads com status "inativo" para "Inativo" (com I maiúsculo).`);
  console.log(`Isso ajudará a manter a consistência no banco de dados e evitar problemas de filtragem.\n`);
  
  try {
    // Inicializar o Firebase
    const db = initializeFirebase();
    
    // Buscar todos os leads com status "inativo"
    console.log(`${colors.blue}Buscando leads com status "inativo"...${colors.reset}`);
    
    const leadsRef = db.collection('leads');
    const snapshot = await leadsRef.where('status', '==', 'inativo').get();
    
    if (snapshot.empty) {
      console.log(`${colors.yellow}Nenhum lead encontrado com status "inativo".${colors.reset}`);
      return;
    }
    
    const totalLeads = snapshot.size;
    console.log(`${colors.green}Encontrados ${totalLeads} leads com status "inativo".${colors.reset}`);
    
    // Perguntar se deseja continuar
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question(`Deseja atualizar estes ${totalLeads} leads para o status "Inativo"? (s/n): `, (answer) => {
        resolve(answer.toLowerCase());
        rl.close();
      });
    });
    
    if (answer !== 's') {
      console.log(`${colors.yellow}Operação cancelada pelo usuário.${colors.reset}`);
      return;
    }
    
    // Atualizar os leads
    console.log(`${colors.blue}Atualizando ${totalLeads} leads...${colors.reset}`);
    
    let batch = db.batch();
    let count = 0;
    const batchSize = 500; // Limite do Firestore
    
    snapshot.forEach((doc) => {
      const leadRef = db.collection('leads').doc(doc.id);
      
      batch.update(leadRef, {
        status: 'Inativo',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'update-script'
      });
      
      count++;
      
      // Se atingir o limite de batch, comite e crie um novo batch
      if (count >= batchSize) {
        batch.commit().then(() => {
          console.log(`${colors.green}${count} leads atualizados.${colors.reset}`);
        });
        count = 0;
        batch = db.batch();
      }
    });
    
    // Comite o batch final se houver operações pendentes
    if (count > 0) {
      await batch.commit();
      console.log(`${colors.green}${count} leads finais atualizados.${colors.reset}`);
    }
    
    console.log(`${colors.green}Atualização concluída! Total de ${totalLeads} leads atualizados para o status "Inativo".${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Erro ao atualizar leads:${colors.reset}`, error);
    process.exit(1);
  }
}

// Executar a função principal
updateInactiveLeads(); 