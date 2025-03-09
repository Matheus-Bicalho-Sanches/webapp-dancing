import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AI = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  // URL base da função Cloud Function
  const API_URL = 'https://us-central1-webapp-dancing.cloudfunctions.net/queryAI/query';
  // URL alternativa usando um proxy CORS (usar apenas para desenvolvimento)
  const CORS_PROXY_URL = 'https://corsproxy.io/?' + encodeURIComponent(API_URL);
  // Flag para rastrear tentativas com CORS Proxy
  const [usingCorsProxy, setUsingCorsProxy] = useState(false);

  // Verificar se o usuário é do tipo "master"
  useEffect(() => {
    const checkUserType = async () => {
      try {
        if (!auth.currentUser) {
          console.log('Usuário não autenticado, redirecionando para login');
          navigate('/login');
          return;
        }

        // Verificar no Firestore o tipo do usuário
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserType(userData.userType);
          
          // Redirecionar se não for "master"
          if (userData.userType !== 'master') {
            console.log('Usuário não é master, redirecionando');
            navigate('/admin/dashboard');
          }
        } else {
          console.log('Documento do usuário não existe');
          navigate('/login');
        }
      } catch (error) {
        console.error('Erro ao verificar tipo de usuário:', error);
        setError('Não foi possível verificar suas permissões. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    checkUserType();
  }, [currentUser, navigate]);

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    // Adicionar a pergunta à conversa
    const newQuestion = { type: 'question', content: question };
    setConversation(prev => [...prev, newQuestion]);
    
    try {
      // Obter o token de ID do usuário atual
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        setError('Você precisa estar autenticado para usar esta funcionalidade');
        setIsProcessing(false);
        return;
      }
      
      // Usamos o objeto auth.currentUser que tem o método getIdToken
      const idToken = await auth.currentUser.getIdToken();
      
      // Definir URL a ser usada (normal ou proxy)
      const urlToUse = usingCorsProxy ? CORS_PROXY_URL : API_URL;
      
      // Chamar a API
      console.log(`Enviando pergunta usando ${usingCorsProxy ? 'CORS Proxy' : 'URL direta'}:`, question);
      const response = await axios.post(urlToUse, 
        {
          question,
          conversationId
        },
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Resposta recebida:', response.data);
      
      // Processar a resposta
      const { answer, conversationId: newConversationId, usedBackupModel, modelUsed } = response.data;
      
      // Atualizar o ID da conversa para futuras interações
      setConversationId(newConversationId);
      
      // Adicionar a resposta à conversa
      const newAnswer = { 
        type: 'answer', 
        content: answer,
        // Adicionar informação do modelo usado
        modelInfo: modelUsed ? `Resposta gerada pelo modelo: ${modelUsed}` : 'Modelo desconhecido',
        // Para compatibilidade com versões anteriores
        ...(usedBackupModel ? { note: `Modelo de fallback utilizado (${usedBackupModel === true ? 'gpt-4o-mini' : usedBackupModel})` } : {})
      };
      setConversation(prev => [...prev, newAnswer]);
      
      // Limpar o campo de pergunta
      setQuestion('');
    } catch (error) {
      console.error('Erro ao processar pergunta:', error);
      
      // Verificar se é um erro de CORS e tentar novamente com o proxy
      if (!usingCorsProxy && (error.message === 'Network Error' || 
         (error.response && error.response.status === 0))) {
        setUsingCorsProxy(true);
        console.log('Tentando novamente com CORS Proxy...');
        
        // Chamar a mesma função novamente (agora com usingCorsProxy = true)
        handleQuestionSubmit(e);
        return;
      }
      
      let errorMessage = 'Erro ao processar pergunta';
      
      if (error.response) {
        // O servidor respondeu com um código de status diferente de 2xx
        errorMessage = `Erro do servidor: ${error.response.status} - ${error.response.data.error || 'Erro desconhecido'}`;
        console.error('Resposta de erro:', error.response.data);
      } else if (error.request) {
        // A requisição foi feita mas nenhuma resposta foi recebida
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão de internet.';
      } else {
        // Erro ao configurar a requisição
        errorMessage = `Erro: ${error.message}`;
      }
      
      // Adicionar mensagem de erro à conversa
      const errorResponseMessage = { 
        type: 'answer', 
        content: errorMessage,
        isError: true
      };
      setConversation(prev => [...prev, errorResponseMessage]);
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearConversation = () => {
    setConversation([]);
    setAnswer('');
    setError(null);
    setConversationId(null);
  };

  // Renderização condicional enquanto verifica o tipo de usuário
  if (loading) {
    return (
      <MainLayout title="Assistente IA">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  // Se não for master, mostrar mensagem de permissão negada em vez de redirecionar
  // (o redirecionamento já deve ter ocorrido, mas isso é uma garantia adicional)
  if (userType && userType !== 'master') {
    return (
      <MainLayout title="Acesso Negado">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <Alert severity="error">
            Você não tem permissão para acessar esta página. Esta funcionalidade é exclusiva para administradores master.
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Assistente IA">
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Consulte a IA sobre seus dados no Firebase
            </Typography>
            <IconButton 
              onClick={handleClearConversation} 
              color="primary" 
              disabled={isProcessing || conversation.length === 0}
              title="Limpar conversa"
            >
              <RotateLeftIcon />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Faça perguntas sobre tarefas, funcionários, taxa de renovação de clientes e outras informações disponíveis na base de dados.
          </Typography>

          <Box mb={4}>
            <Typography variant="h4" gutterBottom>
              Assistente IA
            </Typography>
            {usingCorsProxy && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Usando CORS Proxy para contornar restrições de CORS. Isso é uma solução temporária apenas para desenvolvimento.
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Box>

          {/* Área de conversa */}
          {conversation.length > 0 && (
            <Box 
              sx={{ 
                mb: 3, 
                maxHeight: '400px', 
                overflowY: 'auto',
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                bgcolor: '#f9f9f9'
              }}
            >
              {conversation.map((message, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  {message.type === 'question' ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          maxWidth: '80%',
                          bgcolor: '#e3f2fd',
                          borderRadius: '10px 10px 0 10px'
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                      </Paper>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', flexDirection: 'column' }}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          maxWidth: '80%',
                          bgcolor: message.isError ? '#ffebee' : '#ffffff',
                          borderRadius: '10px 10px 10px 0'
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                        
                        {/* Mostrar informação do modelo usado */}
                        {message.modelInfo && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'block', 
                              mt: 1, 
                              color: 'primary.main',
                              fontWeight: 'bold'
                            }}
                          >
                            {message.modelInfo}
                          </Typography>
                        )}
                        
                        {/* Mostrar nota sobre modelo de backup, se aplicável */}
                        {message.note && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'block', 
                              mt: message.modelInfo ? 0.5 : 1, 
                              color: 'text.secondary',
                              fontStyle: 'italic'
                            }}
                          >
                            {message.note}
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Formulário para enviar perguntas */}
          <form onSubmit={handleQuestionSubmit}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Digite sua pergunta"
                variant="outlined"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isProcessing}
                sx={{ flexGrow: 1 }}
              />
              <Button 
                type="submit" 
                variant="contained"
                disabled={isProcessing || !question.trim()}
                endIcon={isProcessing ? <CircularProgress size={24} /> : <SendIcon />}
              >
                {isProcessing ? 'Processando' : 'Enviar'}
              </Button>
            </Box>
          </form>
        </Paper>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Exemplos de perguntas
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Quantas tarefas cada funcionário fez hoje?
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Quais tarefas estão atrasadas?
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Qual a taxa de renovação dos clientes no último mês?
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Quem são os alunos com mensalidade atrasada?
            </Typography>
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default AI; 