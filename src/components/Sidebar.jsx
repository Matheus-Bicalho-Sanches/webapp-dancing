import { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Box,
  Typography,
  IconButton
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
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = [
    { text: 'Dashboard', icon: <HomeIcon />, path: '/admin/dashboard' },
    { text: 'Tarefas', icon: <AssignmentIcon />, path: '/admin/tarefas' },
    { text: 'CRM', icon: <PeopleIcon />, path: '/admin/crm' },
    { text: 'Alunos', icon: <PersonIcon />, path: '/admin/alunos' },
    { text: 'Matrículas', icon: <SchoolIcon />, path: '/admin/matriculas' },
    { text: 'Turmas', icon: <SchoolIcon />, path: '/admin/turmas' },
    { text: 'Frequência', icon: <AssignmentIcon />, path: '/admin/frequencia' },
    { text: 'Aulas Individuais', icon: <PersonIcon />, path: '/admin/aulas' },
    { text: 'Controle de Caixa', icon: <AttachMoneyIcon />, path: '/admin/caixa' },
    { text: 'Relatórios', icon: <AssignmentIcon />, path: '/admin/relatorios' },
    { text: 'Usuários', icon: <PersonIcon />, path: '/admin/usuarios' },
    { text: 'Cantina', icon: <ShoppingCartIcon />, path: '/admin/produtos' },
    { text: 'Uniforme', icon: <CheckroomIcon />, path: '/admin/uniforme' }
  ];

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
          transition: theme => theme.transitions.create('transform', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
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
          {menuItems.map((item) => (
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
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 