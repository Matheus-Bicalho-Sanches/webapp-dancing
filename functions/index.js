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

// Criar app Express
const app = express();

// Configuração CORS mais detalhada
const corsOptions = {
  origin: ['http://localhost:3000', 'https://webapp-dancing.web.app', 'https://webapp-dancing.firebaseapp.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // cache preflight por 24 horas
};

// Aplicar CORS com as opções detalhadas
app.use(cors(corsOptions));

// Middleware para JSON
app.use(express.json());

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

      // Atualizar o registro da consulta com a referência da conversa
      await queryRef.update({
        aiResponse,
        conversationId: conversationRef.id
      });

      // Retornar a resposta
      return res.json({
        answer: aiResponse,
        conversationId: conversationRef.id
      });
    } catch (openaiError) {
      console.error("Erro na API da OpenAI:", openaiError);
      
      // Se houver erro na API do OpenAI, tentar com o modelo de fallback
      if (AI_MODEL !== FALLBACK_MODEL) {
        console.log(`Tentando com modelo de fallback ${FALLBACK_MODEL}`);
        
        const backupCompletion = await openai.chat.completions.create({
          model: FALLBACK_MODEL,
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
          usedBackupModel: true
        });
        
        return res.json({
          answer: backupResponse,
          conversationId: conversationRef.id,
          usedBackupModel: FALLBACK_MODEL
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
