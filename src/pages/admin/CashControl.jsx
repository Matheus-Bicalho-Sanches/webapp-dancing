import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  ButtonGroup,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  FilterAlt as FilterAltIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  startAt,
  endAt,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function CashControl() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'yesterday', 'custom'
  const [customDateRange, setCustomDateRange] = useState({
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [showCustomDateFilter, setShowCustomDateFilter] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [totals, setTotals] = useState({
    entrada: 0,
    saida: 0,
    saldo: 0
  });

  useEffect(() => {
    loadMovements();
  }, [dateFilter, customDateRange]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      let startDate, endDate;

      switch (dateFilter) {
        case 'today':
          startDate = dayjs().startOf('day');
          endDate = dayjs().endOf('day');
          break;
        case 'yesterday':
          startDate = dayjs().subtract(1, 'day').startOf('day');
          endDate = dayjs().subtract(1, 'day').endOf('day');
          break;
        case 'custom':
          startDate = dayjs(customDateRange.startDate).startOf('day');
          endDate = dayjs(customDateRange.endDate).endOf('day');
          break;
        default:
          startDate = dayjs().startOf('day');
          endDate = dayjs().endOf('day');
      }

      // Buscar movimentações regulares
      const movementsQuery = query(
        collection(db, 'movimentacoes'),
        where('data', '>=', Timestamp.fromDate(startDate.toDate())),
        where('data', '<=', Timestamp.fromDate(endDate.toDate())),
        orderBy('data', 'desc')
      );

      // Buscar vendas da cantina
      const salesQuery = query(
        collection(db, 'vendas'),
        where('dataVenda', '>=', Timestamp.fromDate(startDate.toDate())),
        where('dataVenda', '<=', Timestamp.fromDate(endDate.toDate())),
        orderBy('dataVenda', 'desc')
      );

      const [movementsSnapshot, salesSnapshot] = await Promise.all([
        getDocs(movementsQuery),
        getDocs(salesQuery)
      ]);

      // Processar movimentações regulares
      const movementsData = movementsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Processar vendas da cantina e converter para o formato de movimentação
      const salesData = salesSnapshot.docs
        .map(doc => {
          const sale = doc.data();
          // Incluir apenas vendas da cantina (que não têm categoria definida)
          if (sale.categoria === 'Uniforme') return null;
          
          return {
            id: doc.id,
            data: sale.dataVenda,
            tipo: 'entrada',
            descricao: `Venda Cantina: ${sale.quantidade}x ${sale.produtoNome}`,
            valor: sale.valorTotal,
            categoria: 'Cantina',
            formaPagamento: sale.formaPagamento,
            isEmployeeSale: sale.isEmployeeSale,
            createdAt: sale.createdAt
          };
        })
        .filter(sale => sale !== null); // Remover vendas de uniforme (null)

      // Combinar movimentações e vendas
      const allMovements = [...movementsData, ...salesData].sort((a, b) => {
        const dateA = a.data.toDate();
        const dateB = b.data.toDate();
        return dateB - dateA;
      });

      // Calcular totais
      const totals = allMovements.reduce((acc, movement) => {
        if (movement.tipo === 'entrada') {
          acc.entrada += movement.valor;
          acc.saldo += movement.valor;
        } else {
          acc.saida += movement.valor;
          acc.saldo -= movement.valor;
        }
        return acc;
      }, { entrada: 0, saida: 0, saldo: 0 });

      setTotals(totals);
      setMovements(allMovements);
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar movimentações. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = (filter) => {
    setDateFilter(filter);
    if (filter !== 'custom') {
      setShowCustomDateFilter(false);
    }
  };

  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (timestamp) => {
    return dayjs(timestamp.toDate()).format('DD/MM/YYYY HH:mm');
  };

  if (loading) {
    return (
      <MainLayout title="Controle de Caixa">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Controle de Caixa">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ color: '#000', mb: 3 }}>
          Controle de Caixa
        </Typography>

        {/* Filtros de data */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: showCustomDateFilter ? 2 : 0 }}>
            <ButtonGroup variant="outlined">
              <Button
                startIcon={<TodayIcon />}
                variant={dateFilter === 'today' ? 'contained' : 'outlined'}
                onClick={() => handleDateFilterChange('today')}
              >
                Hoje
              </Button>
              <Button
                variant={dateFilter === 'yesterday' ? 'contained' : 'outlined'}
                onClick={() => handleDateFilterChange('yesterday')}
              >
                Ontem
              </Button>
              <Button
                startIcon={<DateRangeIcon />}
                variant={dateFilter === 'custom' ? 'contained' : 'outlined'}
                onClick={() => {
                  handleDateFilterChange('custom');
                  setShowCustomDateFilter(true);
                }}
              >
                Personalizado
              </Button>
            </ButtonGroup>

            {dateFilter === 'custom' && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Data inicial"
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <TextField
                  label="Data final"
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Box>
            )}
          </Box>
        </Paper>

        {/* Cards de totais */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Paper sx={{ flex: 1, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowUpwardIcon color="success" />
              <Typography variant="subtitle1">Total de Entradas</Typography>
            </Box>
            <Typography variant="h5" color="success.main">
              {formatCurrency(totals.entrada)}
            </Typography>
          </Paper>

          <Paper sx={{ flex: 1, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowDownwardIcon color="error" />
              <Typography variant="subtitle1">Total de Saídas</Typography>
            </Box>
            <Typography variant="h5" color="error.main">
              {formatCurrency(totals.saida)}
            </Typography>
          </Paper>

          <Paper sx={{ flex: 1, p: 2 }}>
            <Typography variant="subtitle1">Saldo do Período</Typography>
            <Typography 
              variant="h5" 
              color={totals.saldo >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(totals.saldo)}
            </Typography>
          </Paper>
        </Box>

        {/* Tabela de movimentações */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Forma de Pagamento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id} hover>
                  <TableCell>{formatDate(movement.data)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {movement.categoria === 'Cantina' && (
                        <ShoppingCartIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      )}
                      <Typography>
                        {movement.descricao}
                        {movement.categoria === 'Cantina' && movement.isEmployeeSale && (
                          <Chip
                            label="Funcionário"
                            size="small"
                            color="info"
                            sx={{ ml: 1, borderRadius: 1 }}
                          />
                        )}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={movement.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      color={movement.tipo === 'entrada' ? 'success' : 'error'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={movement.categoria}
                      color={movement.categoria === 'Cantina' ? 'primary' : 'default'}
                      size="small"
                      variant={movement.categoria === 'Cantina' ? 'filled' : 'outlined'}
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      color={movement.tipo === 'entrada' ? 'success.main' : 'error.main'}
                      sx={{ fontWeight: 500 }}
                    >
                      {formatCurrency(movement.valor)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={movement.formaPagamento}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1, textTransform: 'capitalize' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhuma movimentação encontrada no período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Snackbar para feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
} 