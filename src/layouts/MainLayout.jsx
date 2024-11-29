import { Box } from '@mui/material';
import Sidebar from '../components/Sidebar';

const MainLayout = ({ children }) => {
  return (
    <Box sx={{ 
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: '#f8f9fa',
          height: '100vh',
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          '-ms-overflow-style': 'none',
          'scrollbarWidth': 'none',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout; 