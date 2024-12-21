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
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newProduct, setNewProduct] = useState({
    nome: '',
    valorCompra: '',
    valorVenda: '',
    valorVendaFunc: '',
    estoque: '',
    vencimento: ''
  });

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
    
    setNewProduct(prev => ({
      ...prev,
      [name]: processedValue
    }));
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

      await addDoc(collection(db, 'produtos'), productData);
      
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

  if (loading) {
    return (
      <MainLayout title="Produtos">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Produtos">
      <Box sx={{ p: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4 
        }}>
          <Typography variant="h5" sx={{ color: '#000' }}>
            Produtos
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              sx={{ 
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#115293'
                }
              }}
            >
              Criar Produto
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              sx={{
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': {
                  borderColor: '#115293',
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              Editar Estoque
            </Button>
          </Stack>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome do Produto</TableCell>
                <TableCell align="right">Valor de Compra</TableCell>
                <TableCell align="right">Valor de Venda</TableCell>
                <TableCell align="right">Valor Venda Func.</TableCell>
                <TableCell align="right">Estoque</TableCell>
                <TableCell>Vencimento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.nome || '-'}</TableCell>
                  <TableCell align="right">{formatCurrency(product.valorCompra)}</TableCell>
                  <TableCell align="right">{formatCurrency(product.valorVenda)}</TableCell>
                  <TableCell align="right">{formatCurrency(product.valorVendaFunc)}</TableCell>
                  <TableCell align="right">{product.estoque || 0}</TableCell>
                  <TableCell>{formatDate(product.vencimento)}</TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhum produto cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Diálogo para criar novo produto */}
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

        {/* Snackbar para feedback */}
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