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
import { asaasService } from '../../services/asaasService';

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
    telefone2: '',
    dataNascimento: '',
    nomePai: '',
    nomeMae: '',
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

  // Função para obter o próximo número de matrícula
  const getNextMatriculaNumber = async () => {
    try {
      const studentsQuery = query(collection(db, 'alunos'), orderBy('matricula', 'desc'));
      const querySnapshot = await getDocs(studentsQuery);
      
      if (querySnapshot.empty) {
        return 1; // Primeiro aluno
      }
      
      const highestMatricula = querySnapshot.docs[0].data().matricula || 0;
      return highestMatricula + 1;
    } catch (error) {
      console.error('Erro ao gerar número de matrícula:', error);
      throw error;
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
      telefone2: '',
      dataNascimento: '',
      nomePai: '',
      nomeMae: '',
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

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setFormData({
      nome: student.nome,
      email: student.email,
      telefone: student.telefone,
      telefone2: student.telefone2 || '',
      dataNascimento: student.dataNascimento || '',
      nomePai: student.nomePai || '',
      nomeMae: student.nomeMae || '',
      responsavelFinanceiro: student.responsavelFinanceiro || {
        nome: '',
        email: '',
        cpf: '',
        telefone: ''
      },
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
      setLoading(true);

      // Validação dos campos do responsável financeiro
      if (!formData.responsavelFinanceiro.nome || 
          !formData.responsavelFinanceiro.email || 
          !formData.responsavelFinanceiro.cpf) {
        showNotification('Nome, email e CPF do responsável financeiro são obrigatórios', 'error');
        return;
      }

      // Validação do CPF
      const cpfNumbers = formData.responsavelFinanceiro.cpf.replace(/\D/g, '');
      if (cpfNumbers.length !== 11) {
        showNotification('CPF do responsável financeiro inválido', 'error');
        return;
      }

      // Validação do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.responsavelFinanceiro.email)) {
        showNotification('Email do responsável financeiro inválido', 'error');
        return;
      }

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
        // Gerar novo número de matrícula apenas para novos alunos
        const nextMatricula = await getNextMatriculaNumber();
        studentData.matricula = nextMatricula;
        studentData.createdAt = serverTimestamp();
        
        // Criar cliente no Asaas
        try {
          const asaasCustomer = await asaasService.createCustomer({
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
            notificationDisabled: false,
            observations: `Responsável financeiro do aluno: ${formData.nome}`
          });
          
          // Adicionar o ID do cliente Asaas aos dados do aluno
          studentData.asaasCustomerId = asaasCustomer.id;
        } catch (error) {
          console.error('Erro ao criar cliente no Asaas:', error);
          showNotification('Erro ao criar cliente no Asaas: ' + error.message, 'error');
          return;
        }

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
    } finally {
      setLoading(false);
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

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Matrícula</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhum aluno encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    hover
                    onClick={() => handleRowClick(student)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      {student.matricula ? 
                        String(student.matricula).padStart(4, '0') : 
                        'N/A'}
                    </TableCell>
                    <TableCell>{student.nome}</TableCell>
                    <TableCell>{student.responsavelFinanceiro?.nome || '-'}</TableCell>
                    <TableCell>{student.telefone}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(student);
                        }}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(student);
                        }}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

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
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Telefone 2"
                      name="telefone2"
                      value={formData.telefone2}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>
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
                  name="responsavelFinanceiro.nome"
                  value={formData.responsavelFinanceiro.nome}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="Email do Responsável Financeiro"
                  name="responsavelFinanceiro.email"
                  value={formData.responsavelFinanceiro.email}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="CPF do Responsável Financeiro"
                  name="responsavelFinanceiro.cpf"
                  value={formData.responsavelFinanceiro.cpf}
                  onChange={handleChange}
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