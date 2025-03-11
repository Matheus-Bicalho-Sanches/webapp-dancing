/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { OpenAI } = require("openai");
const express = require("express");
const cors = require("cors");

// Carregar variáveis de ambiente quando em desenvolvimento local
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv não encontrado, usando variáveis de ambiente do sistema');
}

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Inicializar o app do Firebase Admin
admin.initializeApp();

// Inicializar o Firestore
const db = admin.firestore();

// Obter a chave da API OpenAI
const apiKey = process.env.OPENAI_API_KEY;

console.log('Configurando API OpenAI');

// Inicializar a API da OpenAI com a chave da variável de ambiente
const openai = new OpenAI({
  apiKey: apiKey,
});

// Modelo de IA a ser usado - usando o3-mini para melhor custo-benefício e mais rápido
const AI_MODEL = "o3-mini";
// Modelo de fallback em caso de erro
const FALLBACK_MODEL = "gpt-4o-mini";
// Lista de modelos alternativos em ordem de preferência
const ALTERNATIVE_MODELS = ["o3-mini", "gpt-4o-mini", "gpt-4o", "gpt-4-turbo"];

// Criar app Express
const app = express();

// Configuração CORS mais detalhada
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'https://webapp-dancing.web.app', 
    'https://webapp-dancing.firebaseapp.com',
    'https://dancing-webapp.com.br',
    'https://www.dancing-webapp.com.br'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // cache preflight por 24 horas
};

// Aplicar CORS com as opções detalhadas
app.use(cors(corsOptions));

// Middleware para JSON
app.use(express.json());

// Função para encontrar um modelo disponível
async function findAvailableModel() {
  // Por padrão, tente usar o modelo principal
  if (process.env.FORCE_MODEL) {
    console.log(`Usando modelo forçado por variável de ambiente: ${process.env.FORCE_MODEL}`);
    return process.env.FORCE_MODEL;
  }
  
  // Manter controle de modelos testados
  const modelsAvailability = {};
  
  // Criar uma mensagem de teste simples
  const testMessage = {
    role: "user",
    content: "Teste de disponibilidade do modelo"
  };
  
  // Testar o modelo principal primeiro
  try {
    console.log(`Testando disponibilidade do modelo: ${AI_MODEL}`);
    
    // Tente criar uma pequena solicitação para verificar a disponibilidade
    const modelConfig = {};
    if (AI_MODEL === "o3-mini") {
      modelConfig.reasoning_effort = "low"; // Usar 'low' para o teste (mais rápido)
    }
    
    await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [testMessage],
      max_tokens: 5,
      ...modelConfig
    });
    
    console.log(`Modelo ${AI_MODEL} está disponível!`);
    return AI_MODEL;
  } catch (error) {
    console.log(`Modelo ${AI_MODEL} não está disponível: ${error.message}`);
    modelsAvailability[AI_MODEL] = false;
  }
  
  // Se o modelo principal não estiver disponível, tente alternativas
  for (const model of ALTERNATIVE_MODELS) {
    // Pule o modelo principal que já foi testado
    if (model === AI_MODEL || modelsAvailability[model] === false) {
      continue;
    }
    
    try {
      console.log(`Testando disponibilidade do modelo alternativo: ${model}`);
      
      // Tente criar uma pequena solicitação para verificar a disponibilidade
      const modelConfig = {};
      if (model === "o3-mini") {
        modelConfig.reasoning_effort = "low";
      }
      
      await openai.chat.completions.create({
        model: model,
        messages: [testMessage],
        max_tokens: 5,
        ...modelConfig
      });
      
      console.log(`Modelo alternativo ${model} está disponível!`);
      return model;
    } catch (error) {
      console.log(`Modelo ${model} não está disponível: ${error.message}`);
      modelsAvailability[model] = false;
    }
  }
  
  // Se nenhum modelo estiver disponível, use o último recurso
  console.log("Nenhum modelo da lista está disponível. Usando gpt-3.5-turbo como último recurso.");
  return "gpt-3.5-turbo";
}

