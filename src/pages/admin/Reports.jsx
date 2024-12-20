import MainLayout from '../../layouts/MainLayout';
import { Typography, Box, Paper } from '@mui/material';

export default function Reports() {
  return (
    <MainLayout title="Relatórios">
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ color: '#000' }}>
            Relatórios
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: '#000' }}>
            Esta funcionalidade será implementada em breve.
          </Typography>
        </Paper>
      </Box>
    </MainLayout>
  );
} 