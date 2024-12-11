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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function Enrollment() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [formData, setFormData] = useState({
    alunoId: '',
    valor: '',
    dataMatricula: new Date().toISOString().split('T')[0],
    status: 'ativa'
  });

  useEffect(() => {
    loadEnrollments();
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const studentsQuery = query(collection(db, 'alunos'), orderBy('nome'));
      const querySnapshot = await getDocs(studentsQuery);
      const studentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      const enrollmentsQuery = query(collection(db, 'matriculas'));
      const querySnapshot = await getDocs(enrollmentsQuery);
      const enrollmentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Erro ao carregar matrículas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEnrollment(null);
    setFormData({
      alunoId: '',
      valor: '',
      dataMatricula: new Date().toISOString().split('T')[0],
      status: 'ativa'
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditClick = (enrollment) => {
    setEditingEnrollment(enrollment);
    setFormData({
      alunoId: enrollment.alunoId,
      valor: enrollment.valor,
      dataMatricula: enrollment.dataMatricula,
      status: enrollment.status
    });
    setOpen(true);
  };

  const handleDeleteClick = async (enrollment) => {
    if (window.confirm('Tem certeza que deseja excluir esta matrícula?')) {
      try {
        await deleteDoc(doc(db, 'matriculas', enrollment.id));
        loadEnrollments();
      } catch (error) {
        console.error('Erro ao excluir matrícula:', error);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const enrollmentData = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (editingEnrollment) {
        await updateDoc(doc(db, 'matriculas', editingEnrollment.id), enrollmentData);
      } else {
        enrollmentData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'matriculas'), enrollmentData);
      }

      handleClose();
      loadEnrollments();
    } catch (error) {
      console.error('Erro ao salvar matrícula:', error);
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.nome : 'Aluno não encontrado';
  };

  return (
    <MainLayout title="Matrículas">
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
            Nova Matrícula
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
                  <TableCell>Aluno</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Data da Matrícula</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>{getStudentName(enrollment.alunoId)}</TableCell>
                    <TableCell>
                      {Number(enrollment.valor).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </TableCell>
                    <TableCell>{enrollment.dataMatricula}</TableCell>
                    <TableCell>{enrollment.status}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="primary"
                        onClick={() => handleEditClick(enrollment)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={() => handleDeleteClick(enrollment)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {enrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhuma matrícula cadastrada
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
            {editingEnrollment ? 'Editar Matrícula' : 'Nova Matrícula'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Stack spacing={2}>
                <FormControl fullWidth required>
                  <InputLabel>Aluno</InputLabel>
                  <Select
                    name="alunoId"
                    value={formData.alunoId}
                    onChange={handleChange}
                    label="Aluno"
                  >
                    {students.map((student) => (
                      <MenuItem key={student.id} value={student.id}>
                        {student.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

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
                  label="Data da Matrícula"
                  name="dataMatricula"
                  type="date"
                  value={formData.dataMatricula}
                  onChange={handleChange}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />

                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    <MenuItem value="ativa">Ativa</MenuItem>
                    <MenuItem value="inativa">Inativa</MenuItem>
                    <MenuItem value="cancelada">Cancelada</MenuItem>
                  </Select>
                </FormControl>
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