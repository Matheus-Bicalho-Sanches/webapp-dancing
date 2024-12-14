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
  InputAdornment,
  Divider,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    nomePai: '',
    nomeMae: '',
    responsavelFinanceiro: '',
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
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    // Filtrar alunos quando o termo de pesquisa mudar
    const filtered = students.filter(student =>
      student.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

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
      setFilteredStudents(studentsData);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      showNotification('Erro ao carregar alunos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleRowClick = (student) => {
    // Abrir perfil do aluno em nova aba
    window.open(`/admin/alunos/${student.id}`, '_blank');
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
      nomePai: '',
      nomeMae: '',
      responsavelFinanceiro: '',
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
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setFormData({
      nome: student.nome,
      email: student.email,
      telefone: student.telefone,
      dataNascimento: student.dataNascimento || '',
      nomePai: student.nomePai || '',
      nomeMae: student.nomeMae || '',
      responsavelFinanceiro: student.responsavelFinanceiro || '',
      endereco: student.endereco || {
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      },
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

      let studentId;
      if (editingStudent) {
        await updateDoc(doc(db, 'alunos', editingStudent.id), studentData);
        showNotification('Aluno atualizado com sucesso!');
        studentId = editingStudent.id;
      } else {
        studentData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'alunos'), studentData);
        showNotification('Aluno cadastrado com sucesso!');
        studentId = docRef.id;
      }

      handleClose();
      loadStudents();
      
      // Redirecionar para o perfil do aluno após criar/editar
      navigate(`/admin/alunos/${studentId}`);
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
          mb: 3,
          gap: 2
        }}>
          <TextField
            placeholder="Pesquisar aluno..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 300 }}
          />
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
                {filteredStudents.map((student) => (
                  <TableRow 
                    key={student.id}
                    onClick={() => handleRowClick(student)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <TableCell>{student.nome}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.telefone}</TableCell>
                    <TableCell>{student.dataNascimento}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(student);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {searchTerm ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
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
                  label="Nome da Mãe"
                  name="nomeMae"
                  value={formData.nomeMae}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="Responsável Financeiro"
                  name="responsavelFinanceiro"
                  value={formData.responsavelFinanceiro}
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