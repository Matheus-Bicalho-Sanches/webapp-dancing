import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { 
  Typography, 
  Box, 
  Grid, 
  Paper,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  CircularProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  limit,
  startAfter,
  endBefore,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    studentsVariation: 0,
    latePayments: 0,
    expiredEnrollments: 0,
    studentsWithIssues: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Buscar total de alunos atual
      const studentsRef = collection(db, 'alunos');
      const studentsSnapshot = await getDocs(studentsRef);
      const totalStudents = studentsSnapshot.size;

      // 2. Buscar total de alunos do mês anterior para calcular variação
      const lastMonthDate = dayjs().subtract(1, 'month').toDate();
      const studentsLastMonthQuery = query(
        studentsRef,
        where('createdAt', '<=', lastMonthDate)
      );
      const studentsLastMonthSnapshot = await getDocs(studentsLastMonthQuery);
      const totalStudentsLastMonth = studentsLastMonthSnapshot.size;
      
      // Calcular variação percentual
      const variation = totalStudentsLastMonth > 0 
        ? ((totalStudents - totalStudentsLastMonth) / totalStudentsLastMonth) * 100 
        : 0;

      // 3. Buscar alunos com pagamentos atrasados
      const now = new Date();
      const paymentsRef = collection(db, 'pagamentos');
      const latePaymentsQuery = query(
        paymentsRef,
        where('status', '==', 'pendente'),
        where('dataVencimento', '<', now)
      );
      const latePaymentsSnapshot = await getDocs(latePaymentsQuery);
      const latePayments = latePaymentsSnapshot.size;

      // 4. Buscar matrículas vencidas
      const matriculasRef = collection(db, 'matriculas');
      const expiredEnrollmentsQuery = query(
        matriculasRef,
        where('status', '==', 'ativa'),
        where('dataTermino', '<', dayjs().format('YYYY-MM-DD'))
      );
      const expiredEnrollmentsSnapshot = await getDocs(expiredEnrollmentsQuery);
      const expiredEnrollments = expiredEnrollmentsSnapshot.size;

      // 5. Buscar detalhes dos alunos com pendências
      const studentsWithIssues = [];
      
      // 5.1 Processar pagamentos atrasados
      for (const docRef of latePaymentsSnapshot.docs) {
        const paymentData = docRef.data();
        const studentDoc = await getDoc(doc(db, 'alunos', paymentData.alunoId));
        
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          const daysLate = dayjs().diff(dayjs(paymentData.dataVencimento), 'day');
          
          studentsWithIssues.push({
            id: docRef.id,
            studentId: paymentData.alunoId,
            name: studentData.nome,
            issue: 'Pagamento atrasado',
            daysLate,
            type: 'payment',
            value: paymentData.valor,
            dueDate: paymentData.dataVencimento
          });
        }
      }

      // 5.2 Processar matrículas vencidas
      for (const docRef of expiredEnrollmentsSnapshot.docs) {
        const enrollmentData = docRef.data();
        const studentDoc = await getDoc(doc(db, 'alunos', enrollmentData.alunoId));
        
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          const daysLate = dayjs().diff(dayjs(enrollmentData.dataTermino), 'day');
          
          studentsWithIssues.push({
            id: docRef.id,
            studentId: enrollmentData.alunoId,
            name: studentData.nome,
            issue: 'Matrícula vencida',
            daysLate,
            type: 'enrollment',
            planName: enrollmentData.planoNome,
            endDate: enrollmentData.dataTermino
          });
        }
      }

      // Ordenar por dias de atraso
      studentsWithIssues.sort((a, b) => b.daysLate - a.daysLate);

      setMetrics({
        totalStudents,
        studentsVariation: parseFloat(variation.toFixed(1)),
        latePayments,
        expiredEnrollments,
        studentsWithIssues
      });

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      // Em caso de erro, manter os dados anteriores
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon, color, secondaryValue, secondaryText }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            backgroundColor: `${color}15`, 
            borderRadius: '50%', 
            p: 1,
            mr: 2
          }}>
            {icon}
          </Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" sx={{ mb: 1 }}>
          {value}
        </Typography>
        {secondaryValue && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {secondaryValue > 0 ? (
              <ArrowUpwardIcon sx={{ color: 'success.main', mr: 0.5 }} />
            ) : (
              <ArrowDownwardIcon sx={{ color: 'error.main', mr: 0.5 }} />
            )}
            <Typography 
              variant="body2" 
              color={secondaryValue > 0 ? 'success.main' : 'error.main'}
            >
              {Math.abs(secondaryValue)}% {secondaryText}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const handleViewDetails = (student) => {
    // Navegar para a página correta baseado no tipo de pendência
    if (student.type === 'payment') {
      // Se for pagamento atrasado, vai para a página de pagamentos do aluno
      window.location.href = `/admin/alunos/${student.studentId}?tab=pagamentos`;
    } else if (student.type === 'enrollment') {
      // Se for matrícula vencida, vai para a página de matrículas do aluno
      window.location.href = `/admin/alunos/${student.studentId}?tab=matriculas`;
    }
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard">
      <Grid container spacing={3}>
        {/* Métricas principais */}
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Total de Alunos"
            value={metrics.totalStudents}
            icon={<PeopleIcon sx={{ color: '#1976d2' }} />}
            color="#1976d2"
            secondaryValue={metrics.studentsVariation}
            secondaryText="em relação ao mês anterior"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Pagamentos Atrasados"
            value={metrics.latePayments}
            icon={<WarningIcon sx={{ color: '#f44336' }} />}
            color="#f44336"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Matrículas Vencidas"
            value={metrics.expiredEnrollments}
            icon={<CalendarIcon sx={{ color: '#ff9800' }} />}
            color="#ff9800"
          />
        </Grid>

        {/* Lista de Pendências */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Alunos com Pendências" />
            <Divider />
            <List>
              {metrics.studentsWithIssues.map((student) => (
                <React.Fragment key={`${student.type}-${student.id}`}>
                  <ListItem>
                    <ListItemText
                      primary={student.name}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {student.issue}
                          </Typography>
                          {student.type === 'payment' && (
                            <>
                              {' - '}
                              <Typography component="span" variant="body2" color="error">
                                {student.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </Typography>
                              {' - Vencimento: '}
                              <Typography component="span" variant="body2">
                                {dayjs(student.dueDate).format('DD/MM/YYYY')}
                              </Typography>
                            </>
                          )}
                          {student.type === 'enrollment' && (
                            <>
                              {' - '}
                              <Typography component="span" variant="body2">
                                {student.planName}
                              </Typography>
                              {' - Vencimento: '}
                              <Typography component="span" variant="body2">
                                {dayjs(student.endDate).format('DD/MM/YYYY')}
                              </Typography>
                            </>
                          )}
                          <br />
                          <Typography component="span" variant="body2" color="error">
                            {student.daysLate} {student.daysLate === 1 ? 'dia' : 'dias'} de atraso
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleViewDetails(student)}
                      >
                        Ver Detalhes
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
              {metrics.studentsWithIssues.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="Nenhuma pendência encontrada"
                    secondary="Todos os alunos estão em dia com pagamentos e matrículas"
                  />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  );
}