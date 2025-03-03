/**
 * Script para importar dados de planilhas do Google para o Firebase
 * 
 * Este script permite migrar dados de planilhas do Google para as coleções correspondentes no Firebase.
 * Você precisa seguir os passos abaixo para configurá-lo corretamente.
 */

// Importando as dependências necessárias
const admin = require('firebase-admin');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Função para configurar as credenciais do Firebase
function initializeFirebase() {
  try {
    // Caminho para o arquivo de credenciais do Firebase Admin SDK
    // Você deve baixar este arquivo do Console do Firebase
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('\x1b[31mERRO: Arquivo de credenciais do Firebase não encontrado!\x1b[0m');
      console.log('Por favor, siga as instruções abaixo para obter o arquivo:');
      console.log('1. Acesse o console do Firebase: https://console.firebase.google.com/');
      console.log('2. Selecione seu projeto');
      console.log('3. Vá para "Configurações do projeto" -> "Contas de serviço"');
      console.log('4. Clique em "Gerar nova chave privada"');
      console.log('5. Salve o arquivo JSON na raiz do projeto como "serviceAccountKey.json"');
      process.exit(1);
    }
    
    const serviceAccount = require(serviceAccountPath);
    
    // Inicialize o Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('\x1b[32mFirebase inicializado com sucesso!\x1b[0m');
    return admin.firestore();
  } catch (error) {
    console.error('\x1b[31mErro ao inicializar o Firebase:\x1b[0m', error);
    process.exit(1);
  }
}

