import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Sidebar from '../components/Sidebar';

const drawerWidth = 240;

export default function MainLayout({ children, title }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/agendar');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNotificationsClick = () => {
    navigate('/admin/notifications');
  };

  return (
    <Box sx={{ 
      display: 'flex',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      width: '100vw'
    }}>
      <AppBar
        position="fixed"
        sx={{ 
          width: isSidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%', 
          ml: isSidebarOpen ? `${drawerWidth}px` : 0,
          transition: theme => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="toggle sidebar"
              onClick={handleToggleSidebar}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {currentUser?.email}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleNotificationsClick}
              size="large"
              aria-label="show notifications"
            >
              <Badge color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              size="small"
            >
              LOGOUT
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Sidebar open={isSidebarOpen} onClose={handleToggleSidebar} />

      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3,
          ml: isSidebarOpen ? 0 : `-${drawerWidth}px`,
          width: isSidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          transition: theme => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
} 