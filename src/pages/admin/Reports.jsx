import React, { useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  School as SchoolIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarMonth as CalendarMonthIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function Reports() {
  const [openDialog, setOpenDialog] = useState({
    matriculas: false,
    financeiro: false,
    frequencia: false,
    tarefas: false
  });

  const handleOpenDialog = (category) => {
    setOpenDialog(prev => ({ ...prev, [category]: true }));
  };

  const handleCloseDialog = (category) => {
    setOpenDialog(prev => ({ ...prev, [category]: false }));
  };

  const reportCategories = [
    {
      id: 'matriculas',
      title: 'Matrículas',
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2' // azul
    },
    {
      id: 'financeiro',
      title: 'Financeiro',
      icon: <AttachMoneyIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32' // verde
    },
    {
      id: 'frequencia',
      title: 'Frequência',
      icon: <CalendarMonthIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02' // laranja
    },
    {
      id: 'tarefas',
      title: 'Tarefas',
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0' // roxo
    }
  ];

  return (
    <MainLayout title="Relatórios">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ color: '#000', mb: 4 }}>
          Relatórios
        </Typography>

        <Grid container spacing={3}>
          {reportCategories.map((category) => (
            <Grid item xs={12} sm={6} md={3} key={category.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)'
                  }
                }}
                onClick={() => handleOpenDialog(category.id)}
              >
                <CardContent sx={{ 
                  textAlign: 'center',
                  p: 3
                }}>
                  <Box sx={{ 
                    color: category.color,
                    mb: 2
                  }}>
                    {category.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {category.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Dialogs para cada categoria */}
        {reportCategories.map((category) => (
          <Dialog
            key={category.id}
            open={openDialog[category.id]}
            onClose={() => handleCloseDialog(category.id)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle sx={{ m: 0, p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ color: category.color }}>
                  {category.icon}
                </Box>
                <Typography variant="h6">
                  Relatórios de {category.title}
                </Typography>
              </Box>
              <IconButton
                aria-label="close"
                onClick={() => handleCloseDialog(category.id)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: (theme) => theme.palette.grey[500],
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Typography>
                Os relatórios de {category.title.toLowerCase()} serão implementados em breve.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleCloseDialog(category.id)}>
                Fechar
              </Button>
            </DialogActions>
          </Dialog>
        ))}
      </Box>
    </MainLayout>
  );
} 