// Função para configurar as credenciais da API do Google Sheets
async function initializeGoogleSheets() {
  try {
    // Caminho para o arquivo de credenciais da API do Google
    // Você deve baixar este arquivo do Console de Desenvolvedores do Google
    const credentialsPath = path.join(__dirname, '../googleCredentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      console.error('\x1b[31mERRO: Arquivo de credenciais do Google não encontrado!\x1b[0m');
      console.log('Por favor, siga as instruções abaixo para obter o arquivo:');
      console.log('1. Acesse o console de desenvolvedores do Google: https://console.developers.google.com/');
      console.log('2. Crie um novo projeto ou selecione um existente');
      console.log('3. Ative a API do Google Sheets para o projeto');
      console.log('4. Crie credenciais para "Conta de Serviço"');
      console.log('5. Faça o download das credenciais e salve como "googleCredentials.json" na raiz do projeto');
      console.log('6. Compartilhe suas planilhas com o email da conta de serviço que você criou');
      process.exit(1);
    }
    
    const credentials = require(credentialsPath);
    
    // Configure a autenticação JWT
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    
    await auth.authorize();
    
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('\x1b[32mGoogle Sheets API inicializada com sucesso!\x1b[0m');
    return sheets;
  } catch (error) {
    console.error('\x1b[31mErro ao inicializar o Google Sheets API:\x1b[0m', error);
    process.exit(1);
  }
}

// Função para obter dados da planilha
async function getSheetData(sheets, spreadsheetId, range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    return response.data.values;
  } catch (error) {
    console.error(`\x1b[31mErro ao obter dados da planilha:\x1b[0m`, error);
    throw error;
  }
}

// Função para converter dados da planilha para formato adequado ao Firestore
function convertToFirestoreFormat(headers, rows, collectionType) {
  const documents = [];
  
  for (const row of rows) {
    const document = {};
    
    // Para cada coluna, mapeie o valor para o campo correspondente
    for (let i = 0; i < headers.length; i++) {
      if (i < row.length) {
        const header = headers[i];
        let value = row[i];
        
        // Pular campos vazios
        if (value === undefined || value === null || value === '') {
          continue;
        }
        
        // Conversões específicas baseadas no tipo de campo
        if (header.toLowerCase().includes('data') || header.toLowerCase().includes('limite') || 
            header.toLowerCase().includes('execucao') || header.toLowerCase().includes('contato')) {
          // Tenta converter para timestamp se for uma data válida
          try {
            // Verifica se é uma data no formato DD/MM/YYYY
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
              const [day, month, year] = value.split('/').map(Number);
              value = new Date(year, month - 1, day);
            } 
            // Verifica se é uma data no formato YYYY-MM-DD
            else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              value = new Date(value);
            }
            
            // Só converte para timestamp se for uma data válida
            if (!isNaN(value.getTime())) {
              value = admin.firestore.Timestamp.fromDate(value);
            }
          } catch (error) {
            console.warn(`Aviso: Não foi possível converter o valor "${value}" para data.`);
          }
        } 
        // Conversão para array de dias da semana
        else if (header.toLowerCase() === 'diasdasemana' || header.toLowerCase() === 'dias_da_semana') {
          // Se o valor estiver em formato de string CSV ou separado por espaços
          if (typeof value === 'string') {
            if (value.includes(',')) {
              value = value.split(',').map(item => item.trim());
            } else if (value.includes(' ')) {
              value = value.split(' ').filter(item => item.trim() !== '').map(item => item.trim());
            } else {
              // Se for um único valor
              value = [value];
            }
          }
        }
        // Conversão para número
        else if (header.toLowerCase() === 'diames' || header.toLowerCase() === 'dia_mes' || 
                 header.toLowerCase() === 'diasemana' || header.toLowerCase() === 'dia_semana') {
          if (typeof value === 'string' && !isNaN(Number(value))) {
            value = Number(value);
          }
        }
        // Conversão para array de responsáveis
        else if (header.toLowerCase() === 'responsavel' || header.toLowerCase() === 'responsaveis') {
          // Se o valor estiver em formato de string CSV ou separado por espaços
          if (typeof value === 'string') {
            if (value.includes(',')) {
              value = value.split(',').map(item => item.trim());
            } else if (value.includes(' e ')) {
              value = value.split(' e ').map(item => item.trim());
            } else if (value.includes('/')) {
              value = value.split('/').map(item => item.trim());
            } else {
              // Se for um único valor
              value = [value];
            }
          }
        }
        
        document[header] = value;
      }
    }
    
    // Adicione campos comuns necessários
    const now = admin.firestore.FieldValue.serverTimestamp();
    document.createdAt = now;
    document.updatedAt = now;
    
    // Adicionar campos obrigatórios por tipo de coleção
    if (collectionType === 'leads') {
      // Valores padrão para leads
      if (!document.status) document.status = 'Lead';
      document.createdBy = 'import-script';
      document.updatedBy = 'import-script';
    }
    
    if (collectionType.includes('tarefas')) {
      // Valores padrão para tarefas
      if (!document.status) document.status = 'Pendente';
      document.createdBy = 'import-script';
      document.updatedBy = 'import-script';
      
      // Adicionar userId do administrador ou usuário importador
      // Isso pode ser personalizado conforme necessário
      document.userId = 'admin';
    }
    
    documents.push(document);
  }
  
  return documents;
}

// Função para importar dados para o Firestore
async function importToFirestore(db, collectionName, documents) {
  try {
    console.log(`\x1b[34mImportando ${documents.length} documentos para a coleção "${collectionName}"...\x1b[0m`);
    
    let batch = db.batch();
    let count = 0;
    const batchSize = 500; // Limite máximo de operações por batch
    
    for (const doc of documents) {
      const docRef = db.collection(collectionName).doc();
      batch.set(docRef, doc);
      count++;
      
      // Se atingir o limite de batch, comite e crie um novo batch
      if (count >= batchSize) {
        await batch.commit();
        console.log(`\x1b[32m${count} documentos importados para a coleção "${collectionName}"\x1b[0m`);
        count = 0;
        batch = db.batch();
      }
    }
    
    // Comite o batch final se houver operações pendentes
    if (count > 0) {
      await batch.commit();
      console.log(`\x1b[32m${count} documentos finais importados para a coleção "${collectionName}"\x1b[0m`);
    }
    
    console.log(`\x1b[32mImportação concluída! Total de ${documents.length} documentos importados para a coleção "${collectionName}"\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31mErro ao importar para o Firestore:\x1b[0m`, error);
    throw error;
  }
}

