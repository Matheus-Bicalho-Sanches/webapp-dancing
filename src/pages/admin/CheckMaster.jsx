import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { checkCurrentUserType, setUserAsMaster } from '../../services/userService';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Alert
} from '@mui/material';

export default function CheckMaster() {
  const { currentUser } = useAuth();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

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
                <strong>Email do usuário:</strong> {currentUser.email}
              </Typography>
              <Typography>
                <strong>Tipo atual:</strong> {userType || 'Não definido'}
              </Typography>
            </Box>

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
          </>
        )}
      </Paper>
    </Box>
  );
} 