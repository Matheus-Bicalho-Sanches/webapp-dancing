import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Stack,
  InputAdornment,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Uniform() {
  const { currentUser } = useAuth();
  const [uniforms, setUniforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openSaleDialog, setOpenSaleDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [currentTab, setCurrentTab] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tamanho: '',
    preco: '',
    quantidade: '',
    categoria: ''
  });

  const [saleData, setSaleData] = useState({
    uniformId: '',
    quantity: 1,
    total: 0,
    paymentMethod: ''
  });

  const tamanhos = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
  const categorias = ['Uniforme Treino', 'Uniforme Competição', 'Acessórios'];

  useEffect(() => {
    const q = query(
      collection(db, 'uniforms'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const uniformsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUniforms(uniformsData);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar uniformes:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao carregar uniformes. Por favor, tente novamente.',
          severity: 'error'
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const logsRef = collection(db, 'logs');
    const q = query(
      logsRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logsData = [];
      querySnapshot.forEach((doc) => {
        const log = doc.data();
        if (log.details && (log.details.categoria === 'Uniforme' || log.action === 'create_uniform' || log.action === 'update_uniform')) {
          logsData.push({ id: doc.id, ...log });
        }
      });
      setLogs(logsData);
      setLoadingLogs(false);
    }, (error) => {
      console.error("Erro ao buscar logs:", error);
      setLoadingLogs(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenDialog = (uniform = null) => {
    if (uniform) {
      setSelectedProduct(uniform);
      setFormData({
        nome: uniform.nome,
        descricao: uniform.descricao || '',
        tamanho: uniform.tamanho,
        preco: uniform.preco.toString(),
        quantidade: uniform.quantidade.toString(),
        categoria: uniform.categoria
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        nome: '',
        descricao: '',
        tamanho: '',
        preco: '',
        quantidade: '',
        categoria: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduct(null);
  };

  const handleSubmit = async () => {
    try {
      const uniformData = {
        ...formData,
        preco: parseFloat(formData.preco),
        quantidade: parseInt(formData.quantidade),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (selectedProduct) {
        await updateDoc(doc(db, 'uniforms', selectedProduct.id), uniformData);
        await createLogEntry('update_uniform', {
          uniformId: selectedProduct.id,
          uniformName: uniformData.nome,
          changes: {
            price: uniformData.preco,
            stock: uniformData.quantidade
          }
        });
        setSnackbar({
          open: true,
          message: 'Uniforme atualizado com sucesso!',
          severity: 'success'
        });
      } else {
        const docRef = await addDoc(collection(db, 'uniforms'), {
          ...uniformData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
        await createLogEntry('create_uniform', {
          uniformId: docRef.id,
          uniformName: uniformData.nome,
          price: uniformData.preco
        });
        setSnackbar({
          open: true,
          message: 'Uniforme criado com sucesso!',
          severity: 'success'
        });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar uniforme:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar uniforme. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (uniformId) => {
    if (window.confirm('Tem certeza que deseja excluir este uniforme?')) {
      try {
        await deleteDoc(doc(db, 'uniforms', uniformId));
        setSnackbar({
          open: true,
          message: 'Uniforme excluído com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir uniforme:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir uniforme. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    }
  };

  const handleOpenSaleDialog = () => {
    setOpenSaleDialog(true);
    setSaleData({
      uniformId: '',
      quantity: 1,
      total: 0,
      paymentMethod: ''
    });
  };

  const handleCloseSaleDialog = () => {
    setOpenSaleDialog(false);
    setSaleData({
      uniformId: '',
      quantity: 1,
      total: 0,
      paymentMethod: ''
    });
  };

  const handleSaleSubmit = async () => {
    try {
      const uniform = uniforms.find(u => u.id === saleData.uniformId);
      if (!uniform) {
        setSnackbar({
          open: true,
          message: 'Uniforme não encontrado',
          severity: 'error'
        });
        return;
      }

      if (saleData.quantity > uniform.quantidade) {
        setSnackbar({
          open: true,
          message: 'Quantidade maior que o estoque disponível',
          severity: 'error'
        });
        return;
      }

      if (!saleData.paymentMethod) {
        setSnackbar({
          open: true,
          message: 'Selecione uma forma de pagamento',
          severity: 'error'
        });
        return;
      }

      // Atualizar o estoque
      const newStock = uniform.quantidade - saleData.quantity;
      await updateDoc(doc(db, 'uniforms', uniform.id), {
        quantidade: newStock,
        updatedAt: serverTimestamp()
      });

      // Registrar a venda na nova coleção uniform_sales
      await addDoc(collection(db, 'uniform_sales'), {
        produtoId: uniform.id,
        produtoNome: uniform.nome,
        quantidade: saleData.quantity,
        valorUnitario: uniform.preco,
        valorTotal: saleData.total,
        formaPagamento: saleData.paymentMethod,
        dataVenda: serverTimestamp(),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      // Criar log da venda
      await createLogEntry('new_sale', {
        uniformId: uniform.id,
        uniformName: uniform.nome,
        quantity: saleData.quantity,
        total: saleData.total,
        paymentMethod: saleData.paymentMethod,
        categoria: 'Uniforme'
      });

      setSnackbar({
        open: true,
        message: 'Venda registrada com sucesso!',
        severity: 'success'
      });
      handleCloseSaleDialog();
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao registrar venda. Tente novamente.',
        severity: 'error'
      });
    }
  };

  const createLogEntry = async (action, details) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userName = userDoc.exists() ? userDoc.data().name || currentUser.email : currentUser.email;
      
      await addDoc(collection(db, 'logs'), {
        action,
        details,
        userId: currentUser.uid,
        userName,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao criar log:', error);
    }
  };

  const getLogIcon = (action) => {
    switch (action) {
      case 'new_sale':
        return <MoneyIcon color="success" />;
      case 'create_uniform':
        return <AddIcon color="primary" />;
      case 'update_uniform':
        return <EditIcon color="warning" />;
      default:
        return <HistoryIcon />;
    }
  };

  const getLogMessage = (log) => {
    switch (log.action) {
      case 'new_sale':
        return `Venda: ${log.details.quantity}x ${log.details.uniformName} - ${formatCurrency(log.details.total)} (${log.details.paymentMethod})`;
      case 'create_uniform':
        return `Novo uniforme: ${log.details.uniformName} - ${formatCurrency(log.details.price)}`;
      case 'update_uniform':
        return `Uniforme atualizado: ${log.details.uniformName}`;
      default:
        return 'Ação desconhecida';
    }
  };

  const formatLogDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading || loadingLogs) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#fff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ color: '#1a1a1a', fontWeight: 600 }}>
              Gestão de Uniformes
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            {currentTab === 0 && (
              <>
                <Button
                  variant="contained"
                  startIcon={<ShoppingCartIcon />}
                  onClick={handleOpenSaleDialog}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    px: 3
                  }}
                >
                  Nova Venda
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    px: 3
                  }}
                >
                  Novo Uniforme
                </Button>
              </>
            )}
          </Stack>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="Uniformes" />
            <Tab label="Histórico" />
          </Tabs>
        </Box>

        {currentTab === 0 ? (
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Categoria</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Tamanho</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Preço</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Quantidade</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Descrição</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#666' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uniforms.map((uniform) => (
                  <TableRow key={uniform.id} hover>
                    <TableCell>{uniform.nome}</TableCell>
                    <TableCell>
                      <Chip 
                        label={uniform.categoria}
                        size="small"
                        color={
                          uniform.categoria === 'Uniforme Treino' ? 'primary' :
                          uniform.categoria === 'Uniforme Competição' ? 'secondary' :
                          'default'
                        }
                        sx={{ 
                          borderRadius: 1,
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={uniform.tamanho}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          borderRadius: 1,
                          minWidth: 40,
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: 'success.main', fontWeight: 500 }}>
                        R$ {uniform.preco.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={uniform.quantidade}
                        size="small"
                        color={uniform.quantidade > 0 ? 'success' : 'error'}
                        sx={{ 
                          borderRadius: 1,
                          minWidth: 40,
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {uniform.descricao || '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(uniform)}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(uniform.id)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {uniforms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="textSecondary">
                        Nenhum uniforme cadastrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Data/Hora</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Ação</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Usuário</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666' }}>Detalhes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{formatLogDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getLogIcon(log.action)}
                        <Chip
                          label={log.action === 'new_sale' ? 'Venda' : 
                                log.action === 'create_uniform' ? 'Novo Uniforme' :
                                log.action === 'update_uniform' ? 'Atualização' : 'Outro'}
                          color={log.action === 'new_sale' ? 'success' :
                                log.action === 'create_uniform' ? 'primary' :
                                log.action === 'update_uniform' ? 'warning' : 'default'}
                          size="small"
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.userName}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />
                          <Typography variant="body2">
                            {log.userName.includes('@') ? log.userName.split('@')[0] : log.userName}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{getLogMessage(log)}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="textSecondary">
                        Nenhum registro encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid #e0e0e0',
          px: 3,
          py: 2
        }}>
          <Typography variant="h6" sx={{ color: '#1a1a1a', fontWeight: 600 }}>
            {selectedProduct ? 'Editar Uniforme' : 'Novo Uniforme'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                variant="outlined"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  label="Categoria"
                >
                  {categorias.map((categoria) => (
                    <MenuItem key={categoria} value={categoria}>
                      {categoria}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Tamanho</InputLabel>
                <Select
                  value={formData.tamanho}
                  onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  label="Tamanho"
                >
                  {tamanhos.map((tamanho) => (
                    <MenuItem key={tamanho} value={tamanho}>
                      {tamanho}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Preço"
                type="number"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                required
                inputProps={{ step: "0.01", min: "0" }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1, color: '#666' }}>R$</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Quantidade"
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                required
                inputProps={{ min: "0" }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                multiline
                rows={4}
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{ 
              color: '#666',
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.nome || !formData.tamanho || !formData.preco || !formData.quantidade || !formData.categoria}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              borderRadius: 1
            }}
          >
            {selectedProduct ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openSaleDialog}
        onClose={handleCloseSaleDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nova Venda</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Uniforme</InputLabel>
              <Select
                value={saleData.uniformId}
                onChange={(e) => {
                  const uniform = uniforms.find(u => u.id === e.target.value);
                  setSaleData(prev => ({
                    ...prev,
                    uniformId: e.target.value,
                    total: uniform ? uniform.preco * prev.quantity : 0
                  }));
                }}
                label="Uniforme"
              >
                {uniforms.map((uniform) => (
                  <MenuItem key={uniform.id} value={uniform.id}>
                    {uniform.nome} - {uniform.categoria} - {uniform.tamanho} - R$ {uniform.preco?.toFixed(2)} (Estoque: {uniform.quantidade})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantidade"
              type="number"
              value={saleData.quantity}
              onChange={(e) => {
                const quantity = parseInt(e.target.value) || 1;
                const uniform = uniforms.find(u => u.id === saleData.uniformId);
                setSaleData(prev => ({
                  ...prev,
                  quantity,
                  total: uniform ? uniform.preco * quantity : 0
                }));
              }}
              InputProps={{
                inputProps: { min: 1 }
              }}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Forma de Pagamento</InputLabel>
              <Select
                value={saleData.paymentMethod}
                onChange={(e) => setSaleData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                label="Forma de Pagamento"
              >
                <MenuItem value="pix">PIX</MenuItem>
                <MenuItem value="dinheiro">Dinheiro</MenuItem>
                <MenuItem value="debito">Cartão de Débito</MenuItem>
                <MenuItem value="credito">Cartão de Crédito</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Total"
              type="number"
              value={saleData.total.toFixed(2)}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                readOnly: true
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaleDialog}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaleSubmit}
            variant="contained"
            disabled={!saleData.uniformId || saleData.quantity < 1 || !saleData.paymentMethod}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 1 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 