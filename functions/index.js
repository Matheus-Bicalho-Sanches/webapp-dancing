/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall } = require("firebase-functions/v2/https");
const { HttpsError } = require("firebase-functions/v1/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { OpenAI } = require("openai");
const cors = require('cors')({ origin: true });

// Carregar variáveis de ambiente quando em desenvolvimento local
try {
  require('dotenv').config();
} catch (error) {
  // Ignorar erro se o dotenv não estiver disponível
  logger.info('dotenv não encontrado, usando variáveis de ambiente do sistema');
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

// Obter a chave da API OpenAI de várias fontes possíveis
const apiKey = process.env.OPENAI_API_KEY;

logger.info('Configurando API OpenAI');

// Inicializar a API da OpenAI com a chave da variável de ambiente
const openai = new OpenAI({
  apiKey: apiKey,
});

// Modelo de IA a ser usado - você pode alterar para "gpt-3.5-turbo" se preferir
const AI_MODEL = "gpt-4o";

/**
 * Função que recebe uma pergunta, busca dados relevantes no Firestore
 * e usa a API da OpenAI para gerar uma resposta
 */
exports.queryAI = onCall({ 
  enforceAppCheck: false,
  cors: true, // Habilitando CORS para todas as origens
  region: 'us-central1',
  timeout: 300, // Aumentando o timeout para 5 minutos
  maxInstances: 5, // Limitando a 5 instâncias para controle de custos
}, async (request) => {
  try {
    // Verificar autenticação
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "O usuário precisa estar autenticado para usar esta função."
      );
    }

    // Verificar se o usuário é do tipo master
    const userSnapshot = await db.collection("users").doc(request.auth.uid).get();
    if (!userSnapshot.exists) {
      throw new HttpsError("permission-denied", "Usuário não encontrado.");
    }

    const userData = userSnapshot.data();
    if (userData.userType !== "master") {
      throw new HttpsError(
        "permission-denied",
        "Apenas usuários master podem acessar essa funcionalidade."
      );
    }

    // Obter a pergunta da requisição
    const { question, conversationId } = request.data;
    if (!question) {
      throw new HttpsError("invalid-argument", "A pergunta é obrigatória.");
    }

    logger.info(`Processando pergunta: ${question}`);

    // Registrar a consulta no histórico
    const queryRef = await db.collection("ai_queries").add({
      userId: request.auth.uid,
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

    // Determinar qual função de busca usar baseado na pergunta
    let data = {};
    if (question.toLowerCase().includes("tarefa") && question.toLowerCase().includes("funcionário")) {
      data = await fetchTasksByEmployee();
    } else if (question.toLowerCase().includes("atrasada")) {
      data = await fetchOverdueTasks();
    } else if (question.toLowerCase().includes("renovação") || question.toLowerCase().includes("cliente")) {
      data = await fetchClientRenewalRate();
    } else {
      // Se não identificar o tipo específico, buscar dados gerais
      const tasksData = await fetchTasksByEmployee();
      const overdueData = await fetchOverdueTasks();
      const renewalData = await fetchClientRenewalRate();
      
      data = {
        ...tasksData,
        overdueTasks: overdueData.tasks,
        ...renewalData
      };
    }

    // Enviar pergunta e dados para a OpenAI
    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em analisar dados de uma escola de patinação. Responda apenas com base nos dados fornecidos."
          },
          {
            role: "user",
            content: `Baseado nos seguintes dados: ${JSON.stringify(data)}, responda à pergunta: ${question}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.5,
      });

      // Obter a resposta da OpenAI
      const aiResponse = completion.choices[0].message.content;

      // Salvar a conversa no Firestore
      let conversationRef;
      if (conversationId) {
        // Adicionar à conversa existente
        conversationRef = db.collection("ai_conversations").doc(conversationId);
        await conversationRef.update({
          messages: admin.firestore.FieldValue.arrayUnion({
            role: "user",
            content: question,
            timestamp: new Date()
          }, {
            role: "assistant",
            content: aiResponse,
            timestamp: new Date()
          }),
          updatedAt: new Date()
        });
      } else {
        // Criar nova conversa
        conversationRef = await db.collection("ai_conversations").add({
          userId: request.auth.uid,
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

      // Atualizar o registro da consulta com a referência da conversa
      await queryRef.update({
        aiResponse,
        conversationId: conversationRef.id
      });

      // Retornar a resposta
      return {
        answer: aiResponse,
        conversationId: conversationRef.id
      };
    } catch (openaiError) {
      logger.error("Erro na API da OpenAI:", openaiError);
      
      // Se houver erro na API do OpenAI, tentar com o modelo de backup
      if (AI_MODEL !== "gpt-3.5-turbo") {
        logger.info("Tentando com modelo de backup gpt-3.5-turbo");
        
        const backupCompletion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "Você é um assistente especializado em analisar dados de uma escola de patinação. Responda apenas com base nos dados fornecidos."
            },
            {
              role: "user",
              content: `Baseado nos seguintes dados: ${JSON.stringify(data)}, responda à pergunta: ${question}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.5,
        });
        
        const backupResponse = backupCompletion.choices[0].message.content;
        
        // Salvar a conversa no Firestore com a resposta do modelo de backup
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
            userId: request.auth.uid,
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
          usedBackupModel: true
        });
        
        return {
          answer: backupResponse,
          conversationId: conversationRef.id,
          usedBackupModel: true
        };
      }
      
      throw openaiError;
    }
  } catch (error) {
    logger.error("Erro na função queryAI:", error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError(
      "internal",
      error.message || "Ocorreu um erro ao processar sua pergunta. Por favor, tente novamente."
    );
  }
});
