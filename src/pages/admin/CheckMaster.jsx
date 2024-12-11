import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  checkCurrentUserType, 
  setUserAsMaster, 
  updateUserBasicInfo 
} from '../../services/userService';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Alert,
  TextField,
  Stack
} from '@mui/material';

export default function CheckMaster() {
  const { currentUser } = useAuth();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    whatsapp: ''
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setUserData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        whatsapp: currentUser.whatsapp || ''
      });
    }
  }, [currentUser]);

  const checkUser = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const type = await checkCurrentUserType(currentUser.uid);
      setUserType(type);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetMaster = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      await setUserAsMaster(currentUser.uid);
      setSuccess('Usuário definido como master com sucesso!');
      await checkUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserData = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      await updateUserBasicInfo(currentUser.uid, userData);
      setSuccess('Dados atualizados com sucesso!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Você precisa estar logado para acessar esta página.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Verificação de Usuário Master
        </Typography>

        {loading ? (
          <Typography>Carregando...</Typography>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography>
                <strong>Tipo atual:</strong> {userType || 'Não definido'}
              </Typography>
            </Box>

            <Stack spacing={2} sx={{ mb: 3 }}>
              <TextField
                label="Nome completo"
                name="name"
                value={userData.name}
                onChange={handleInputChange}
                fullWidth
              />
              <TextField
                label="Email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
                fullWidth
                disabled
              />
              <TextField
                label="WhatsApp"
                name="whatsapp"
                value={userData.whatsapp}
                onChange={handleInputChange}
                fullWidth
              />
            </Stack>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Stack direction="row" spacing={2}>
              {userType !== 'master' && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleSetMaster}
                  disabled={loading}
                >
                  Definir como Master
                </Button>
              )}
              
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleUpdateUserData}
                disabled={loading}
              >
                Atualizar Dados
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
} 