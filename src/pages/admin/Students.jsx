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
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    observacoes: ''
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentsQuery = query(collection(db, 'alunos'), orderBy('nome'));
      const querySnapshot = await getDocs(studentsQuery);
      const studentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      showNotification('Erro ao carregar alunos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingStudent(null);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      dataNascimento: '',
      observacoes: ''
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setFormData({
      nome: student.nome,
      email: student.email,
      telefone: student.telefone,
      dataNascimento: student.dataNascimento || '',
      observacoes: student.observacoes || ''
    });
    setOpen(true);
  };

  const handleDeleteClick = async (student) => {
    if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
      try {
        await deleteDoc(doc(db, 'alunos', student.id));
        showNotification('Aluno excluído com sucesso!');
        loadStudents();
      } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        showNotification('Erro ao excluir aluno', 'error');
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const studentData = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'alunos', editingStudent.id), studentData);
        showNotification('Aluno atualizado com sucesso!');
      } else {
        studentData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'alunos'), studentData);
        showNotification('Aluno cadastrado com sucesso!');
      }

      handleClose();
      loadStudents();
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      showNotification('Erro ao salvar aluno', 'error');
    }
  };

  return (
    <MainLayout title="Alunos">
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
            Novo Aluno
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
                  <TableCell>Nome</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell>Data de Nascimento</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.nome}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.telefone}</TableCell>
                    <TableCell>{student.dataNascimento}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="primary"
                        onClick={() => handleEditClick(student)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={() => handleDeleteClick(student)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhum aluno cadastrado
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
            {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Stack spacing={2}>
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
                <TextField
                  fullWidth
                  label="Observações"
                  name="observacoes"
                  value={formData.observacoes}
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