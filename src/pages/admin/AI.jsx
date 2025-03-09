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
import { db } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

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

  // Verificar se o usuário é do tipo "master"
  useEffect(() => {
    const checkUserType = async () => {
      try {
        if (!currentUser) {
          navigate('/login');
          return;
        }

        // Verificar no Firestore o tipo do usuário
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
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

  console.log('Rendering AI component, userType:', userType, 'loading:', loading);

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    // Adicionar a pergunta à conversa
    const newQuestion = { type: 'question', content: question };
    setConversation([...conversation, newQuestion]);
    
    try {
      // Aqui será implementada a integração com a API da OpenAI
      // Por enquanto, apenas simulamos uma resposta após 1.5 segundos
      setTimeout(() => {
        const mockResponse = {
          type: 'answer',
          content: `Esta é uma resposta de demonstração. A funcionalidade de IA será implementada em breve para responder à sua pergunta: "${question}"`
        };
        
        setConversation(prev => [...prev, mockResponse]);
        setQuestion('');
        setIsProcessing(false);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao processar pergunta:', error);
      setError('Ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.');
      setIsProcessing(false);
    }
  };

  const handleClearConversation = () => {
    setConversation([]);
    setAnswer('');
    setError(null);
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

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          maxWidth: '80%',
                          bgcolor: '#ffffff',
                          borderRadius: '10px 10px 10px 0'
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
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