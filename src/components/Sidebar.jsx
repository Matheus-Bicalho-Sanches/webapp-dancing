import { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Box,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Home as HomeIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  ShoppingCart as ShoppingCartIcon,
  Checkroom as CheckroomIcon,
  PeopleAlt as PeopleAltIcon,
  ChevronLeft as ChevronLeftIcon,
  People as PeopleIcon,
  Restaurant as RestaurantIcon,
  CreditCard as CreditCardIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const drawerWidth = 240;

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserType = async () => {
      if (currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserType(userDoc.data().type);
          }
        } catch (error) {
          console.error('Erro ao carregar tipo do usuário:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserType();
  }, [currentUser]);

  const menuItems = [
    { text: 'Dashboard', icon: <HomeIcon />, path: '/admin/dashboard', allowedTypes: ['master', 'administrative'] },
    { text: 'Uniforme', icon: <CheckroomIcon />, path: '/admin/uniforme', allowedTypes: ['master', 'administrative'] },
    { text: 'Tarefas', icon: <AssignmentIcon />, path: '/admin/tarefas', allowedTypes: ['master', 'administrative', 'teacher'] },
    { text: 'CRM', icon: <PeopleIcon />, path: '/admin/crm', allowedTypes: ['master', 'administrative', 'teacher'] },
    { text: 'Alunos', icon: <PersonIcon />, path: '/admin/alunos', allowedTypes: ['master', 'administrative'] },
    { text: 'Matrículas', icon: <SchoolIcon />, path: '/admin/matriculas', allowedTypes: ['master', 'administrative'] },
    { text: 'Turmas', icon: <SchoolIcon />, path: '/admin/turmas', allowedTypes: ['master', 'administrative'] },
    { text: 'Frequência', icon: <AssignmentIcon />, path: '/admin/frequencia', allowedTypes: ['master', 'administrative'] },
    { text: 'Aulas Individuais', icon: <PersonIcon />, path: '/admin/aulas', allowedTypes: ['master', 'administrative', 'teacher'] },
    { text: 'Controle de Caixa', icon: <AttachMoneyIcon />, path: '/admin/caixa', allowedTypes: ['master', 'administrative'] },
    { text: 'Relatórios', icon: <AssignmentIcon />, path: '/admin/relatorios', allowedTypes: ['master', 'administrative'] },
    { text: 'Usuários', icon: <PersonIcon />, path: '/admin/usuarios', allowedTypes: ['master'] },
    { text: 'Cantina', icon: <RestaurantIcon />, path: '/admin/cantina', allowedTypes: ['master', 'administrative'] }
  ];

  const filteredMenuItems = userType
    ? menuItems.filter(item => item.allowedTypes.includes(userType))
    : menuItems;

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#333333',
          borderRight: '1px solid #e0e0e0',
        },
      }}
    >
      <Box sx={{ 
        overflow: 'hidden',
        marginTop: '10px',
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Box sx={{ 
          padding: '12px 20px',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '10px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h6" sx={{ 
            color: '#1976d2', 
            fontWeight: 600,
            fontSize: '1.1rem'
          }}>
            Dancing Patinação
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#1976d2' }}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>

        <List sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '4px',
            display: 'none'
          },
          '&:hover::-webkit-scrollbar': {
            display: 'block'
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#bdbdbd',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#757575'
          }
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            filteredMenuItems.map((item) => (
              <ListItem 
                button 
                key={item.text}
                onClick={() => navigate(item.path)}
                sx={{
                  margin: '4px 8px',
                  borderRadius: '8px',
                  backgroundColor: location.pathname === item.path ? '#f5f9ff' : 'transparent',
                  '&:hover': {
                    backgroundColor: '#f5f9ff',
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  color: '#1976d2',
                  minWidth: '40px'
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '0.95rem',
                      fontWeight: 500,
                    }
                  }}
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 