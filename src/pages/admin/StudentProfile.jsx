import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';

export default function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const studentDoc = await getDoc(doc(db, 'alunos', id));
      
      if (studentDoc.exists()) {
        setStudent({
          id: studentDoc.id,
          ...studentDoc.data()
        });
      } else {
        console.error('Aluno não encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!student) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" color="error">
            Aluno não encontrado
          </Typography>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {student.nome}
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Informações Pessoais
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Email"
                        secondary={student.email || 'Não informado'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Telefone"
                        secondary={student.telefone || 'Não informado'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Data de Nascimento"
                        secondary={student.dataNascimento || 'Não informada'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Observações
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {student.observacoes || 'Nenhuma observação registrada'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Histórico
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={`Cadastrado em: ${dayjs(student.createdAt?.toDate()).format('DD/MM/YYYY HH:mm')}`}
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {student.updatedAt && (
                      <Chip 
                        label={`Última atualização: ${dayjs(student.updatedAt?.toDate()).format('DD/MM/YYYY HH:mm')}`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </MainLayout>
  );
} 