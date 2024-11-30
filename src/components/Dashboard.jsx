import MainLayout from '../layouts/MainLayout';
import { Typography } from '@mui/material';

export default function Dashboard() {
  return (
    <MainLayout title="Dashboard">
      <Typography variant="h4" gutterBottom sx={{ color: '#000' }}>
        Dashboard
      </Typography>
      <Typography variant="body1" paragraph sx={{ color: '#000' }}>
        Bem-vindo ao sistema de gestão da escola de patinação!
      </Typography>
    </MainLayout>
  );
} 