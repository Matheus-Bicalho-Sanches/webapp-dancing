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
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { calculateAge } from '../../utils/dateUtils';

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

// Componente da aba de Matrículas
function MatriculasTab({ studentId }) {
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [formData, setFormData] = useState({
    planoId: '',
    valor: 0,
    dataInicio: dayjs().format('YYYY-MM-DD'),
    dataTermino: dayjs().add(1, 'year').format('YYYY-MM-DD')
  });

  useEffect(() => {
    loadMatriculas();
    loadPlanos();
  }, [studentId]);

  const loadPlanos = async () => {
    try {
      const planosQuery = query(collection(db, 'planos'));
      const querySnapshot = await getDocs(planosQuery);
      const planosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlanos(planosData);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };

  const loadMatriculas = async () => {
    try {
      setLoading(true);
      const matriculasQuery = query(
        collection(db, 'matriculas'),
        where('alunoId', '==', studentId)
      );
      const querySnapshot = await getDocs(matriculasQuery);
      const matriculasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMatriculas(matriculasData);
    } catch (error) {
      console.error('Erro ao carregar matrículas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanoChange = (event) => {
    const planoId = event.target.value;
    const planoSelecionado = planos.find(p => p.id === planoId);
    setFormData(prev => ({
      ...prev,
      planoId,
      valor: planoSelecionado?.valor || 0
    }));
  };

  const handleDateChange = (event) => {
    const { name, value } = event.target;
    const dataInicio = name === 'dataInicio' ? value : formData.dataInicio;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
      dataTermino: dayjs(dataInicio).add(1, 'year').format('YYYY-MM-DD')
    }));
  };

  const handleSubmit = async () => {
    try {
      const planoSelecionado = planos.find(p => p.id === formData.planoId);
      const matriculaData = {
        alunoId: studentId,
        planoId: formData.planoId,
        planoNome: planoSelecionado.nome,
        valor: formData.valor,
        dataInicio: formData.dataInicio,
        dataTermino: formData.dataTermino,
        status: 'ativa',
        createdAt: serverTimestamp()
      };

      // Criar a matrícula
      const matriculaRef = await addDoc(collection(db, 'matriculas'), matriculaData);

      // Se o valor da matrícula for maior que 0, criar os 12 pagamentos mensais
      if (formData.valor > 0) {
        const valorMensal = formData.valor / 12;
        const batch = writeBatch(db);

        // Pegar o dia do mês da data de início
        const dataInicio = dayjs(formData.dataInicio);
        const diaVencimento = dataInicio.date();

        // Criar 12 pagamentos
        for (let i = 0; i < 12; i++) {
          // Primeiro, tentamos adicionar os meses à data inicial
          let dataVencimento = dataInicio.add(i, 'month');
          
          // Verificar se o mês tem menos dias que o dia de vencimento original
          const ultimoDiaDoMes = dataVencimento.endOf('month').date();
          if (diaVencimento > ultimoDiaDoMes) {
            // Se o dia original não existe neste mês, usar o último dia do mês
            dataVencimento = dataVencimento.endOf('month');
          }

          const pagamentoData = {
            alunoId: studentId,
            matriculaId: matriculaRef.id,
            descricao: `${planoSelecionado.nome} - Parcela ${i + 1}/12`,
            tipo: 'Mensalidade',
            valor: valorMensal,
            dataVencimento: dataVencimento.format('YYYY-MM-DD'),
            status: 'pendente',
            createdAt: serverTimestamp()
          };

          const pagamentoRef = doc(collection(db, 'pagamentos'));
          batch.set(pagamentoRef, pagamentoData);
        }

        // Executar todas as operações em batch
        await batch.commit();
      }

      setOpenDialog(false);
      loadMatriculas();
    } catch (error) {
      console.error('Erro ao criar matrícula:', error);
    }
  };

  const getStatusColor = (status, dataTermino) => {
    if (status === 'cancelada') return 'error';
    if (dayjs(dataTermino) < dayjs()) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Nova Matrícula
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Plano</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Data de Início</TableCell>
                <TableCell>Data de Término</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matriculas.map((matricula) => (
                <TableRow key={matricula.id}>
                  <TableCell>{matricula.planoNome}</TableCell>
                  <TableCell>R$ {matricula.valor}</TableCell>
                  <TableCell>{dayjs(matricula.dataInicio).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>{dayjs(matricula.dataTermino).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    <Chip
                      label={matricula.status}
                      color={getStatusColor(matricula.status, matricula.dataTermino)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {matriculas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhuma matrícula encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de Nova Matrícula */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nova Matrícula</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Plano</InputLabel>
              <Select
                value={formData.planoId}
                onChange={handlePlanoChange}
                label="Plano"
              >
                {planos.map((plano) => (
                  <MenuItem key={plano.id} value={plano.id}>
                    {plano.nome} - R$ {plano.valor}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Valor Total"
              type="number"
              value={formData.valor}
              onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Data de Início"
              type="date"
              value={formData.dataInicio}
              onChange={handleDateChange}
              name="dataInicio"
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              fullWidth
              label="Data de Término"
              type="date"
              value={formData.dataTermino}
              disabled
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Componente da aba de Pagamentos
function PaymentsTab({ studentId }) {
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [receivingPayment, setReceivingPayment] = useState(null);
  const [formData, setFormData] = useState({
    descricao: '',
    tipo: '',
    valor: '',
    dataVencimento: dayjs().format('YYYY-MM-DD')
  });
  const [receiveFormData, setReceiveFormData] = useState({
    valor: '',
    meioPagamento: '',
    dataRecebimento: dayjs().format('YYYY-MM-DD')
  });

  // Verificar se o usuário tem permissão de master
  const hasDeletePermission = currentUser?.userType === 'master';

  useEffect(() => {
    loadPayments();
  }, [studentId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentsQuery = query(
        collection(db, 'pagamentos'),
        where('alunoId', '==', studentId),
        orderBy('dataVencimento', 'desc')
      );
      const querySnapshot = await getDocs(paymentsQuery);
      const paymentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPayments(paymentsData);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (payment) => {
    setEditingPayment(payment);
    setFormData({
      descricao: payment.descricao,
      tipo: payment.tipo,
      valor: payment.valor.toString(),
      dataVencimento: payment.dataVencimento
    });
    setOpenDialog(true);
  };

  const handleDeleteClick = async (paymentId) => {
    if (window.confirm('Tem certeza que deseja excluir este pagamento?')) {
      try {
        await deleteDoc(doc(db, 'pagamentos', paymentId));
        loadPayments();
      } catch (error) {
        console.error('Erro ao excluir pagamento:', error);
      }
    }
  };

  const handleReceiveClick = (payment) => {
    setReceivingPayment(payment);
    setReceiveFormData({
      valor: payment.valor.toString(),
      meioPagamento: '',
      dataRecebimento: dayjs().format('YYYY-MM-DD')
    });
    setOpenReceiveDialog(true);
  };

  const handleReceiveSubmit = async () => {
    try {
      await updateDoc(doc(db, 'pagamentos', receivingPayment.id), {
        status: 'pago',
        valorRecebido: parseFloat(receiveFormData.valor),
        meioPagamento: receiveFormData.meioPagamento,
        dataRecebimento: receiveFormData.dataRecebimento,
        updatedAt: serverTimestamp()
      });
      setOpenReceiveDialog(false);
      setReceivingPayment(null);
      loadPayments();
    } catch (error) {
      console.error('Erro ao receber pagamento:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const paymentData = {
        alunoId: studentId,
        descricao: formData.descricao,
        tipo: formData.tipo,
        valor: parseFloat(formData.valor),
        dataVencimento: formData.dataVencimento,
        status: 'pendente',
        updatedAt: serverTimestamp()
      };

      if (editingPayment) {
        await updateDoc(doc(db, 'pagamentos', editingPayment.id), paymentData);
      } else {
        paymentData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'pagamentos'), paymentData);
      }

      setOpenDialog(false);
      setEditingPayment(null);
      loadPayments();
      setFormData({
        descricao: '',
        tipo: '',
        valor: '',
        dataVencimento: dayjs().format('YYYY-MM-DD')
      });
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
    }
  };

  const tiposPagamento = [
    'Mensalidade',
    'Aula individual',
    'Cantina',
    'Eventos',
    'Aula experimental',
    'Outros'
  ];

  const meiosPagamento = [
    'Dinheiro',
    'PIX',
    'Débito',
    'Crédito'
  ];

  const getStatusColor = (status, dataVencimento) => {
    if (status === 'pago') return 'success';
    if (dayjs(dataVencimento) < dayjs()) return 'error';
    return 'warning';
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingPayment(null);
            setFormData({
              descricao: '',
              tipo: '',
              valor: '',
              dataVencimento: dayjs().format('YYYY-MM-DD')
            });
            setOpenDialog(true);
          }}
        >
          Novo Pagamento
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Descrição</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Recebimento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.descricao}</TableCell>
                  <TableCell>{payment.tipo}</TableCell>
                  <TableCell>
                    {payment.valor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </TableCell>
                  <TableCell>{dayjs(payment.dataVencimento).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    {payment.dataRecebimento ? (
                      <>
                        {dayjs(payment.dataRecebimento).format('DD/MM/YYYY')}
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          {payment.meioPagamento} - {payment.valorRecebido?.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </Typography>
                      </>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      color={getStatusColor(payment.status, payment.dataVencimento)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleEditClick(payment)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    {payment.status !== 'pago' && (
                      <IconButton
                        color="success"
                        onClick={() => handleReceiveClick(payment)}
                        size="small"
                        title="Receber pagamento"
                      >
                        <AttachMoneyIcon />
                      </IconButton>
                    )}
                    {hasDeletePermission && (
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(payment.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhum pagamento encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de Novo/Editar Pagamento */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingPayment(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Descrição"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Tipo de Pagamento</InputLabel>
              <Select
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                label="Tipo de Pagamento"
              >
                {tiposPagamento.map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {tipo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Valor"
              type="number"
              value={formData.valor}
              onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              required
            />

            <TextField
              fullWidth
              label="Data de Vencimento"
              type="date"
              value={formData.dataVencimento}
              onChange={(e) => setFormData(prev => ({ ...prev, dataVencimento: e.target.value }))}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setEditingPayment(null);
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.descricao || !formData.tipo || !formData.valor || !formData.dataVencimento}
          >
            {editingPayment ? 'Salvar' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Recebimento */}
      <Dialog
        open={openReceiveDialog}
        onClose={() => {
          setOpenReceiveDialog(false);
          setReceivingPayment(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Receber Pagamento</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Valor a Receber"
              type="number"
              value={receiveFormData.valor}
              onChange={(e) => setReceiveFormData(prev => ({ ...prev, valor: e.target.value }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Meio de Pagamento</InputLabel>
              <Select
                value={receiveFormData.meioPagamento}
                onChange={(e) => setReceiveFormData(prev => ({ ...prev, meioPagamento: e.target.value }))}
                label="Meio de Pagamento"
              >
                {meiosPagamento.map((meio) => (
                  <MenuItem key={meio} value={meio}>
                    {meio}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Data de Recebimento"
              type="date"
              value={receiveFormData.dataRecebimento}
              onChange={(e) => setReceiveFormData(prev => ({ ...prev, dataRecebimento: e.target.value }))}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenReceiveDialog(false);
              setReceivingPayment(null);
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleReceiveSubmit}
            variant="contained"
            disabled={!receiveFormData.valor || !receiveFormData.meioPagamento || !receiveFormData.dataRecebimento}
          >
            Confirmar Recebimento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
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
            <MatriculasTab studentId={id} />
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="body1">
              Informações sobre horários serão exibidas aqui.
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <PaymentsTab studentId={id} />
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