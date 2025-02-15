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
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  IconButton,
  DialogContentText,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tab,
  Tabs,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Products() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newProduct, setNewProduct] = useState({
    nome: '',
    valorCompra: '',
    valorVenda: '',
    valorVendaFunc: '',
    estoque: '',
    vencimento: ''
  });
  const [openSaleDialog, setOpenSaleDialog] = useState(false);
  const [saleData, setSaleData] = useState({
    productId: '',
    quantity: 1,
    total: 0,
    isEmployeeSale: false,
    paymentMethod: ''
  });
  const [currentTab, setCurrentTab] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    // Configurar o listener para produtos
    const produtosRef = collection(db, 'produtos');
    const q = query(produtosRef, orderBy('nome', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const produtosData = [];
      querySnapshot.forEach((doc) => {
        produtosData.push({ id: doc.id, ...doc.data() });
      });
      setProducts(produtosData);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar produtos:", error);
      setLoading(false);
    });

    // Cleanup subscription
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
        logsData.push({ id: doc.id, ...doc.data() });
      });
      setLogs(logsData);
      setLoadingLogs(false);
    }, (error) => {
      console.error("Erro ao buscar logs:", error);
      setLoadingLogs(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewProduct({
      nome: '',
      valorCompra: '',
      valorVenda: '',
      valorVendaFunc: '',
      estoque: '',
      vencimento: ''
    });
  };

  const handleOpenEditDialog = (product) => {
    setSelectedProduct({
      ...product,
      valorCompra: product.valorCompra?.toString().replace('.', ',') || '',
      valorVenda: product.valorVenda?.toString().replace('.', ',') || '',
      valorVendaFunc: product.valorVendaFunc?.toString().replace('.', ',') || '',
      vencimento: product.vencimento ? formatDateForInput(product.vencimento) : ''
    });
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedProduct(null);
  };

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleOpenSaleDialog = () => {
    setOpenSaleDialog(true);
    setSaleData({
      productId: '',
      quantity: 1,
      total: 0,
      isEmployeeSale: false,
      paymentMethod: ''
    });
  };

  const handleCloseSaleDialog = () => {
    setOpenSaleDialog(false);
    setSaleData({
      productId: '',
      quantity: 1,
      total: 0,
      isEmployeeSale: false,
      paymentMethod: ''
    });
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Converter valores numéricos
    if (['valorCompra', 'valorVenda', 'valorVendaFunc'].includes(name)) {
      // Remove R$ e espaços, depois remove tudo exceto números e vírgula
      processedValue = value.replace('R$', '').trim().replace(/[^\d,]/g, '');
      
      // Garante que só exista uma vírgula
      const matches = processedValue.match(/,/g);
      if (matches && matches.length > 1) {
        processedValue = processedValue.replace(/,/g, (match, index) => 
          index === processedValue.indexOf(',') ? match : ''
        );
      }
    } else if (name === 'estoque') {
      processedValue = value.replace(/[^\d]/g, '');
    }
    
    if (selectedProduct) {
      setSelectedProduct(prev => ({
        ...prev,
        [name]: processedValue
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
  };

  const handleCreateProduct = async () => {
    try {
      // Validar campos obrigatórios
      if (!newProduct.nome || !newProduct.valorVenda || !newProduct.estoque) {
        setSnackbar({
          open: true,
          message: 'Por favor, preencha todos os campos obrigatórios',
          severity: 'error'
        });
        return;
      }

      // Converter valores para números
      const convertToNumber = (value) => {
        if (!value) return 0;
        // Remove R$ e espaços, substitui vírgula por ponto
        const numberStr = value.replace('R$', '').trim().replace(',', '.');
        return Number(numberStr) || 0;
      };

      const productData = {
        nome: newProduct.nome,
        valorCompra: convertToNumber(newProduct.valorCompra),
        valorVenda: convertToNumber(newProduct.valorVenda),
        valorVendaFunc: convertToNumber(newProduct.valorVendaFunc),
        estoque: Number(newProduct.estoque) || 0,
        vencimento: newProduct.vencimento ? new Date(newProduct.vencimento) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'produtos'), productData);
      
      // Create log entry
      await createLogEntry('create_product', {
        productId: docRef.id,
        productName: newProduct.nome,
        price: convertToNumber(newProduct.valorVenda)
      });

      setSnackbar({
        open: true,
        message: 'Produto criado com sucesso!',
        severity: 'success'
      });
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao criar produto. Tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleUpdateProduct = async () => {
    try {
      if (!selectedProduct.nome || !selectedProduct.valorVenda || !selectedProduct.estoque) {
        setSnackbar({
          open: true,
          message: 'Por favor, preencha todos os campos obrigatórios',
          severity: 'error'
        });
        return;
      }

      const convertToNumber = (value) => {
        if (!value) return 0;
        const numberStr = value.replace('R$', '').trim().replace(',', '.');
        return Number(numberStr) || 0;
      };

      const productData = {
        nome: selectedProduct.nome,
        valorCompra: convertToNumber(selectedProduct.valorCompra),
        valorVenda: convertToNumber(selectedProduct.valorVenda),
        valorVendaFunc: convertToNumber(selectedProduct.valorVendaFunc),
        estoque: Number(selectedProduct.estoque) || 0,
        vencimento: selectedProduct.vencimento ? new Date(selectedProduct.vencimento) : null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'produtos', selectedProduct.id), productData);
      
      // Create log entry
      await createLogEntry('update_product', {
        productId: selectedProduct.id,
        productName: selectedProduct.nome,
        changes: {
          price: convertToNumber(selectedProduct.valorVenda),
          stock: Number(selectedProduct.estoque)
        }
      });

      setSnackbar({
        open: true,
        message: 'Produto atualizado com sucesso!',
        severity: 'success'
      });
      handleCloseEditDialog();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar produto. Tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleDeleteProduct = async () => {
    try {
      await deleteDoc(doc(db, 'produtos', selectedProduct.id));
      
      setSnackbar({
        open: true,
        message: 'Produto excluído com sucesso!',
        severity: 'success'
      });
      handleCloseDeleteDialog();
      handleCloseEditDialog();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao excluir produto. Tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    const numValue = Number(value);
    if (isNaN(numValue)) return 'R$ 0,00';
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    // Se date for um timestamp do Firestore
    if (date.toDate) {
      return date.toDate().toLocaleDateString('pt-BR');
    }
    // Se date for uma string
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleSaleSubmit = async () => {
    try {
      const product = products.find(p => p.id === saleData.productId);
      if (!product) {
        setSnackbar({
          open: true,
          message: 'Produto não encontrado',
          severity: 'error'
        });
        return;
      }

      if (saleData.quantity > product.estoque) {
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
      const newStock = product.estoque - saleData.quantity;
      await updateDoc(doc(db, 'produtos', product.id), {
        estoque: newStock,
        updatedAt: serverTimestamp()
      });

      // Registrar a venda
      await addDoc(collection(db, 'vendas'), {
        produtoId: product.id,
        produtoNome: product.nome,
        quantidade: saleData.quantity,
        valorUnitario: saleData.isEmployeeSale ? product.valorVendaFunc : product.valorVenda,
        valorTotal: saleData.total,
        isEmployeeSale: saleData.isEmployeeSale,
        formaPagamento: saleData.paymentMethod,
        dataVenda: serverTimestamp(),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      // Create log entry
      await createLogEntry('new_sale', {
        productId: product.id,
        productName: product.nome,
        quantity: saleData.quantity,
        total: saleData.total,
        isEmployeeSale: saleData.isEmployeeSale,
        paymentMethod: saleData.paymentMethod
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
      case 'create_product':
        return <AddIcon color="primary" />;
      case 'update_product':
        return <EditIcon color="warning" />;
      default:
        return <HistoryIcon />;
    }
  };

  const getLogMessage = (log) => {
    switch (log.action) {
      case 'new_sale':
        return `Venda: ${log.details.quantity}x ${log.details.productName} - ${formatCurrency(log.details.total)} (${log.details.paymentMethod})`;
      case 'create_product':
        return `Novo produto: ${log.details.productName} - ${formatCurrency(log.details.price)}`;
      case 'update_product':
        return `Produto atualizado: ${log.details.productName}`;
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

  if (loading || loadingLogs) {
    return (
      <MainLayout title="Cantina">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Cantina">
      <Box sx={{ p: 3 }}>
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#fff' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ShoppingCartIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5" sx={{ color: '#1a1a1a', fontWeight: 600 }}>
                Gestão da Cantina
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
                    onClick={handleOpenDialog}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      px: 3
                    }}
                  >
                    Novo Produto
                  </Button>
                </>
              )}
            </Stack>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
              <Tab label="Produtos" />
              <Tab label="Histórico" />
            </Tabs>
          </Box>

          {currentTab === 0 ? (
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#666' }}>Nome do Produto</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#666' }}>Valor de Compra</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#666' }}>Valor de Venda</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#666' }}>Valor Func.</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#666' }}>Estoque</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#666' }}>Vencimento</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#666' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} hover>
                      <TableCell>{product.nome || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography sx={{ color: 'text.secondary' }}>
                          {formatCurrency(product.valorCompra)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ color: 'success.main', fontWeight: 500 }}>
                          {formatCurrency(product.valorVenda)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ color: 'info.main', fontWeight: 500 }}>
                          {formatCurrency(product.valorVendaFunc)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={product.estoque}
                          size="small"
                          color={product.estoque > 0 ? 'success' : 'error'}
                          sx={{ 
                            borderRadius: 1,
                            minWidth: 40,
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(product.vencimento)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => handleOpenEditDialog(product)}
                          size="small"
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="textSecondary">
                          Nenhum produto cadastrado
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
                                  log.action === 'create_product' ? 'Novo Produto' :
                                  log.action === 'update_product' ? 'Atualização' : 'Outro'}
                            color={log.action === 'new_sale' ? 'success' :
                                  log.action === 'create_product' ? 'primary' :
                                  log.action === 'update_product' ? 'warning' : 'default'}
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
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Diálogos existentes continuam aqui... */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Criar Novo Produto</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Nome do Produto"
                name="nome"
                value={newProduct.nome}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                label="Valor de Compra"
                name="valorCompra"
                value={newProduct.valorCompra}
                onChange={handleInputChange}
                fullWidth
                type="text"
                InputProps={{
                  startAdornment: 'R$ '
                }}
              />
              <TextField
                label="Valor de Venda"
                name="valorVenda"
                value={newProduct.valorVenda}
                onChange={handleInputChange}
                fullWidth
                required
                type="text"
                InputProps={{
                  startAdornment: 'R$ '
                }}
              />
              <TextField
                label="Valor Venda Funcionário"
                name="valorVendaFunc"
                value={newProduct.valorVendaFunc}
                onChange={handleInputChange}
                fullWidth
                type="text"
                InputProps={{
                  startAdornment: 'R$ '
                }}
              />
              <TextField
                label="Estoque"
                name="estoque"
                value={newProduct.estoque}
                onChange={handleInputChange}
                fullWidth
                required
                type="number"
              />
              <TextField
                label="Data de Vencimento"
                name="vencimento"
                value={newProduct.vencimento}
                onChange={handleInputChange}
                fullWidth
                type="date"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleCreateProduct} variant="contained">
              Criar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Nome do Produto"
                name="nome"
                value={selectedProduct?.nome || ''}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                label="Valor de Compra"
                name="valorCompra"
                value={selectedProduct?.valorCompra || ''}
                onChange={handleInputChange}
                fullWidth
                type="text"
                InputProps={{
                  startAdornment: 'R$ '
                }}
              />
              <TextField
                label="Valor de Venda"
                name="valorVenda"
                value={selectedProduct?.valorVenda || ''}
                onChange={handleInputChange}
                fullWidth
                required
                type="text"
                InputProps={{
                  startAdornment: 'R$ '
                }}
              />
              <TextField
                label="Valor Venda Funcionário"
                name="valorVendaFunc"
                value={selectedProduct?.valorVendaFunc || ''}
                onChange={handleInputChange}
                fullWidth
                type="text"
                InputProps={{
                  startAdornment: 'R$ '
                }}
              />
              <TextField
                label="Estoque"
                name="estoque"
                value={selectedProduct?.estoque || ''}
                onChange={handleInputChange}
                fullWidth
                required
                type="number"
              />
              <TextField
                label="Data de Vencimento"
                name="vencimento"
                value={selectedProduct?.vencimento || ''}
                onChange={handleInputChange}
                fullWidth
                type="date"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            {currentUser?.userType === 'master' && (
              <Button 
                onClick={handleOpenDeleteDialog}
                color="error"
                startIcon={<DeleteIcon />}
              >
                Excluir
              </Button>
            )}
            <Button onClick={handleCloseEditDialog}>Cancelar</Button>
            <Button onClick={handleUpdateProduct} variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
            <Button onClick={handleDeleteProduct} color="error" variant="contained">
              Excluir
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
                <InputLabel>Produto</InputLabel>
                <Select
                  value={saleData.productId}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    setSaleData(prev => ({
                      ...prev,
                      productId: e.target.value,
                      total: product ? (prev.isEmployeeSale ? product.valorVendaFunc : product.valorVenda) * prev.quantity : 0
                    }));
                  }}
                  label="Produto"
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.nome} - R$ {product.valorVenda?.toFixed(2)} {product.valorVendaFunc ? `(Func: R$ ${product.valorVendaFunc?.toFixed(2)})` : ''} (Estoque: {product.estoque})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  sx={{ flex: 1 }}
                  label="Quantidade"
                  type="number"
                  value={saleData.quantity}
                  onChange={(e) => {
                    const quantity = parseInt(e.target.value) || 1;
                    const product = products.find(p => p.id === saleData.productId);
                    setSaleData(prev => ({
                      ...prev,
                      quantity,
                      total: product ? (prev.isEmployeeSale ? product.valorVendaFunc : product.valorVenda) * quantity : 0
                    }));
                  }}
                  InputProps={{
                    inputProps: { min: 1 }
                  }}
                  required
                />

                <FormControl component="fieldset">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={saleData.isEmployeeSale}
                      onChange={(e) => {
                        const isEmployeeSale = e.target.checked;
                        const product = products.find(p => p.id === saleData.productId);
                        setSaleData(prev => ({
                          ...prev,
                          isEmployeeSale,
                          total: product ? (isEmployeeSale ? product.valorVendaFunc : product.valorVenda) * prev.quantity : 0
                        }));
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <Typography>Venda para funcionário</Typography>
                  </Box>
                </FormControl>
              </Box>

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
              disabled={!saleData.productId || saleData.quantity < 1}
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
} 