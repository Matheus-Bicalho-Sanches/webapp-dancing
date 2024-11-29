import MainLayout from './layouts/MainLayout';
import { Box, Typography } from '@mui/material';

function App() {
  return (
    <MainLayout>
      <Box sx={{ padding: 2 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            color: '#1976d2',
            fontWeight: 600,
            marginBottom: 3
          }}
        >
          Dashboard
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#555',
            fontSize: '1.1rem'
          }}
        >
          Bem-vindo ao sistema de gestão da escola de patinação!
        </Typography>
      </Box>
    </MainLayout>
  );
}

export default App;
