/**
 * Script para importar dados de arquivo local (CSV/XLSX) para o Firebase
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import xlsx from 'xlsx';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Função para configurar as credenciais do Firebase
function initializeFirebase() {
  try {
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
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
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

// Função para ler arquivo XLSX
function readXLSXFile(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    console.log('\nAbas disponíveis no arquivo:');
    sheetNames.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });
    
    return { workbook, sheetNames };
  } catch (error) {
    console.error('\x1b[31mErro ao ler arquivo XLSX:\x1b[0m', error);
    process.exit(1);
  }
}

// Função para converter dados para o formato do Firestore
function convertToFirestoreFormat(headers, rows, collectionType) {
  const documents = [];
  
  for (const row of rows) {
    const document = {};
    
    for (let i = 0; i < headers.length; i++) {
      if (i < row.length) {
        const header = headers[i];
        let value = row[i];
        
        if (value === undefined || value === null || value === '') {
          continue;
        }
        
        // Conversões específicas baseadas no tipo de campo
        if (header.toLowerCase().includes('data') || header.toLowerCase().includes('limite') || 
            header.toLowerCase().includes('execucao') || header.toLowerCase().includes('contato')) {
          try {
            let originalValue = value;
            if (typeof value === 'number') {
              // Validar se o número está em um intervalo razoável para datas do Excel
              // Excel começa em 1/1/1900, então números muito grandes provavelmente são erro
              if (value > 1000000) { // Número muito grande para ser uma data do Excel
                console.warn(`Aviso: Campo "${header}" com valor numérico ${value} é muito grande para ser uma data do Excel. Mantendo valor original.`);
                continue;
              }
              
              // Converter número serial do Excel para data
              const excelEpoch = new Date(1900, 0, 1);
              const daysToSubtract = value > 60 ? 2 : 1;
              const milliseconds = (value - daysToSubtract) * 24 * 60 * 60 * 1000;
              value = new Date(excelEpoch.getTime() + milliseconds);
              
              // Validar se a data está dentro dos limites do Firestore
              const minDate = new Date('1677-01-01');
              const maxDate = new Date('2262-12-31');
              if (value < minDate || value > maxDate) {
                console.warn(`Aviso: Data convertida para o campo "${header}" está fora dos limites do Firestore (${value.toISOString()}). Mantendo valor original ${originalValue}.`);
                value = originalValue;
                continue;
              }
            } else if (typeof value === 'string') {
              let dateValue = null;
              
              // Verifica se é uma data no formato DD/MM/YYYY
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                const [day, month, year] = value.split('/').map(Number);
                dateValue = new Date(year, month - 1, day);
              } 
              // Verifica se é uma data no formato YYYY-MM-DD
              else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                dateValue = new Date(value);
              }
              // Verifica se é uma data no formato DD/MM/YY
              else if (/^\d{2}\/\d{2}\/\d{2}$/.test(value)) {
                const [day, month, year] = value.split('/').map(Number);
                const fullYear = year + (year < 50 ? 2000 : 1900);
                dateValue = new Date(fullYear, month - 1, day);
              }
              
              if (dateValue && !isNaN(dateValue.getTime())) {
                // Validar se a data está dentro dos limites do Firestore
                const minDate = new Date('1677-01-01');
                const maxDate = new Date('2262-12-31');
                if (dateValue < minDate || dateValue > maxDate) {
                  console.warn(`Aviso: Data convertida para o campo "${header}" está fora dos limites do Firestore (${dateValue.toISOString()}). Mantendo valor original "${value}".`);
                  continue;
                }
                value = dateValue;
              } else {
                // Se não conseguiu converter para data, mantém o valor original
                console.warn(`Aviso: Valor "${value}" no campo "${header}" não está em um formato de data reconhecido. Mantendo valor original.`);
                continue;
              }
            }
            
            // Só converte para timestamp se for uma data válida
            if (value instanceof Date && !isNaN(value.getTime())) {
              // Normalizar a data para meio-dia UTC para evitar problemas com timezone
              const normalizedDate = new Date(Date.UTC(
                value.getFullYear(),
                value.getMonth(),
                value.getDate(),
                12, 0, 0, 0
              ));
              
              // Criar o timestamp do Firestore
              value = admin.firestore.Timestamp.fromDate(normalizedDate);
              
              // Adicionar campos auxiliares para facilitar a formatação no frontend
              const fieldNameWithoutSuffix = header.replace(/contato$/i, '')
                                                 .replace(/data$/i, '')
                                                 .replace(/limite$/i, '')
                                                 .replace(/execucao$/i, '')
                                                 .trim();
                                                  
              document[`${fieldNameWithoutSuffix}Timestamp`] = value;
              document[`${fieldNameWithoutSuffix}ISO`] = normalizedDate.toISOString();
              document[`${fieldNameWithoutSuffix}Formatted`] = normalizedDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
            }
          } catch (error) {
            console.warn(`Aviso: Erro ao converter valor "${value}" para data no campo "${header}". Mantendo valor original. Erro: ${error.message}`);
            continue;
          }
        } 
        // Conversão para array de dias da semana
        else if (header.toLowerCase() === 'diasdasemana' || header.toLowerCase() === 'dias_da_semana') {
          if (typeof value === 'string') {
            if (value.includes(',')) {
              value = value.split(',').map(item => item.trim());
            } else if (value.includes(' ')) {
              value = value.split(' ').filter(item => item.trim() !== '').map(item => item.trim());
            } else {
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
          if (typeof value === 'string') {
            if (value.includes(',')) {
              value = value.split(',').map(item => item.trim());
            } else if (value.includes(' e ')) {
              value = value.split(' e ').map(item => item.trim());
            } else if (value.includes('/')) {
              value = value.split('/').map(item => item.trim());
            } else {
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
      if (!document.status) document.status = 'Lead';
      document.createdBy = 'import-script';
      document.updatedBy = 'import-script';
    }
    
    if (collectionType.includes('tarefas')) {
      if (!document.status) document.status = 'Pendente';
      document.createdBy = 'import-script';
      document.updatedBy = 'import-script';
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
    const batchSize = 500;
    
    for (const doc of documents) {
      const docRef = db.collection(collectionName).doc();
      batch.set(docRef, doc);
      count++;
      
      if (count >= batchSize) {
        await batch.commit();
        console.log(`\x1b[32m${count} documentos importados para a coleção "${collectionName}"\x1b[0m`);
        count = 0;
        batch = db.batch();
      }
    }
    
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
  console.log('\n\x1b[1m=== IMPORTADOR LOCAL PARA FIREBASE ===\x1b[0m\n');
  
  // Inicializa Firebase
  const db = initializeFirebase();
  
  // Solicitar caminho do arquivo
  console.log('Coloque seu arquivo XLSX na pasta "data" do projeto e digite o nome do arquivo.');
  console.log('Exemplo: Se seu arquivo é "dados.xlsx", digite apenas "dados.xlsx"');
  const fileName = await prompt('\nNome do arquivo XLSX: ');
  
  const filePath = path.join(__dirname, '../data', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error('\x1b[31mArquivo não encontrado! Certifique-se de que o arquivo está na pasta "data".\x1b[0m');
    process.exit(1);
  }
  
  // Ler arquivo XLSX
  const { workbook, sheetNames } = readXLSXFile(filePath);
  
  // Selecionar aba
  const sheetIndex = parseInt(await prompt('\nSelecione o número da aba que deseja importar: ')) - 1;
  const selectedSheet = sheetNames[sheetIndex];
  
  if (!selectedSheet) {
    console.error('\x1b[31mAba inválida selecionada!\x1b[0m');
    process.exit(1);
  }
  
  // Obter dados da aba selecionada
  const worksheet = workbook.Sheets[selectedSheet];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
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
}

// Executa o menu interativo
interactiveMenu(); 