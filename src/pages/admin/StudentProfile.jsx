import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Chip,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';

// Função para calcular idade
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  return dayjs().diff(dayjs(birthDate), 'year');
};

// Componente TabPanel para renderizar o conteúdo de cada aba
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-tabpanel-${index}`}
      aria-labelledby={`student-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Verificar se o usuário tem permissão de master
  const hasDeletePermission = currentUser?.userType === 'master';

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

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, 'alunos', id));
      navigate('/admin/alunos');
    } catch (error) {
      console.error('Erro ao excluir aluno:', error);
    }
    setOpenDeleteDialog(false);
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              {student.nome}
            </Typography>
            {hasDeletePermission && currentTab === 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
              >
                Excluir Aluno
              </Button>
            )}
          </Box>
          <Divider sx={{ my: 2 }} />
          
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Informações" />
            <Tab label="Matrículas" />
            <Tab label="Horários" />
            <Tab label="Pagamentos" />
            <Tab label="Frequência" />
            <Tab label="Observações" />
          </Tabs>

          <TabPanel value={currentTab} index={0}>
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
                          primary="Nome Completo"
                          secondary={student.nome || 'Não informado'}
                        />
                      </ListItem>
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
                          secondary={
                            student.dataNascimento 
                              ? `${student.dataNascimento} (${calculateAge(student.dataNascimento)} anos)`
                              : 'Não informada'
                          }
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
                      Informações Familiares
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Nome do Pai"
                          secondary={student.nomePai || 'Não informado'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Nome da Mãe"
                          secondary={student.nomeMae || 'Não informado'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Responsável Financeiro"
                          secondary={student.responsavelFinanceiro || 'Não informado'}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Endereço
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {student.endereco ? (
                        <>
                          {student.endereco.logradouro}, {student.endereco.numero}
                          {student.endereco.complemento && `, ${student.endereco.complemento}`}<br />
                          {student.endereco.bairro}<br />
                          {student.endereco.cidade} - {student.endereco.estado}<br />
                          CEP: {student.endereco.cep}
                        </>
                      ) : (
                        'Endereço não informado'
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
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
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Typography variant="body1">
              Informações sobre matrículas serão exibidas aqui.
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="body1">
              Informações sobre horários serão exibidas aqui.
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <Typography variant="body1">
              Informações sobre pagamentos serão exibidas aqui.
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            <Typography variant="body1">
              Informações sobre frequência serão exibidas aqui.
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={5}>
            <Typography variant="body1">
              {student.observacoes || 'Nenhuma observação registrada'}
            </Typography>
          </TabPanel>

          {/* Dialog de confirmação de exclusão */}
          <Dialog
            open={openDeleteDialog}
            onClose={() => setOpenDeleteDialog(false)}
          >
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent>
              <Typography>
                Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleDeleteConfirm} 
                color="error" 
                variant="contained"
              >
                Excluir
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Box>
    </MainLayout>
  );
} 