// Função para obter a entrada do usuário via linha de comando
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Menu interativo para o usuário
async function interactiveMenu() {
  console.log('\n\x1b[1m=== IMPORTADOR DE PLANILHAS PARA FIREBASE ===\x1b[0m\n');
  
  // Inicializa Firebase e Google Sheets
  const db = initializeFirebase();
  const sheets = await initializeGoogleSheets();
  
  // Obter ID da planilha
  const spreadsheetId = await prompt('Digite o ID da planilha do Google (encontrado na URL): ');
  
  // Obter a lista de abas da planilha
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });
    
    const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
    
    console.log('\nAbas disponíveis na planilha:');
    sheetNames.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });
    
    const sheetIndex = parseInt(await prompt('\nSelecione o número da aba que deseja importar: ')) - 1;
    const selectedSheet = sheetNames[sheetIndex];
    
    if (!selectedSheet) {
      console.error('\x1b[31mAba inválida selecionada!\x1b[0m');
      process.exit(1);
    }
    
    // Obter dados da aba selecionada
    const data = await getSheetData(sheets, spreadsheetId, selectedSheet);
    
    if (!data || data.length < 2) {
      console.error('\x1b[31mDados insuficientes na planilha. Certifique-se de que há pelo menos uma linha de cabeçalho e uma linha de dados.\x1b[0m');
      process.exit(1);
    }
    
    // A primeira linha é considerada o cabeçalho
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log(`\n\x1b[34mEncontrados ${rows.length} registros com os seguintes campos:\x1b[0m`);
    headers.forEach(header => console.log(`- ${header}`));
    
    // Escolher a coleção de destino no Firebase
    console.log('\nColeções disponíveis para importação:');
    console.log('1. leads (CRM)');
    console.log('2. tarefas');
    console.log('3. tarefas_tecnicas');
    console.log('4. tarefas_diarias');
    console.log('5. tarefas_semanais');
    console.log('6. tarefas_mensais');
    console.log('7. tarefas_por_horario');
    console.log('8. Outra (digite o nome)');
    
    const collectionChoice = await prompt('\nSelecione o número da coleção de destino: ');
    
    let collectionName;
    let collectionType;
    
    switch (collectionChoice) {
      case '1':
        collectionName = 'leads';
        collectionType = 'leads';
        break;
      case '2':
        collectionName = 'tarefas';
        collectionType = 'tarefas';
        break;
      case '3':
        collectionName = 'tarefas_tecnicas';
        collectionType = 'tarefas';
        break;
      case '4':
        collectionName = 'tarefas_diarias';
        collectionType = 'tarefas';
        break;
      case '5':
        collectionName = 'tarefas_semanais';
        collectionType = 'tarefas';
        break;
      case '6':
        collectionName = 'tarefas_mensais';
        collectionType = 'tarefas';
        break;
      case '7':
        collectionName = 'tarefas_por_horario';
        collectionType = 'tarefas';
        break;
      case '8':
        collectionName = await prompt('Digite o nome da coleção: ');
        collectionType = collectionName.includes('tarefa') ? 'tarefas' : 'outros';
        break;
      default:
        console.error('\x1b[31mOpção inválida!\x1b[0m');
        process.exit(1);
    }
    
    // Confirmação final
    const confirmation = await prompt(`\nVocê está prestes a importar ${rows.length} registros para a coleção "${collectionName}". Continuar? (s/n): `);
    
    if (confirmation.toLowerCase() !== 's') {
      console.log('\nImportação cancelada pelo usuário.');
      process.exit(0);
    }
    
    // Converter dados para o formato do Firestore
    const documents = convertToFirestoreFormat(headers, rows, collectionType);
    
    // Importar para o Firestore
    await importToFirestore(db, collectionName, documents);
    
    console.log('\n\x1b[32mImportação concluída com sucesso!\x1b[0m');
    
  } catch (error) {
    console.error('\x1b[31mErro durante o processo de importação:\x1b[0m', error);
    process.exit(1);
  }
}

// Executa o menu interativo
interactiveMenu(); 