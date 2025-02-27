import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  IconButton,
  Checkbox,
  Stack,
  FormControlLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { calculateAge } from '../../utils/dateUtils';
import StudentHorariosTab from '../../components/tabs/StudentHorariosTab';
import { asaasService } from '../../services/asaasService';

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
  const { currentUser } = useAuth();
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [editingMatricula, setEditingMatricula] = useState(null);
  const [formData, setFormData] = useState({
    planoId: '',
    valor: 0,
    dataInicio: dayjs().format('YYYY-MM-DD'),
    dataTermino: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    status: 'ativa'
  });

  // Verificar se o usuário tem permissão de master
  const hasDeletePermission = currentUser?.userType === 'master';

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

  const handleEditClick = (matricula) => {
    setEditingMatricula(matricula);
    setFormData({
      planoId: matricula.planoId,
      valor: matricula.valor,
      dataInicio: matricula.dataInicio,
      dataTermino: matricula.dataTermino,
      status: matricula.status
    });
    setOpenDialog(true);
  };

  const handleDeleteClick = async (matriculaId) => {
    if (window.confirm('Tem certeza que deseja excluir esta matrícula? Esta ação não pode ser desfeita.')) {
      try {
        // Excluir a matrícula
        await deleteDoc(doc(db, 'matriculas', matriculaId));

        // Excluir os pagamentos associados a esta matrícula
        const pagamentosQuery = query(
          collection(db, 'pagamentos'),
          where('matriculaId', '==', matriculaId)
        );
        const pagamentosSnapshot = await getDocs(pagamentosQuery);
        
        const batch = writeBatch(db);
        pagamentosSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        loadMatriculas();
      } catch (error) {
        console.error('Erro ao excluir matrícula:', error);
      }
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
      dataTermino: name === 'dataInicio' ? dayjs(dataInicio).add(1, 'year').format('YYYY-MM-DD') : prev.dataTermino
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
        status: formData.status,
        updatedAt: serverTimestamp()
      };

      if (editingMatricula) {
        await updateDoc(doc(db, 'matriculas', editingMatricula.id), matriculaData);
      } else {
        // Criar a matrícula
        matriculaData.createdAt = serverTimestamp();
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
      }

      setOpenDialog(false);
      setEditingMatricula(null);
      loadMatriculas();
    } catch (error) {
      console.error('Erro ao salvar matrícula:', error);
    }
  };

  const getStatusColor = (status, dataTermino) => {
    if (status === 'rescindida' || status === 'baixada') return 'default';
    if (status === 'ativa') {
      if (dayjs(dataTermino).isBefore(dayjs(), 'day')) return 'error';
      return 'success';
    }
    return 'error';
  };

  const getStatusLabel = (status, dataTermino) => {
    if (status === 'rescindida') return 'rescindida';
    if (status === 'baixada') return 'baixada';
    if (status === 'ativa') {
      if (dayjs(dataTermino).isBefore(dayjs(), 'day')) return 'vencida';
      return 'ativa';
    }
    return status;
  };

  const getAvailableStatuses = (currentStatus, dataTermino) => {
    if (currentStatus === 'ativa') {
      if (dayjs(dataTermino).isBefore(dayjs(), 'day')) {
        return ['vencida', 'baixada'];
      }
      return ['ativa', 'rescindida'];
    }
    if (getStatusLabel(currentStatus, dataTermino) === 'vencida') {
      return ['vencida', 'baixada'];
    }
    return [currentStatus];
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingMatricula(null);
            setFormData({
              planoId: '',
              valor: 0,
              dataInicio: dayjs().format('YYYY-MM-DD'),
              dataTermino: dayjs().add(1, 'year').format('YYYY-MM-DD'),
              status: 'ativa'
            });
            setOpenDialog(true);
          }}
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
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matriculas.map((matricula) => (
                <TableRow key={matricula.id}>
                  <TableCell>{matricula.planoNome}</TableCell>
                  <TableCell>
                    {matricula.valor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </TableCell>
                  <TableCell>{dayjs(matricula.dataInicio).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>{dayjs(matricula.dataTermino).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(matricula.status, matricula.dataTermino)}
                      color={getStatusColor(matricula.status, matricula.dataTermino)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleEditClick(matricula)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    {hasDeletePermission && (
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(matricula.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {matriculas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhuma matrícula encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de Nova/Editar Matrícula */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingMatricula(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingMatricula ? 'Editar Matrícula' : 'Nova Matrícula'}
        </DialogTitle>
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
              name="dataTermino"
              InputLabelProps={{
                shrink: true,
              }}
            />

            {editingMatricula && (
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  {getAvailableStatuses(editingMatricula.status, editingMatricula.dataTermino).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setEditingMatricula(null);
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
          >
            {editingMatricula ? 'Salvar' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Componente da aba de Pagamentos
function PaymentsTab({ studentId, student }) {
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [openCreditCardDialog, setOpenCreditCardDialog] = useState(false);
  const [hasRegisteredCard, setHasRegisteredCard] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [receivingPayment, setReceivingPayment] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [formData, setFormData] = useState({
    descricao: '',
    tipo: '',
    valor: '',
    dataVencimento: dayjs().format('YYYY-MM-DD')
  });
  const [creditCardData, setCreditCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    holderInfo: {
      name: '',
      email: '',
      cpfCnpj: '',
      phone: '',
      postalCode: '',
      addressNumber: '',
      addressComplement: ''
    }
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
    // Verificar se o aluno já tem cartão registrado
    if (student?.creditCardToken) {
      setHasRegisteredCard(true);
    }
  }, [studentId, student]);

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
      setSelectedPayments([]); // Reset selected payments when loading new ones
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

  const handleDelete = async (paymentId) => {
    if (window.confirm('Tem certeza que deseja excluir este pagamento?')) {
      try {
        // Primeiro, buscar movimentações relacionadas a este pagamento
        const movimentacoesRef = collection(db, 'movimentacoes');
        const q = query(movimentacoesRef, where('pagamentoId', '==', paymentId));
        const querySnapshot = await getDocs(q);

        // Criar um batch para excluir tanto o pagamento quanto as movimentações
        const batch = writeBatch(db);

        // Adicionar exclusão do pagamento ao batch
        batch.delete(doc(db, 'pagamentos', paymentId));

        // Adicionar exclusão das movimentações ao batch
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // Executar todas as exclusões em uma única transação
        await batch.commit();

        loadPayments();
        setSnackbar({
          open: true,
          message: 'Pagamento excluído com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir pagamento:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir pagamento. Por favor, tente novamente.',
          severity: 'error'
        });
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

  const createCashMovement = async (payment, receiveData) => {
    return addDoc(collection(db, 'movimentacoes'), {
      data: Timestamp.fromDate(dayjs(receiveData.dataRecebimento).toDate()),
      tipo: 'entrada',
      descricao: `Pagamento de ${payment.descricao}`,
      valor: parseFloat(receiveData.valor || payment.valor),
      categoria: 'Mensalidade',
      formaPagamento: receiveData.meioPagamento,
      alunoId: studentId,
      pagamentoId: payment.id,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });
  };

  const handleReceiveSubmit = async () => {
    try {
      if (receivingPayment) {
        // Single payment receive
        if (receiveFormData.meioPagamento === 'Cartão cadastrado') {
          if (!student?.creditCardToken) {
            alert('Não há cartão cadastrado');
            return;
          }

          try {
            const response = await asaasService.createPayment({
              customerId: student.asaasCustomerId,
              value: parseFloat(receiveFormData.valor),
              dueDate: receiveFormData.dataRecebimento,
              description: receivingPayment.descricao,
              creditCardToken: student.creditCardToken
            });

            if (response.status === 'CONFIRMED' || response.status === 'RECEIVED') {
              // Atualizar o pagamento no Firestore
              const paymentUpdate = {
                status: 'pago',
                valorRecebido: parseFloat(receiveFormData.valor),
                meioPagamento: receiveFormData.meioPagamento,
                dataRecebimento: receiveFormData.dataRecebimento,
                asaasPaymentId: response.id,
                updatedAt: serverTimestamp()
              };

              await updateDoc(doc(db, 'pagamentos', receivingPayment.id), paymentUpdate);
              await createCashMovement(receivingPayment, receiveFormData);

              alert('Pagamento bem sucedido');
            } else {
              throw new Error('Status do pagamento: ' + response.status);
            }
          } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            alert(error.message || 'Erro ao processar pagamento no cartão');
            return;
          }
        } else {
          // Processamento normal para outros meios de pagamento
          const paymentUpdate = {
            status: 'pago',
            valorRecebido: parseFloat(receiveFormData.valor),
            meioPagamento: receiveFormData.meioPagamento,
            dataRecebimento: receiveFormData.dataRecebimento,
            updatedAt: serverTimestamp()
          };

          await updateDoc(doc(db, 'pagamentos', receivingPayment.id), paymentUpdate);
          await createCashMovement(receivingPayment, receiveFormData);
        }
      } else if (selectedPayments.length > 0) {
        // Multiple payments receive
        if (receiveFormData.meioPagamento === 'Cartão cadastrado') {
          if (!student?.creditCardToken) {
            alert('Não há cartão cadastrado');
            return;
          }

          // Processar cada pagamento selecionado individualmente
          const batch = writeBatch(db);
          const movimentacoesPromises = [];
          const paymentPromises = [];

          for (const paymentId of selectedPayments) {
            const payment = payments.find(p => p.id === paymentId);
            
            paymentPromises.push(
              asaasService.createPayment({
                customerId: student.asaasCustomerId,
                value: payment.valor,
                dueDate: receiveFormData.dataRecebimento,
                description: payment.descricao,
                creditCardToken: student.creditCardToken
              })
            );
          }

          try {
            const responses = await Promise.all(paymentPromises);
            
            // Verificar se todos os pagamentos foram bem sucedidos
            const failedPayments = responses.filter(r => 
              r.status !== 'CONFIRMED' && r.status !== 'RECEIVED'
            );

            if (failedPayments.length > 0) {
              throw new Error('Alguns pagamentos falharam. Por favor, tente novamente.');
            }

            // Atualizar todos os pagamentos no Firestore
            responses.forEach((response, index) => {
              const paymentId = selectedPayments[index];
              const payment = payments.find(p => p.id === paymentId);
              const paymentRef = doc(db, 'pagamentos', paymentId);
              
              batch.update(paymentRef, {
                status: 'pago',
                valorRecebido: payment.valor,
                meioPagamento: receiveFormData.meioPagamento,
                dataRecebimento: receiveFormData.dataRecebimento,
                asaasPaymentId: response.id,
                updatedAt: serverTimestamp()
              });

              movimentacoesPromises.push(
                createCashMovement(payment, {
                  ...receiveFormData,
                  valor: payment.valor
                })
              );
            });

            await batch.commit();
            await Promise.all(movimentacoesPromises);
            
            alert('Pagamentos processados com sucesso');
          } catch (error) {
            console.error('Erro ao processar pagamentos:', error);
            alert(error.message || 'Erro ao processar pagamentos no cartão');
            return;
          }
        } else {
          // Processamento normal para outros meios de pagamento
          const batch = writeBatch(db);
          const movimentacoesPromises = [];

          selectedPayments.forEach(paymentId => {
            const payment = payments.find(p => p.id === paymentId);
            const paymentRef = doc(db, 'pagamentos', paymentId);
            
            batch.update(paymentRef, {
              status: 'pago',
              valorRecebido: payment.valor,
              meioPagamento: receiveFormData.meioPagamento,
              dataRecebimento: receiveFormData.dataRecebimento,
              updatedAt: serverTimestamp()
            });

            movimentacoesPromises.push(
              createCashMovement(payment, {
                ...receiveFormData,
                valor: payment.valor
              })
            );
          });

          await batch.commit();
          await Promise.all(movimentacoesPromises);
        }
      }

      setOpenReceiveDialog(false);
      setReceivingPayment(null);
      setSelectedPayments([]);
      loadPayments();
      
      setSnackbar({
        open: true,
        message: 'Pagamento(s) recebido(s) com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao receber pagamento:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao receber pagamento. Por favor, tente novamente.',
        severity: 'error'
      });
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
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
    }
  };

  const handleCheckboxChange = (paymentId) => {
    setSelectedPayments(prev => {
      if (prev.includes(paymentId)) {
        return prev.filter(id => id !== paymentId);
      } else {
        return [...prev, paymentId];
      }
    });
  };

  const handleReceiveSelectedClick = () => {
    const totalValue = selectedPayments.reduce((sum, paymentId) => {
      const payment = payments.find(p => p.id === paymentId);
      return sum + payment.valor;
    }, 0);

    setReceivingPayment(null);
    setReceiveFormData({
      valor: totalValue.toString(),
      meioPagamento: '',
      dataRecebimento: dayjs().format('YYYY-MM-DD')
    });
    setOpenReceiveDialog(true);
  };

  const handleCreditCardSubmit = async () => {
    try {
      setLoading(true);
      
      // Verificar se o aluno existe e tem asaasCustomerId
      if (!student?.asaasCustomerId) {
        throw new Error('Este aluno não possui um cadastro válido no Asaas. Por favor, atualize os dados do aluno primeiro.');
      }
      
      // Validar dados do cartão
      if (!creditCardData.holderName || !creditCardData.number || 
          !creditCardData.expiryMonth || !creditCardData.expiryYear || 
          !creditCardData.ccv) {
        throw new Error('Todos os campos do cartão são obrigatórios');
      }

      // Validar dados do titular
      if (!creditCardData.holderInfo.name || !creditCardData.holderInfo.email || 
          !creditCardData.holderInfo.cpfCnpj || !creditCardData.holderInfo.addressNumber) {
        throw new Error('Nome, email, CPF e número do endereço do titular são obrigatórios');
      }

      const response = await asaasService.tokenizeCreditCard({
        customer: student.asaasCustomerId,
        creditCard: {
          holderName: creditCardData.holderName,
          number: creditCardData.number.replace(/\D/g, ''),
          expiryMonth: creditCardData.expiryMonth.padStart(2, '0'),
          expiryYear: creditCardData.expiryYear.length === 2 ? `20${creditCardData.expiryYear}` : creditCardData.expiryYear,
          ccv: creditCardData.ccv
        },
        holderInfo: creditCardData.holderInfo
      });

      // Atualizar o documento do aluno com o token do cartão
      await updateDoc(doc(db, 'alunos', studentId), {
        creditCardToken: response.creditCardToken,
        updatedAt: serverTimestamp()
      });

      // Atualizar o estado local
      setHasRegisteredCard(true);

      // Limpar formulário e fechar dialog
      setCreditCardData({
        holderName: '',
        number: '',
        expiryMonth: '',
        expiryYear: '',
        ccv: '',
        holderInfo: {
          name: '',
          email: '',
          cpfCnpj: '',
          phone: '',
          postalCode: '',
          addressNumber: '',
          addressComplement: ''
        }
      });
      setOpenCreditCardDialog(false);
      
      // Mostrar mensagem de sucesso
      alert('Cartão cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao cadastrar cartão:', error);
      alert(error.message || 'Erro ao cadastrar cartão');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditCardChange = (event) => {
    const { name, value } = event.target;
    if (name.startsWith('holderInfo.')) {
      const field = name.split('.')[1];
      setCreditCardData(prev => ({
        ...prev,
        holderInfo: {
          ...prev.holderInfo,
          [field]: value
        }
      }));
    } else {
      setCreditCardData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const tiposPagamento = [
    'Mensalidade',
    'Aula individual',
    'Eventos',
    'Aula experimental',
    'Outros'
  ];

  const meiosPagamento = [
    'Dinheiro',
    'PIX',
    'Débito',
    'Crédito',
    ...(hasRegisteredCard ? ['Cartão cadastrado'] : [])
  ];

  const getStatusColor = (status, dataVencimento) => {
    if (status === 'pago') return 'success';
    if (dayjs(dataVencimento).isBefore(dayjs(), 'day')) return 'error';
    if (dayjs(dataVencimento).isSame(dayjs(), 'day')) return 'warning';
    return 'warning';
  };

  const getStatusLabel = (status, dataVencimento) => {
    if (status === 'pago') return 'pago';
    if (dayjs(dataVencimento).isBefore(dayjs(), 'day')) return 'atrasado';
    return 'pendente';
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="success"
            disabled={selectedPayments.length === 0}
            onClick={handleReceiveSelectedClick}
            startIcon={<AttachMoneyIcon />}
          >
            Receber Selecionados ({selectedPayments.length})
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenCreditCardDialog(true)}
              startIcon={<CreditCardIcon />}
            >
              Cadastrar Cartão
            </Button>
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasRegisteredCard}
                  disabled
                  color="success"
                />
              }
              label="Cartão cadastrado"
            />
          </Box>
        </Box>
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
                <TableCell padding="checkbox"></TableCell>
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
                  <TableCell padding="checkbox">
                    {payment.status !== 'pago' && (
                      <Checkbox
                        checked={selectedPayments.includes(payment.id)}
                        onChange={() => handleCheckboxChange(payment.id)}
                      />
                    )}
                  </TableCell>
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
                      label={getStatusLabel(payment.status, payment.dataVencimento)}
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
                        onClick={() => handleDelete(payment.id)}
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
                  <TableCell colSpan={8} align="center">
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

      {/* Dialog de Cadastro de Cartão */}
      <Dialog
        open={openCreditCardDialog}
        onClose={() => setOpenCreditCardDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cadastrar Cartão de Crédito</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Dados do Cartão
            </Typography>
            <TextField
              fullWidth
              label="Nome no Cartão"
              name="holderName"
              value={creditCardData.holderName}
              onChange={handleCreditCardChange}
              required
            />
            <TextField
              fullWidth
              label="Número do Cartão"
              name="number"
              value={creditCardData.number}
              onChange={handleCreditCardChange}
              required
            />
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Mês"
                  name="expiryMonth"
                  value={creditCardData.expiryMonth}
                  onChange={handleCreditCardChange}
                  required
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Ano"
                  name="expiryYear"
                  value={creditCardData.expiryYear}
                  onChange={handleCreditCardChange}
                  required
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="CCV"
                  name="ccv"
                  value={creditCardData.ccv}
                  onChange={handleCreditCardChange}
                  required
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Dados do Titular
            </Typography>
            <TextField
              fullWidth
              label="Nome do Titular"
              name="holderInfo.name"
              value={creditCardData.holderInfo.name}
              onChange={handleCreditCardChange}
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="holderInfo.email"
              type="email"
              value={creditCardData.holderInfo.email}
              onChange={handleCreditCardChange}
              required
            />
            <TextField
              fullWidth
              label="CPF/CNPJ"
              name="holderInfo.cpfCnpj"
              value={creditCardData.holderInfo.cpfCnpj}
              onChange={handleCreditCardChange}
              required
            />
            <TextField
              fullWidth
              label="Telefone"
              name="holderInfo.phone"
              value={creditCardData.holderInfo.phone}
              onChange={handleCreditCardChange}
            />
            <TextField
              fullWidth
              label="CEP"
              name="holderInfo.postalCode"
              value={creditCardData.holderInfo.postalCode}
              onChange={handleCreditCardChange}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Número"
                  name="holderInfo.addressNumber"
                  value={creditCardData.holderInfo.addressNumber}
                  onChange={handleCreditCardChange}
                  required
                  helperText="Campo obrigatório"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Complemento"
                  name="holderInfo.addressComplement"
                  value={creditCardData.holderInfo.addressComplement}
                  onChange={handleCreditCardChange}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreditCardDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreditCardSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Componente da aba de Horários
function HorariosTab({ studentId }) {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);

  useEffect(() => {
    loadTurmasDoAluno();
    loadTurmasDisponiveis();
  }, [studentId]);

  const loadTurmasDoAluno = async () => {
    try {
      setLoading(true);
      const turmasRef = collection(db, 'turmasData');
      const q = query(turmasRef, where('alunos', 'array-contains', studentId));
      const querySnapshot = await getDocs(q);
      const turmasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas do aluno:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTurmasDisponiveis = async () => {
    try {
      const turmasRef = collection(db, 'turmasData');
      const querySnapshot = await getDocs(turmasRef);
      const turmasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTurmasDisponiveis(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas disponíveis:', error);
    }
  };

  const handleAddTurma = async () => {
    if (!selectedTurma) return;

    try {
      const turmaRef = doc(db, 'turmasData', selectedTurma);
      const turmaDoc = await getDoc(turmaRef);

      if (turmaDoc.exists()) {
        const turmaData = turmaDoc.data();
        const alunosAtuais = turmaData.alunos || [];

        if (!alunosAtuais.includes(studentId)) {
          await updateDoc(turmaRef, {
            alunos: [...alunosAtuais, studentId],
            updatedAt: serverTimestamp()
          });
        }
      }

      setOpenDialog(false);
      setSelectedTurma(null);
      loadTurmasDoAluno();
    } catch (error) {
      console.error('Erro ao adicionar aluno à turma:', error);
    }
  };

  const handleRemoveTurma = async (turmaId) => {
    if (!window.confirm('Tem certeza que deseja remover o aluno desta turma?')) return;

    try {
      const turmaRef = doc(db, 'turmasData', turmaId);
      const turmaDoc = await getDoc(turmaRef);

      if (turmaDoc.exists()) {
        const turmaData = turmaDoc.data();
        const alunosAtuais = turmaData.alunos || [];

        await updateDoc(turmaRef, {
          alunos: alunosAtuais.filter(id => id !== studentId),
          updatedAt: serverTimestamp()
        });
      }

      loadTurmasDoAluno();
    } catch (error) {
      console.error('Erro ao remover aluno da turma:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Adicionar à Turma
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome da Turma</TableCell>
                <TableCell>Dias da Turma</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {turmas.map((turma) => (
                <TableRow key={turma.id}>
                  <TableCell>{turma.nome}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {(turma.dias || []).map((dia, index) => (
                        <Chip key={index} label={dia} size="small" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{turma.horario}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveTurma(turma.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {turmas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Aluno não está matriculado em nenhuma turma
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog para adicionar aluno a uma turma */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedTurma(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Adicionar Aluno à Turma
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Selecione a Turma</InputLabel>
              <Select
                value={selectedTurma || ''}
                onChange={(e) => setSelectedTurma(e.target.value)}
                label="Selecione a Turma"
              >
                {turmasDisponiveis
                  .filter(turma => !(turma.alunos || []).includes(studentId))
                  .map((turma) => (
                    <MenuItem key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.horario} ({(turma.dias || []).join(', ')})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setSelectedTurma(null);
          }}>
            Cancelar
          </Button>
          <Button
            onClick={handleAddTurma}
            variant="contained"
            disabled={!selectedTurma}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    nomePai: '',
    profissaoPai: '',
    nomeMae: '',
    profissaoMae: '',
    responsavelFinanceiro: {
      nome: '',
      email: '',
      cpf: '',
      telefone: ''
    },
    endereco: {
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    observacoes: ''
  });
  const [error, setError] = useState('');

  // Verificar se o usuário tem permissão de master
  const hasDeletePermission = currentUser?.userType === 'master';

  useEffect(() => {
    loadStudent();
  }, [id]);

  useEffect(() => {
    // Definir a aba correta baseado no parâmetro da URL
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      switch (tabParam.toLowerCase()) {
        case 'matriculas':
          setCurrentTab(1);
          break;
        case 'horarios':
          setCurrentTab(2);
          break;
        case 'pagamentos':
          setCurrentTab(3);
          break;
        case 'frequencia':
          setCurrentTab(4);
          break;
        case 'observacoes':
          setCurrentTab(5);
          break;
        default:
          setCurrentTab(0);
      }
    }
  }, [searchParams]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Atualizar a URL quando mudar de aba
    const tabNames = ['info', 'matriculas', 'horarios', 'pagamentos', 'frequencia', 'observacoes'];
    navigate(`/admin/alunos/${id}?tab=${tabNames[newValue]}`, { replace: true });
  };

  const loadStudent = async () => {
    try {
      setLoading(true);
      const studentDoc = await getDoc(doc(db, 'alunos', id));
      
      if (studentDoc.exists()) {
        const studentData = {
          id: studentDoc.id,
          ...studentDoc.data()
        };
        setStudent(studentData);
        setFormData({
          nome: studentData.nome || '',
          email: studentData.email || '',
          telefone: studentData.telefone || '',
          dataNascimento: studentData.dataNascimento || '',
          nomePai: studentData.nomePai || '',
          profissaoPai: studentData.profissaoPai || '',
          nomeMae: studentData.nomeMae || '',
          profissaoMae: studentData.profissaoMae || '',
          responsavelFinanceiro: {
            nome: studentData.responsavelFinanceiro?.nome || '',
            email: studentData.responsavelFinanceiro?.email || '',
            cpf: studentData.responsavelFinanceiro?.cpf || '',
            telefone: studentData.responsavelFinanceiro?.telefone || ''
          },
          endereco: studentData.endereco || {
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            cep: ''
          },
          observacoes: studentData.observacoes || ''
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

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
  };

  const handleEditClick = () => {
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async () => {
    try {
      setLoading(true);

      // Validação dos campos do responsável financeiro
      if (!formData.responsavelFinanceiro.nome || 
          !formData.responsavelFinanceiro.email || 
          !formData.responsavelFinanceiro.cpf) {
        setError('Nome, email e CPF do responsável financeiro são obrigatórios');
        return;
      }

      // Validação do CPF
      const cpfNumbers = formData.responsavelFinanceiro.cpf.replace(/\D/g, '');
      if (cpfNumbers.length !== 11) {
        setError('CPF do responsável financeiro inválido');
        return;
      }

      // Validação do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.responsavelFinanceiro.email)) {
        setError('Email do responsável financeiro inválido');
        return;
      }

      // Se o aluno já tem um ID do Asaas, atualiza os dados do cliente
      if (student.asaasCustomerId) {
        try {
          await asaasService.updateCustomer(student.asaasCustomerId, {
            name: formData.responsavelFinanceiro.nome,
            email: formData.responsavelFinanceiro.email,
            cpfCnpj: formData.responsavelFinanceiro.cpf,
            phone: formData.responsavelFinanceiro.telefone,
            mobilePhone: formData.telefone,
            address: formData.endereco.logradouro,
            addressNumber: formData.endereco.numero,
            complement: formData.endereco.complemento,
            province: formData.endereco.bairro,
            postalCode: formData.endereco.cep,
            observations: `Responsável financeiro do aluno: ${formData.nome}`
          });
        } catch (error) {
          console.error('Erro ao atualizar cliente no Asaas:', error);
          setError('Erro ao atualizar cliente no Asaas: ' + error.message);
          return;
        }
      }

      await updateDoc(doc(db, 'alunos', id), {
        ...formData,
        updatedAt: serverTimestamp()
      });

      setOpenEditDialog(false);
      loadStudent();
    } catch (error) {
      console.error('Erro ao atualizar aluno:', error);
      setError('Erro ao atualizar aluno: ' + error.message);
    } finally {
      setLoading(false);
    }
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name.startsWith('endereco.')) {
      const enderecoField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        endereco: {
          ...prev.endereco,
          [enderecoField]: value
        }
      }));
    } else if (name.startsWith('responsavelFinanceiro.')) {
      const responsavelField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        responsavelFinanceiro: {
          ...prev.responsavelFinanceiro,
          [responsavelField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              {student.nome}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleEditClick}
              >
                Editar Aluno
              </Button>
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
                          primary="Profissão do Pai"
                          secondary={student.profissaoPai || 'Não informada'}
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
                          primary="Profissão da Mãe"
                          secondary={student.profissaoMae || 'Não informada'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Responsável Financeiro"
                          secondary={student.responsavelFinanceiro?.nome || 'Não informado'}
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
            <StudentHorariosTab studentId={id} />
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <PaymentsTab studentId={id} student={student} />
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

          {/* Dialog de Edição do Aluno */}
          <Dialog
            open={openEditDialog}
            onClose={() => setOpenEditDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="Telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="Data de Nascimento"
                  name="dataNascimento"
                  type="date"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />

                <Divider textAlign="left">Informações Familiares</Divider>
                
                <TextField
                  fullWidth
                  label="Nome do Pai"
                  name="nomePai"
                  value={formData.nomePai}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="Profissão do Pai"
                  name="profissaoPai"
                  value={formData.profissaoPai}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="Nome da Mãe"
                  name="nomeMae"
                  value={formData.nomeMae}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="Profissão da Mãe"
                  name="profissaoMae"
                  value={formData.profissaoMae}
                  onChange={handleChange}
                />

                <Divider textAlign="left">Responsável Financeiro</Divider>

                <TextField
                  fullWidth
                  label="Nome do Responsável Financeiro"
                  name="responsavelFinanceiro.nome"
                  value={formData.responsavelFinanceiro.nome}
                  onChange={handleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="Email do Responsável Financeiro"
                  name="responsavelFinanceiro.email"
                  type="email"
                  value={formData.responsavelFinanceiro.email}
                  onChange={handleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="CPF do Responsável Financeiro"
                  name="responsavelFinanceiro.cpf"
                  value={formData.responsavelFinanceiro.cpf}
                  onChange={handleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="Telefone do Responsável Financeiro"
                  name="responsavelFinanceiro.telefone"
                  value={formData.responsavelFinanceiro.telefone}
                  onChange={handleChange}
                />

                <Divider textAlign="left">Endereço</Divider>

                <TextField
                  fullWidth
                  label="Logradouro"
                  name="endereco.logradouro"
                  value={formData.endereco.logradouro}
                  onChange={handleChange}
                />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Número"
                      name="endereco.numero"
                      value={formData.endereco.numero}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={8}>
                    <TextField
                      fullWidth
                      label="Complemento"
                      name="endereco.complemento"
                      value={formData.endereco.complemento}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  label="Bairro"
                  name="endereco.bairro"
                  value={formData.endereco.bairro}
                  onChange={handleChange}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Cidade"
                      name="endereco.cidade"
                      value={formData.endereco.cidade}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      label="Estado"
                      name="endereco.estado"
                      value={formData.endereco.estado}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="CEP"
                      name="endereco.cep"
                      value={formData.endereco.cep}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>

                <Divider textAlign="left">Observações</Divider>

                <TextField
                  fullWidth
                  label="Observações"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  multiline
                  rows={4}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenEditDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleEditSubmit}
                variant="contained"
                disabled={!formData.nome || !formData.email || !formData.telefone}
              >
                Salvar
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Box>
    </MainLayout>
  );
} 