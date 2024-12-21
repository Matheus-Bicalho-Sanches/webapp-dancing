import React, { useState, useEffect } from 'react';
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
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack
} from '@mui/material';
import {
  School as SchoolIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarMonth as CalendarMonthIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';
import FinancialReport from '../../components/reports/FinancialReport';

export default function Reports() {
  const [openDialog, setOpenDialog] = useState({
    matriculas: false,
    financeiro: false,
    frequencia: false,
    tarefas: false
  });
  const [enrollmentData, setEnrollmentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'todos',
    periodo: 'todos',
    plano: 'todos',
    dataInicio: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
    dataFim: dayjs().format('YYYY-MM-DD'),
    ordenacao: 'status'
  });
  const [planos, setPlanos] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const handleOpenDialog = async (category) => {
    setOpenDialog(prev => ({ ...prev, [category]: true }));
    
    if (category === 'matriculas') {
      await loadEnrollmentReport();
    }
  };

  const handleCloseDialog = (category) => {
    setOpenDialog(prev => ({ ...prev, [category]: false }));
  };

  const loadEnrollmentReport = async () => {
    try {
      setLoading(true);
      
      // Buscar matrículas não excluídas
      const matriculasRef = collection(db, 'matriculas');
      const matriculasQuery = query(
        matriculasRef,
        where('status', 'in', ['ativa', 'vencida', 'baixada', 'inativa']),
        orderBy('status'),
        orderBy('dataInicio', 'desc')
      );
      const matriculasSnapshot = await getDocs(matriculasQuery);
      
      // Coletar IDs únicos de alunos
      const alunosIds = [...new Set(matriculasSnapshot.docs.map(doc => doc.data().alunoId))];
      
      // Buscar dados dos alunos
      const alunosRef = collection(db, 'alunos');
      const alunosPromises = alunosIds.map(async (alunoId) => {
        const alunoDoc = await getDoc(doc(db, 'alunos', alunoId));
        if (alunoDoc.exists()) {
          return { id: alunoDoc.id, ...alunoDoc.data() };
        }
        return null;
      });
      const alunosData = await Promise.all(alunosPromises);
      
      // Criar mapa de alunos para fácil acesso
      const alunosMap = new Map();
      alunosData.forEach(aluno => {
        if (aluno) {
          alunosMap.set(aluno.id, aluno);
        }
      });
      
      // Organizar dados para o relatório
      const reportData = [];
      matriculasSnapshot.docs.forEach(doc => {
        const matricula = doc.data();
        const aluno = alunosMap.get(matricula.alunoId);
        
        if (aluno) {
          reportData.push({
            matriculaId: doc.id,
            alunoId: aluno.id,
            nomeAluno: aluno.nome,
            telefone: aluno.telefone,
            plano: matricula.planoNome,
            valor: matricula.valor,
            status: matricula.status,
            dataInicio: matricula.dataInicio,
            dataTermino: matricula.dataTermino
          });
        }
      });

      console.log('Matrículas encontradas:', matriculasSnapshot.docs.length);
      console.log('Alunos encontrados:', alunosMap.size);
      console.log('Dados do relatório:', reportData);
      
      setEnrollmentData(reportData);
      setFilteredData(reportData); // Inicializar os dados filtrados
    } catch (error) {
      console.error('Erro ao carregar relatório de matrículas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status, dataTermino) => {
    if (status === 'baixada' || status === 'inativa') return 'default';
    if (status === 'ativa') {
      if (dayjs(dataTermino).isBefore(dayjs(), 'day')) return 'error';
      return 'success';
    }
    return 'error';
  };

  const getStatusLabel = (status, dataTermino) => {
    if (status === 'baixada') return 'baixada';
    if (status === 'inativa') return 'inativa';
    if (status === 'ativa') {
      if (dayjs(dataTermino).isBefore(dayjs(), 'day')) return 'vencida';
      return 'ativa';
    }
    return status;
  };

  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
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

  // Carregar planos disponíveis
  useEffect(() => {
    const loadPlanos = async () => {
      try {
        const planosRef = collection(db, 'planos');
        const planosSnapshot = await getDocs(planosRef);
        const planosData = planosSnapshot.docs.map(doc => ({
          id: doc.id,
          nome: doc.data().nome
        }));
        setPlanos(planosData);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
      }
    };
    loadPlanos();
  }, []);

  // Aplicar filtros aos dados
  useEffect(() => {
    if (!enrollmentData.length) return;

    let filtered = [...enrollmentData];

    // Filtro de status
    if (filters.status !== 'todos') {
      filtered = filtered.filter(item => {
        const currentStatus = getStatusLabel(item.status, item.dataTermino);
        return currentStatus === filters.status;
      });
    }

    // Filtro de período
    if (filters.periodo !== 'todos') {
      const hoje = dayjs();
      filtered = filtered.filter(item => {
        const dataInicio = dayjs(item.dataInicio);
        const dataTermino = dayjs(item.dataTermino);
        
        switch (filters.periodo) {
          case 'vigentes':
            return dataTermino.isAfter(hoje);
          case 'vencidas':
            return dataTermino.isBefore(hoje);
          case 'personalizado':
            const filterInicio = dayjs(filters.dataInicio);
            const filterFim = dayjs(filters.dataFim);
            return (
              dataInicio.isAfter(filterInicio) || dataInicio.isSame(filterInicio) &&
              dataTermino.isBefore(filterFim) || dataTermino.isSame(filterFim)
            );
          default:
            return true;
        }
      });
    }

    // Filtro de plano
    if (filters.plano !== 'todos') {
      filtered = filtered.filter(item => item.plano === filters.plano);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (filters.ordenacao) {
        case 'status':
          const statusA = getStatusLabel(a.status, a.dataTermino);
          const statusB = getStatusLabel(b.status, b.dataTermino);
          return statusA.localeCompare(statusB);
        case 'valor_asc':
          return a.valor - b.valor;
        case 'valor_desc':
          return b.valor - a.valor;
        case 'data_inicio':
          return dayjs(b.dataInicio).diff(dayjs(a.dataInicio));
        case 'data_termino':
          return dayjs(b.dataTermino).diff(dayjs(a.dataTermino));
        default:
          return 0;
      }
    });

    setFilteredData(filtered);
  }, [enrollmentData, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon />
          Filtros
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="ativa">Ativas</MenuItem>
                <MenuItem value="vencida">Vencidas</MenuItem>
                <MenuItem value="baixada">Baixadas</MenuItem>
                <MenuItem value="inativa">Inativas</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Período</InputLabel>
              <Select
                value={filters.periodo}
                label="Período"
                onChange={(e) => handleFilterChange('periodo', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="vigentes">Vigentes</MenuItem>
                <MenuItem value="vencidas">Vencidas</MenuItem>
                <MenuItem value="personalizado">Personalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {filters.periodo === 'personalizado' && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Inicial"
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Final"
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Plano</InputLabel>
              <Select
                value={filters.plano}
                label="Plano"
                onChange={(e) => handleFilterChange('plano', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                {planos.map(plano => (
                  <MenuItem key={plano.id} value={plano.nome}>
                    {plano.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Ordenar por</InputLabel>
              <Select
                value={filters.ordenacao}
                label="Ordenar por"
                onChange={(e) => handleFilterChange('ordenacao', e.target.value)}
              >
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="valor_asc">Valor (menor → maior)</MenuItem>
                <MenuItem value="valor_desc">Valor (maior → menor)</MenuItem>
                <MenuItem value="data_inicio">Data de Início</MenuItem>
                <MenuItem value="data_termino">Data de Término</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );

  const renderEnrollmentReport = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <>
        {renderFilters()}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID do Aluno</TableCell>
                <TableCell>Nome do Aluno</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Plano</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Período</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.matriculaId}>
                  <TableCell>{row.alunoId}</TableCell>
                  <TableCell>{row.nomeAluno}</TableCell>
                  <TableCell>{row.telefone}</TableCell>
                  <TableCell>{row.plano}</TableCell>
                  <TableCell align="right">{formatCurrency(row.valor)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(row.status, row.dataTermino)}
                      color={getStatusColor(row.status, row.dataTermino)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {dayjs(row.dataInicio).format('DD/MM/YYYY')} até {dayjs(row.dataTermino).format('DD/MM/YYYY')}
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhuma matrícula encontrada com os filtros selecionados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  };

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
            maxWidth="lg"
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
              {category.id === 'matriculas' ? (
                renderEnrollmentReport()
              ) : category.id === 'financeiro' ? (
                <FinancialReport />
              ) : (
                <Typography>
                  Os relatórios de {category.title.toLowerCase()} serão implementados em breve.
                </Typography>
              )}
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