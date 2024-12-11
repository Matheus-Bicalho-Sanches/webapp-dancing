import MainLayout from '../../layouts/MainLayout';
import { Typography } from '@mui/material';

export default function Users() {
  return (
    <MainLayout title="Usuários">
      <Typography variant="h4" gutterBottom sx={{ color: '#000' }}>
        Usuários
      </Typography>
      <Typography variant="body1" paragraph sx={{ color: '#000' }}>
        Gerenciamento de usuários do sistema
      </Typography>
    </MainLayout>
  );
} 