// Rota para processar perguntas da IA
app.post("/query", async (req, res) => {
  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verificar o token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const uid = decodedToken.uid;

    // Verificar se o usuário é do tipo master
    const userSnapshot = await db.collection("users").doc(uid).get();
    if (!userSnapshot.exists) {
      return res.status(403).json({ error: 'Usuário não encontrado' });
    }

    const userData = userSnapshot.data();
    if (userData.userType !== "master") {
      return res.status(403).json({ error: 'Apenas usuários master podem acessar essa funcionalidade' });
    }

    // Obter a pergunta e o ID da conversa do corpo da requisição
    const { question, conversationId } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'A pergunta é obrigatória' });
    }

    console.log(`Processando pergunta: ${question}`);

    // Verificar quais modelos estão disponíveis
    const availableModel = await findAvailableModel();
    console.log(`Modelo disponível escolhido: ${availableModel}`);

    // Registrar a consulta no histórico
    const queryRef = await db.collection("ai_queries").add({
      userId: uid,
      question,
      timestamp: new Date(),
      conversationId: conversationId || null,
    });

    // Função para buscar tarefas por funcionário
    async function fetchTasksByEmployee() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar tarefas do dia atual
      const tasksSnapshot = await db.collection("tarefas").get();
      const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Buscar tarefas diárias
      const dailyTasksSnapshot = await db.collection("tarefas_diarias").get();
      const dailyTasks = dailyTasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Buscar tarefas por horário
      const scheduledTasksSnapshot = await db.collection("tarefas_por_horario").get();
      const scheduledTasks = scheduledTasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Buscar informações dos usuários
      const usersSnapshot = await db.collection("users").get();
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Buscar task_logs para verificar quais tarefas foram concluídas
      const taskLogsSnapshot = await db.collection("task_logs").where("data", ">=", today).get();
      const taskLogs = taskLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return {
        tasks,
        dailyTasks,
        scheduledTasks,
        users,
        taskLogs
      };
    }

    // Função para buscar tarefas atrasadas
    async function fetchOverdueTasks() {
      const today = new Date();
      
      // Buscar tarefas com prazo limite menor que hoje e status diferente de "Finalizada"
      const tasksSnapshot = await db
        .collection("tarefas")
        .where("status", "!=", "Finalizada")
        .get();
      
      const tasks = tasksSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(task => {
          // Verificar se tem prazoLimite e se está no passado
          if (task.prazoLimite) {
            const deadline = task.prazoLimite.toDate ? task.prazoLimite.toDate() : new Date(task.prazoLimite);
            return deadline < today;
          }
          return false;
        });

      return { tasks };
    }

    // Função para buscar dados de renovação de clientes
    async function fetchClientRenewalRate() {
      // Buscar matrículas
      const matriculasSnapshot = await db.collection("matriculas").get();
      const matriculas = matriculasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Buscar pagamentos
      const pagamentosSnapshot = await db.collection("pagamentos").get();
      const pagamentos = pagamentosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Buscar alunos
      const alunosSnapshot = await db.collection("alunos").get();
      const alunos = alunosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return {
        matriculas,
        pagamentos,
        alunos
      };
    }

    // Função para buscar todos os dados do Firebase
    async function fetchAllFirebaseData() {
      console.log("Buscando todos os dados do Firebase...");
      
      // Lista completa de coleções para buscar (baseada na imagem e nas mencionadas)
      const collections = [
        "agendamentos",
        "ai_conversations",
        "ai_queries",
        "alunos",
        "leads",
        "logs",
        "matriculas",
        "movimentacoes",
        "pagamentos",
        "planos",
        "produtos",
        "professores",
        "tarefas",
        "tarefas_diarias",
        "tarefas_mensais",
        "tarefas_por_horario",
        "tarefas_semanais",
        "tarefas_tecnicas",
        "task_logs",
        "teacherSchedules",
        "turmasData",
        "uniform_sales",
        "uniforms",
        "users",
        "vendas",
        "valores_aulas",
      ];
      
      const result = {};
      
      // Buscar dados de cada coleção
      for (const collectionName of collections) {
        try {
          console.log(`Buscando dados da coleção: ${collectionName}`);
          const snapshot = await db.collection(collectionName).get();
          
          if (!snapshot.empty) {
            // Limitar a quantidade de documentos para evitar estouro de memória
            const maxDocs = 100;
            const docs = snapshot.docs.slice(0, maxDocs).map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Adicionar os dados ao resultado
            result[collectionName] = docs;
            
            console.log(`Obtidos ${docs.length} documentos da coleção ${collectionName}`);
            
            // Se houver mais documentos que o limite, adicionar uma informação
            if (snapshot.docs.length > maxDocs) {
              console.log(`Limitando a ${maxDocs} documentos de ${snapshot.docs.length} na coleção ${collectionName}`);
              result[`${collectionName}_info`] = {
                total_documents: snapshot.docs.length,
                showing: maxDocs,
                truncated: true
              };
            }
          } else {
            console.log(`Coleção ${collectionName} está vazia`);
            result[collectionName] = [];
          }
        } catch (error) {
          console.error(`Erro ao buscar dados da coleção ${collectionName}:`, error);
          result[`${collectionName}_error`] = {
            message: error.message,
            code: error.code
          };
        }
      }
      
      return result;
    }

    // Função para buscar estatísticas resumidas das coleções
    async function fetchCollectionStats() {
      console.log("Buscando estatísticas das coleções...");
      
      // Lista completa de coleções para buscar estatísticas
      const collections = [
        "agendamentos",
        "ai_conversations",
        "ai_queries",
        "alunos",
        "leads",
        "logs",
        "matriculas",
        "movimentacoes",
        "pagamentos",
        "planos",
        "produtos",
        "professores",
        "tarefas",
        "tarefas_diarias",
        "tarefas_mensais",
        "tarefas_por_horario",
        "tarefas_semanais",
        "tarefas_tecnicas",
        "task_logs",
        "teacherSchedules",
        "turmasData",
        "uniform_sales",
        "uniforms",
        "users",
        "vendas",
        "valores_aulas",
      ];
      
      const stats = {};
      
      for (const collectionName of collections) {
        try {
          const snapshot = await db.collection(collectionName).get();
          stats[collectionName] = {
            document_count: snapshot.size,
            exists: snapshot.size > 0
          };
          
          // Se a coleção não estiver vazia, adicione algumas amostras
          if (snapshot.size > 0) {
            // Adicionar até 5 documentos como exemplo
            const sampleDocs = snapshot.docs.slice(0, 5).map(doc => ({ id: doc.id, ...doc.data() }));
            stats[`${collectionName}_samples`] = sampleDocs;
            
            // Adicionar estrutura do primeiro documento (campos disponíveis)
            if (snapshot.docs[0]) {
              const firstDoc = snapshot.docs[0].data();
              const fields = Object.keys(firstDoc);
              stats[`${collectionName}_fields`] = fields;
            }
          }
        } catch (error) {
          console.error(`Erro ao buscar estatísticas da coleção ${collectionName}:`, error);
          stats[`${collectionName}_error`] = error.message;
        }
      }
      
      return stats;
    }

    // Buscar todos os dados disponíveis - sempre busca todas as coleções independentemente da pergunta
    console.log("Buscando todos os dados do Firebase para análise completa");
    const allData = await fetchAllFirebaseData();
    
    // Usar todos os dados para responder à pergunta
    const data = allData;

    // Enviar pergunta e dados para a OpenAI
    try {
      console.log(`Tentando usar o modelo: ${availableModel}`);
      
      // Configuração específica para o modelo o3-mini
      const modelConfig = {};
      
      // O modelo o3-mini aceita o parâmetro reasoning_effort
      if (availableModel === "o3-mini") {
        modelConfig.reasoning_effort = "medium"; // Pode ser "high", "medium" ou "low"
      }
      
      const completion = await openai.chat.completions.create({
        model: availableModel,
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em analisar dados de uma escola de patinação. 
            Você tem acesso direto a todas as coleções do banco de dados Firebase, incluindo:
            - agendamentos: agendamentos de aulas e eventos
            - ai_conversations: histórico de conversas com a IA
            - ai_queries: consultas feitas à IA
            - alunos: dados dos alunos matriculados
            - leads: leads que entraram no funil de vendas, incluindo leads que se matricularam e que não se matricularam
            - logs: logs de atividades envolvendo os leads;
            - professores: informações sobre os professores
            - aulas: detalhes sobre aulas agendadas e realizadas
            - matriculas: registros de matrículas de alunos
            - movimentacoes: Mensalidades pagas via cartão de crédito com API do Asaas;
            - pagamentos: histórico de pagamentos realizados por um aluno
            - planos: planos oferecidos pela escola
            - produtos: produtos vendidos pela escola
            - professores: informações sobre os professores que dão aulas individuais
            - tarefas: tarefas não recorrentes a serem realizadas
            - tarefas_diarias: tarefas que se repetem diariamente
            - tarefas_mensais: tarefas que se repetem mensalmente
            - tarefas_por_horario: tarefas organizadas por horário
            - tarefas_semanais: tarefas que se repetem semanalmente
            - tarefas_tecnicas: Tarefas não recorrentes da equipe técnica (professores)
            - teacherSchedules: Disponibilidade de horários para aulas individuais dos professores
            - turmasData: informações sobre as turmas
            - uniform_sales: vendas de uniformes
            - uniforms: cadastro de uniformes e outros produtos do Ateliê disponíveis
            - users: usuários do sistema
            - vendas: registro de vendas realizadas
            - valores_aulas: preços e valores das aulas individuais
            - task_logs: registros de execução de tarefas
            - vendas: Vendas de produtos da cantina
            
            IMPORTANTE: Você agora tem acesso direto a TODAS as coleções simultaneamente. É sua responsabilidade analisar quais coleções contêm as informações relevantes para responder cada pergunta específica.
            
            Por exemplo:
            - Para perguntas sobre mensalidades atrasadas, você deve verificar as coleções "pagamentos" e "movimentacoes"
            - Para perguntas sobre tarefas, verifique as coleções "tarefas", "tarefas_diarias", etc.
            - Para perguntas sobre vendas, consulte as coleções "vendas" e "uniform_sales"
            
            Responda com base nos dados fornecidos, de forma clara e objetiva. Se necessitar de dados que não foram disponibilizados, mencione isso na sua resposta.
            
            Quando for solicitado a mostrar estatísticas ou resumos de coleções, formate os dados em tabelas para melhor visualização. 
            
            Na sua resposta, não liste todos os documentos de uma coleção, a menos que seja explicitamente solicitado ou que a quantidade seja pequena. Prefira apresentar contagens, estatísticas e exemplos representativos.
            
            IMPORTANTE: Sempre explique seu raciocínio de forma detalhada. Divida sua resposta em duas seções:
            
            1. RACIOCÍNIO: Explique como chegou à resposta, quais dados analisou, como interpretou os resultados, etc.
            2. RESPOSTA FINAL: A resposta direta à pergunta do usuário.
            
            Use formatação markdown para separar as seções com títulos claros.`
          },
          {
            role: "user",
            content: `Baseado nos seguintes dados: ${JSON.stringify(data)}, responda à pergunta: ${question}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.5,
        ...modelConfig
      });

      // Obter a resposta da OpenAI
      const aiResponse = completion.choices[0].message.content;

      // Salvar a conversa no Firestore
      let conversationRef;
      if (conversationId) {
        // Adicionar à conversa existente
        conversationRef = db.collection("ai_conversations").doc(conversationId);
        
        await conversationRef.update({
          updatedAt: new Date(),
          messages: admin.firestore.FieldValue.arrayUnion({
            role: "user",
            content: question,
            timestamp: new Date()
          }, {
            role: "assistant",
            content: aiResponse,
            timestamp: new Date()
          })
        });
      } else {
        // Criar nova conversa
        conversationRef = await db.collection("ai_conversations").add({
          userId: uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [
            {
              role: "user",
              content: question,
              timestamp: new Date()
            },
            {
              role: "assistant",
              content: aiResponse,
              timestamp: new Date()
            }
          ]
        });
      }
      
      // Atualizar a consulta no histórico
      await queryRef.update({
        aiResponse: aiResponse,
        conversationId: conversationRef.id,
        modelUsed: availableModel
      });
      
      // Enviar resposta
      return res.json({
        answer: aiResponse,
        conversationId: conversationRef.id,
        modelUsed: availableModel
      });
    } catch (openaiError) {
      console.error("Erro na API da OpenAI:", openaiError);
      
      // Registrar mais detalhes do erro para diagnóstico
      if (openaiError.response) {
        console.error("Detalhes do erro da API:", {
          status: openaiError.response.status,
          data: openaiError.response.data,
          headers: openaiError.response.headers
        });
      } else if (openaiError.message) {
        console.error("Mensagem de erro:", openaiError.message);
      }
      
      // Se houver erro na API do OpenAI, tentar com o modelo de fallback
      if (availableModel !== FALLBACK_MODEL) {
        console.log(`Tentando com modelo de fallback ${FALLBACK_MODEL}`);
        
        const backupCompletion = await openai.chat.completions.create({
          model: FALLBACK_MODEL,
          messages: [
            {
              role: "system",
              content: `Você é um assistente especializado em analisar dados de uma escola de patinação. 
            Você tem acesso direto a todas as coleções do banco de dados Firebase, incluindo:
            - agendamentos: agendamentos de aulas e eventos
            - ai_conversations: histórico de conversas com a IA
            - ai_queries: consultas feitas à IA
            - alunos: dados dos alunos matriculados
            - leads: leads que entraram no funil de vendas, incluindo leads que se matricularam e que não se matricularam
            - logs: logs de atividades envolvendo os leads;
            - professores: informações sobre os professores
            - aulas: detalhes sobre aulas agendadas e realizadas
            - matriculas: registros de matrículas de alunos
            - movimentacoes: Mensalidades pagas via cartão de crédito com API do Asaas;
            - pagamentos: histórico de pagamentos realizados por um aluno
            - planos: planos oferecidos pela escola
            - produtos: produtos vendidos pela escola
            - professores: informações sobre os professores que dão aulas individuais
            - tarefas: tarefas não recorrentes a serem realizadas
            - tarefas_diarias: tarefas que se repetem diariamente
            - tarefas_mensais: tarefas que se repetem mensalmente
            - tarefas_por_horario: tarefas organizadas por horário
            - tarefas_semanais: tarefas que se repetem semanalmente
            - tarefas_tecnicas: Tarefas não recorrentes da equipe técnica (professores)
            - teacherSchedules: Disponibilidade de horários para aulas individuais dos professores
            - turmasData: informações sobre as turmas
            - uniform_sales: vendas de uniformes
            - uniforms: cadastro de uniformes e outros produtos do Ateliê disponíveis
            - users: usuários do sistema
            - vendas: registro de vendas realizadas
            - valores_aulas: preços e valores das aulas individuais
            - task_logs: registros de execução de tarefas
            - vendas: Vendas de produtos da cantina
            
            IMPORTANTE: Você agora tem acesso direto a TODAS as coleções simultaneamente. É sua responsabilidade analisar quais coleções contêm as informações relevantes para responder cada pergunta específica.
            
            Por exemplo:
            - Para perguntas sobre mensalidades atrasadas, você deve verificar as coleções "pagamentos" e "movimentacoes"
            - Para perguntas sobre tarefas, verifique as coleções "tarefas", "tarefas_diarias", etc.
            - Para perguntas sobre vendas, consulte as coleções "vendas" e "uniform_sales"
            
            Responda com base nos dados fornecidos, de forma clara e objetiva. Se necessitar de dados que não foram disponibilizados, mencione isso na sua resposta.
            
            Quando for solicitado a mostrar estatísticas ou resumos de coleções, formate os dados em tabelas para melhor visualização. 
            
            Na sua resposta, não liste todos os documentos de uma coleção, a menos que seja explicitamente solicitado ou que a quantidade seja pequena. Prefira apresentar contagens, estatísticas e exemplos representativos.
            
            IMPORTANTE: Sempre explique seu raciocínio de forma detalhada. Divida sua resposta em duas seções:
            
            1. RACIOCÍNIO: Explique como chegou à resposta, quais dados analisou, como interpretou os resultados, etc.
            2. RESPOSTA FINAL: A resposta direta à pergunta do usuário.
            
            Use formatação markdown para separar as seções com títulos claros.`
          },
            {
              role: "user",
              content: `Baseado nos seguintes  dados: ${JSON.stringify(data)}, responda à pergunta: ${question}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.5,
        });
        
        const backupResponse = backupCompletion.choices[0].message.content;
        
        // Salvar a conversa no Firestore com a resposta do modelo de fallback
        let conversationRef;
        if (conversationId) {
          conversationRef = db.collection("ai_conversations").doc(conversationId);
          await conversationRef.update({
            messages: admin.firestore.FieldValue.arrayUnion({
              role: "user",
              content: question,
              timestamp: new Date()
            }, {
              role: "assistant",
              content: backupResponse,
              timestamp: new Date()
            }),
            updatedAt: new Date(),
            usedBackupModel: true
          });
        } else {
          conversationRef = await db.collection("ai_conversations").add({
            userId: uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            usedBackupModel: true,
            messages: [
              {
                role: "user",
                content: question,
                timestamp: new Date()
              },
              {
                role: "assistant",
                content: backupResponse,
                timestamp: new Date()
              }
            ]
          });
        }
        
        await queryRef.update({
          aiResponse: backupResponse,
          conversationId: conversationRef.id,
          usedBackupModel: true,
          modelUsed: FALLBACK_MODEL
        });
        
        return res.json({
          answer: backupResponse,
          conversationId: conversationRef.id,
          usedBackupModel: FALLBACK_MODEL,
          modelUsed: FALLBACK_MODEL
        });
      }
      
      return res.status(500).json({ error: 'Erro ao processar a resposta da IA: ' + openaiError.message });
    }
  } catch (error) {
    console.error("Erro na função queryAI:", error);
    return res.status(500).json({ error: 'Erro interno: ' + error.message });
  }
});

// Exportar a função HTTP
exports.queryAI = functions.https.onRequest(app);
