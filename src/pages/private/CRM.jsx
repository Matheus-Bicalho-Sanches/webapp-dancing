import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import MainLayout from '../../layouts/MainLayout';

export default function CRM() {
  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 500 }}>
            CRM
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Gerenciamento de Relacionamento com o Cliente
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            {/* Estatísticas Gerais */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Alunos Ativos
                  </Typography>
                  <Typography variant="h4" color="primary">
                    0
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Aulas Este Mês
                  </Typography>
                  <Typography variant="h4" color="primary">
                    0
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Taxa de Retenção
                  </Typography>
                  <Typography variant="h4" color="primary">
                    0%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Seção Principal */}
            <Grid item xs={12}>
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Atividades Recentes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma atividade registrada ainda.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Seção de Métricas */}
            <Grid item xs={12} md={6}>
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Satisfação dos Alunos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dados de satisfação serão exibidos aqui.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Próximas Ações
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lista de ações pendentes será exibida aqui.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </MainLayout>
  );
} 