import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
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
  Box,
  Stack,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function Enrollment() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    valor: '',
    descricao: ''
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansQuery = query(collection(db, 'planos'), orderBy('nome'));
      const querySnapshot = await getDocs(plansQuery);
      const plansData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlans(plansData);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingPlan(null);
    setFormData({
      nome: '',
      valor: '',
      descricao: ''
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditClick = (plan) => {
    setEditingPlan(plan);
    setFormData({
      nome: plan.nome,
      valor: plan.valor,
      descricao: plan.descricao || ''
    });
    setOpen(true);
  };

  const handleDeleteClick = async (plan) => {
    if (window.confirm('Tem certeza que deseja excluir este plano?')) {
      try {
        await deleteDoc(doc(db, 'planos', plan.id));
        loadPlans();
      } catch (error) {
        console.error('Erro ao excluir plano:', error);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const planData = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (editingPlan) {
        await updateDoc(doc(db, 'planos', editingPlan.id), planData);
      } else {
        planData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'planos'), planData);
      }

      handleClose();
      loadPlans();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
    }
  };

  return (
    <MainLayout title="Planos de Matrícula">
      <Box sx={{ p: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3 
        }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleOpen}
          >
            Novo Plano
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome do Plano</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.nome}</TableCell>
                    <TableCell>
                      {Number(plan.valor).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </TableCell>
                    <TableCell>{plan.descricao}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="primary"
                        onClick={() => handleEditClick(plan)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={() => handleDeleteClick(plan)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Nenhum plano cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog 
          open={open} 
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingPlan ? 'Editar Plano' : 'Novo Plano'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Nome do Plano"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />

                <TextField
                  fullWidth
                  label="Valor"
                  name="valor"
                  type="number"
                  value={formData.valor}
                  onChange={handleChange}
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                />

                <TextField
                  fullWidth
                  label="Descrição"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  multiline
                  rows={4}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="contained"
              >
                Salvar
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </MainLayout>
  );
} 