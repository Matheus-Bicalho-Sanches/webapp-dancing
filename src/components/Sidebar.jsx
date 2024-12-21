import { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Box,
  Typography
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Alunos', icon: <PeopleIcon />, path: '/admin/alunos' },
    { text: 'Matrículas', icon: <SchoolIcon />, path: '/admin/matriculas' },
    { text: 'Turmas', icon: <GroupsIcon />, path: '/admin/turmas' },
    { text: 'Frequência', icon: <CalendarTodayIcon />, path: '/admin/frequencia' },
    { text: 'Aulas Individuais', icon: <PersonIcon />, path: '/admin/aulas' },
    { text: 'Tarefas', icon: <AssignmentIcon />, path: '/admin/tarefas' },
    { text: 'Controle de Caixa', icon: <AccountBalanceWalletIcon />, path: '/admin/caixa' },
    { text: 'Relatórios', icon: <AssessmentIcon />, path: '/admin/relatorios' },
    { text: 'Usuários', icon: <PeopleAltIcon />, path: '/admin/usuarios' },
    { text: 'Produtos', icon: <Inventory2Icon />, path: '/admin/produtos' }
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
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
        },
        '-ms-overflow-style': 'none',
        'scrollbarWidth': 'none',
      }}>
        <Box sx={{ 
          padding: '12px 20px',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '10px',
          flexShrink: 0
        }}>
          <Typography variant="h6" sx={{ 
            color: '#1976d2', 
            fontWeight: 600,
            fontSize: '1.1rem'
          }}>
            Dancing Patinação
          </Typography>
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