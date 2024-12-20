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
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';

const Sidebar = () => {
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Alunos', icon: <PeopleIcon />, path: '/alunos' },
    { text: 'Frequência', icon: <CalendarTodayIcon />, path: '/frequencia' },
    { text: 'Aulas Individuais', icon: <PersonIcon />, path: '/aulas-individuais' },
    { text: 'Tarefas', icon: <AssignmentIcon />, path: '/tarefas' },
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
        overflow: 'auto', 
        marginTop: '10px',
        height: '100%',
        '&::-webkit-scrollbar': {
          display: 'none'  // Esconde a scrollbar no Chrome/Safari/Navegadores Webkit
        },
        '-ms-overflow-style': 'none',  // Esconde a scrollbar no Internet Explorer/Edge
        'scrollbarWidth': 'none',  // Esconde a scrollbar no Firefox
      }}>
        {/* Logo ou Nome do App */}
        <Box sx={{ 
          padding: '12px 20px',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '10px'
        }}>
          <Typography variant="h6" sx={{ 
            color: '#1976d2', 
            fontWeight: 600,
            fontSize: '1.1rem'
          }}>
            Dancing Patinação
          </Typography>
        </Box>

        <List>
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.text}
              sx={{
                margin: '4px 8px',
                borderRadius: '8px',
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