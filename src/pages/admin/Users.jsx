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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { listUsers, createUser, updateUser, deleteUser } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';

// Tipos de usuário
const USER_TYPES = {
  master: 'Master',
  administrative: 'Administrativo',
  teacher: 'Professor',
  atelier: 'Ateliê',
  cleaning: 'Limpeza'
};

export default function Users() {
  // Context
  const { currentUser } = useAuth();

  // Estados
  const [users, setUsers] = useState([]);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    userType: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Debug log para currentUser
  useEffect(() => {
    console.log('Current User:', currentUser);
  }, [currentUser]);

  // Carregar usuários
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await listUsers();
      console.log('Usuários carregados:', data);
      setUsers(data);
    } catch (error) {
      setError('Erro ao carregar usuários');
      console.error('Erro ao carregar usuários:', error);
    }
  };

  // Verificar se o usuário é master
  const isMasterUser = () => {
    const isMaster = currentUser?.userType === 'master';
    console.log('Verificação de Master:', { 
      userType: currentUser?.userType, 
      isMaster 
    });
    return isMaster;
  };

  // Verificar se o usuário pode editar outro usuário
  const canEditUser = (user) => {
    // Se for master, pode editar qualquer usuário
    if (currentUser?.userType === 'master') {
      return true;
    }
    
    // Se for administrative, pode editar qualquer usuário exceto master
    if (currentUser?.userType === 'administrative' && user.userType !== 'master') {
      return true;
    }
    
    // Se for professor ou ateliê, só pode editar o próprio perfil
    if ((currentUser?.userType === 'teacher' || currentUser?.userType === 'atelier') && user.id === currentUser?.uid) {
      return true;
    }
    
    return false;
  };

  // Verificar se o usuário pode adicionar novos usuários
  const canAddUser = () => {
    return currentUser?.userType === 'master' || currentUser?.userType === 'administrative';
  };

  // Verificar se o usuário pode excluir usuários
  const canDeleteUser = () => {
    return currentUser?.userType === 'master';
  };

  // Handlers
  const handleOpenCreateDialog = () => {
    console.log('Abrindo diálogo de criação. É master?', isMasterUser());
    setFormData({
      name: '',
      email: '',
      whatsapp: '',
      userType: '',
      password: ''
    });
    setOpenCreateDialog(true);
  };

  const handleOpenEditDialog = (user) => {
    console.log('Abrindo diálogo de edição:', { user, isMaster: isMasterUser() });
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp,
      userType: user.userType,
      password: ''
    });
    setOpenEditDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenCreateDialog(false);
    setOpenEditDialog(false);
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      whatsapp: '',
      userType: '',
      password: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (openCreateDialog) {
        // Verificar se usuário atual pode criar usuários
        if (!canAddUser()) {
          throw new Error('Você não tem permissão para criar usuários');
        }

        // Verificar se usuário atual é Master para criar outro Master
        if (formData.userType === 'master' && currentUser?.userType !== 'master') {
          throw new Error('Apenas usuários Master podem criar outros usuários Master');
        }

        await createUser(formData);
        setSuccess('Usuário criado com sucesso!');
      } else {
        // Editando um usuário existente
        if (!canEditUser(selectedUser)) {
          throw new Error('Você não tem permissão para editar este usuário');
        }

        // Validar o tipo de usuário
        const isProfessorOrAtelier = 
          currentUser?.userType === 'teacher' || 
          currentUser?.userType === 'atelier';

        // Se for professor ou ateliê, não permitir alteração do tipo de usuário
        if (isProfessorOrAtelier && formData.userType !== selectedUser.userType) {
          throw new Error('Você não tem permissão para alterar seu tipo de usuário');
        }

        // Verificar se está tentando criar/editar usuário master sem ter permissão
        if (formData.userType === 'master' && currentUser?.userType !== 'master') {
          throw new Error('Apenas usuários Master podem editar usuários Master');
        }

        // Verificar se está tentando mudar a senha de outro usuário
        if (formData.password && formData.password.trim() !== '' && selectedUser.id !== currentUser?.uid) {
          // Exibir mensagem de aviso, mas continuar com a atualização dos outros dados
          setError('Aviso: A senha só pode ser alterada pelo próprio usuário. Outros dados foram atualizados.');
          
          // Remover a senha dos dados a serem atualizados
          const { password, ...dataWithoutPassword } = formData;
          await updateUser(selectedUser.id, dataWithoutPassword);
        } else {
          // Atualizar normalmente, incluindo a senha se fornecida
          await updateUser(selectedUser.id, formData);
        }
        
        setSuccess('Usuário atualizado com sucesso!');
      }

      handleCloseDialogs();
      loadUsers();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!canDeleteUser()) {
      setError('Apenas usuários Master podem excluir outros usuários');
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteUser(userId);
      setSuccess('Usuário excluído com sucesso!');
      loadUsers();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Renderização do formulário (usado tanto para criar quanto editar)
  const renderForm = () => (
    <form onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label="Nome completo"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        margin="normal"
        required
        disabled={loading}
      />
      <TextField
        fullWidth
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        margin="normal"
        required
        disabled={loading || openEditDialog}
      />
      <TextField
        fullWidth
        label="WhatsApp"
        name="whatsapp"
        value={formData.whatsapp}
        onChange={handleInputChange}
        margin="normal"
        required
        disabled={loading}
      />
      <FormControl 
        fullWidth 
        margin="normal" 
        required 
        disabled={loading || (
          (currentUser?.userType === 'teacher' || currentUser?.userType === 'atelier') && 
          openEditDialog && 
          selectedUser?.id === currentUser?.uid
        )}
      >
        <InputLabel>Tipo de usuário</InputLabel>
        <Select
          name="userType"
          value={formData.userType}
          onChange={handleInputChange}
          label="Tipo de usuário"
        >
          {Object.entries(USER_TYPES).map(([value, label]) => (
            <MenuItem 
              key={value} 
              value={value}
              disabled={
                // Desabilitar Master se não for Master
                (value === 'master' && currentUser?.userType !== 'master') ||
                // Desabilitar opções inapropriadas para usuários não-master
                (currentUser?.userType !== 'master' && !(['teacher', 'atelier'].includes(value) || value === currentUser?.userType))
              }
            >
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label={openEditDialog ? "Nova senha (opcional)" : "Senha"}
        name="password"
        type="password"
        value={formData.password}
        onChange={handleInputChange}
        margin="normal"
        required={!openEditDialog}
        disabled={loading}
      />
      {openEditDialog && (
        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
          Nota: Por questões de segurança, você só pode alterar sua própria senha. 
          Administradores não podem alterar senhas de outros usuários diretamente.
          Se outro usuário precisar de uma nova senha, utilize a função "Esqueci minha senha" na tela de login.
        </Alert>
      )}
    </form>
  );

  return (
    <MainLayout title="Gerenciamento de Usuários">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#000000', fontWeight: 'bold' }}>
          Usuários
        </Typography>
        {canAddUser() && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Novo Usuário
          </Button>
        )}
      </Box>

      {/* Tabela de usuários */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>WhatsApp</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.whatsapp}</TableCell>
                <TableCell>{USER_TYPES[user.userType]}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    onClick={() => handleOpenEditDialog(user)} 
                    color="primary"
                    disabled={!canEditUser(user)}
                  >
                    <EditIcon />
                  </IconButton>
                  {canDeleteUser() && (
                    <IconButton 
                      onClick={() => handleDelete(user.id)} 
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de Criação */}
      <Dialog open={openCreateDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Usuário</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
          {renderForm()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} disabled={loading}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Criando...' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Usuário</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
          {renderForm()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} disabled={loading}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensagens de sucesso */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
} 