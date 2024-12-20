import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';

const drawerWidth = 240;

export default function MainLayout({ children, title }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/admin/dashboard'
    },
    {
      text: 'Alunos',
      icon: <PeopleIcon />,
      path: '/admin/alunos'
    },
    {
      text: 'Matrículas',
      icon: <SchoolIcon />,
      path: '/admin/matriculas'
    },
    {
      text: 'Frequência',
      icon: <CalendarMonthIcon />,
      path: '/admin/frequencia'
    },
    {
      text: 'Aulas Individuais',
      icon: <PersonIcon />,
      path: '/admin/aulas'
    },
    {
      text: 'Tarefas',
      icon: <AssignmentIcon />,
      path: '/admin/tarefas'
    },
    {
      text: 'Controle de Caixa',
      icon: <AccountBalanceWalletIcon />,
      path: '/admin/caixa'
    },
    {
      text: 'Relatórios',
      icon: <AssessmentIcon />,
      path: '/admin/relatorios'
    },
    {
      text: 'Usuários',
      icon: <GroupIcon />,
      path: '/admin/usuarios'
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/agendar');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
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
          width: `calc(100% - ${drawerWidth}px)`, 
          ml: `${drawerWidth}px`,
          backgroundColor: '#1976d2'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap component="div">
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {currentUser?.email}
            </Typography>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              size="small"
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)'
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ color: '#1976d2' }}>
            Dancing Patinação
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem disablePadding key={item.path}>
              <ListItemButton onClick={() => navigate(item.path)}>
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3,
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
} 