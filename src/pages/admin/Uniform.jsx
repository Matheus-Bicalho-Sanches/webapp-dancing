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
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Uniform() {
  const { currentUser } = useAuth();
  const [uniforms, setUniforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUniform, setEditingUniform] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tamanho: '',
    preco: '',
    quantidade: '',
    categoria: ''
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

  const handleOpenDialog = (uniform = null) => {
    if (uniform) {
      setEditingUniform(uniform);
      setFormData({
        nome: uniform.nome,
        descricao: uniform.descricao || '',
        tamanho: uniform.tamanho,
        preco: uniform.preco.toString(),
        quantidade: uniform.quantidade.toString(),
        categoria: uniform.categoria
      });
    } else {
      setEditingUniform(null);
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
    setEditingUniform(null);
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

      if (editingUniform) {
        await updateDoc(doc(db, 'uniforms', editingUniform.id), uniformData);
        setSnackbar({
          open: true,
          message: 'Uniforme atualizado com sucesso!',
          severity: 'success'
        });
      } else {
        await addDoc(collection(db, 'uniforms'), {
          ...uniformData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
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

  if (loading) {
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
        </Box>

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
            {editingUniform ? 'Editar Uniforme' : 'Novo Uniforme'}
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
            {editingUniform ? 'Salvar' : 'Criar'}
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