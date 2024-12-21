import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Button
} from '@mui/material';
import { 
  FilterList as FilterListIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';

export default function FinancialReport() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filters, setFilters] = useState({
    periodo: 'hoje',
    dataInicio: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    dataFim: dayjs().format('YYYY-MM-DD'),
    status: 'todos',
    tipo: 'todos',
    meioPagamento: 'todos'
  });

  useEffect(() => {
    loadPayments();
  }, []);

  // Aplicar filtros sempre que os pagamentos ou filtros mudarem
  useEffect(() => {
    applyFilters();
  }, [payments, filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      const pagamentosRef = collection(db, 'pagamentos');
      const q = query(pagamentosRef, orderBy('dataVencimento', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const pagamentosPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const payment = docSnapshot.data();
        const alunoRef = doc(db, 'alunos', payment.alunoId);
        const alunoSnap = await getDoc(alunoRef);
        
        console.log('Pagamento encontrado:', {
          tipo: payment.tipo,
          meioPagamento: payment.meioPagamento
        });
        
        return {
          id: docSnapshot.id,
          ...payment,
          alunoNome: alunoSnap.exists() ? alunoSnap.data().nome : 'Aluno não encontrado'
        };
      });
      
      const pagamentosData = await Promise.all(pagamentosPromises);
      
      const tiposUnicos = [...new Set(pagamentosData.map(p => p.tipo))];
      const meiosPagamentoUnicos = [...new Set(pagamentosData.map(p => p.meioPagamento))];
      console.log('Tipos únicos encontrados:', tiposUnicos);
      console.log('Meios de pagamento únicos encontrados:', meiosPagamentoUnicos);
      
      setPayments(pagamentosData);
      
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Filtro de período
    if (filters.periodo !== 'todos') {
      const dataInicio = dayjs(filters.dataInicio);
      const dataFim = dayjs(filters.dataFim);

      filtered = filtered.filter(payment => {
        const dataVencimento = dayjs(payment.dataVencimento);
        switch (filters.periodo) {
          case 'personalizado':
            return dataVencimento.isAfter(dataInicio.startOf('day')) && 
                   dataVencimento.isBefore(dataFim.endOf('day'));
          case 'hoje':
            return dataVencimento.isSame(dayjs(), 'day');
          default:
            return true;
        }
      });
    }

    // Filtro de status
    if (filters.status !== 'todos') {
      filtered = filtered.filter(payment => {
        if (filters.status === 'atrasado') {
          return dayjs(payment.dataVencimento).isBefore(dayjs(), 'day') && payment.status !== 'pago';
        }
        return payment.status === filters.status;
      });
    }

    // Filtro de tipo com log para debug
    if (filters.tipo !== 'todos') {
      console.log('Filtrando por tipo:', filters.tipo);
      filtered = filtered.filter(payment => {
        console.log('Comparando com:', payment.tipo);
        return payment.tipo === filters.tipo;
      });
    }

    // Filtro de meio de pagamento
    if (filters.meioPagamento !== 'todos') {
      filtered = filtered.filter(payment => payment.meioPagamento === filters.meioPagamento);
    }

    setFilteredPayments(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status, dataVencimento) => {
    if (status === 'pago') return 'success';
    if (dayjs(dataVencimento).isBefore(dayjs(), 'day')) return 'error';
    return 'warning';
  };

  const getStatusLabel = (status, dataVencimento) => {
    if (status === 'pago') return 'Pago';
    if (dayjs(dataVencimento).isBefore(dayjs(), 'day')) return 'Atrasado';
    return 'Pendente';
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
              <InputLabel>Período</InputLabel>
              <Select
                value={filters.periodo}
                label="Período"
                onChange={(e) => handleFilterChange('periodo', e.target.value)}
              >
                <MenuItem value="hoje">Hoje</MenuItem>
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
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="pago">Pagos</MenuItem>
                <MenuItem value="pendente">Pendentes</MenuItem>
                <MenuItem value="atrasado">Atrasados</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.tipo}
                label="Tipo"
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="Mensalidade">Mensalidade</MenuItem>
                <MenuItem value="Aula individual">Aula individual</MenuItem>
                <MenuItem value="Cantina">Cantina</MenuItem>
                <MenuItem value="Eventos">Eventos</MenuItem>
                <MenuItem value="Aula experimental">Aula experimental</MenuItem>
                <MenuItem value="Outros">Outros</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Forma de Pagamento</InputLabel>
              <Select
                value={filters.meioPagamento}
                label="Forma de Pagamento"
                onChange={(e) => handleFilterChange('meioPagamento', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                <MenuItem value="PIX">PIX</MenuItem>
                <MenuItem value="Crédito">Crédito</MenuItem>
                <MenuItem value="Débito">Débito</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );

  const handlePrint = () => {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    const filteredData = filteredPayments;
    
    // Estilos para impressão
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .header { margin-bottom: 20px; }
        .filters { margin-bottom: 20px; }
        .status { 
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .status-pago { background-color: #e8f5e9; color: #2e7d32; }
        .status-pendente { background-color: #fff3e0; color: #e65100; }
        .status-atrasado { background-color: #ffebee; color: #c62828; }
        @media print {
          button { display: none; }
        }
      </style>
    `;

    // Criar o conteúdo do relatório
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Financeiro</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <h2>Relatório Financeiro</h2>
            <p>Data de geração: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
          </div>
          <div class="filters">
            <p><strong>Filtros aplicados:</strong></p>
            <p>Período: ${filters.periodo === 'hoje' ? 'Hoje' : 'Personalizado'}</p>
            ${filters.periodo === 'personalizado' ? 
              `<p>Data Inicial: ${dayjs(filters.dataInicio).format('DD/MM/YYYY')}</p>
               <p>Data Final: ${dayjs(filters.dataFim).format('DD/MM/YYYY')}</p>` : ''}
            <p>Status: ${filters.status === 'todos' ? 'Todos' : filters.status}</p>
            <p>Tipo: ${filters.tipo === 'todos' ? 'Todos' : filters.tipo}</p>
            <p>Forma de Pagamento: ${filters.meioPagamento === 'todos' ? 'Todos' : filters.meioPagamento}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Recebimento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(payment => `
                <tr>
                  <td>${payment.alunoNome}</td>
                  <td>${payment.descricao}</td>
                  <td>${payment.tipo}</td>
                  <td style="text-align: right">${payment.valor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}</td>
                  <td>${dayjs(payment.dataVencimento).format('DD/MM/YYYY')}</td>
                  <td>${payment.dataRecebimento ? 
                    `${dayjs(payment.dataRecebimento).format('DD/MM/YYYY')}<br>
                     <small>${payment.meioPagamento}</small>` : 
                    '-'}</td>
                  <td>
                    <span class="status status-${getStatusLabel(payment.status, payment.dataVencimento).toLowerCase()}">
                      ${getStatusLabel(payment.status, payment.dataVencimento)}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Escrever o conteúdo na nova janela e imprimir
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.print();
      // printWindow.close(); // Opcional: fechar a janela após imprimir
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon />
          Filtros
        </Typography>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{ ml: 2 }}
        >
          Imprimir Relatório
        </Button>
      </Box>
      {renderFilters()}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Aluno</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell>Recebimento</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.alunoNome}</TableCell>
                <TableCell>{payment.descricao}</TableCell>
                <TableCell>{payment.tipo}</TableCell>
                <TableCell align="right">
                  {payment.valor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </TableCell>
                <TableCell>
                  {dayjs(payment.dataVencimento).format('DD/MM/YYYY')}
                </TableCell>
                <TableCell>
                  {payment.dataRecebimento ? (
                    <>
                      {dayjs(payment.dataRecebimento).format('DD/MM/YYYY')}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {payment.meioPagamento}
                      </Typography>
                    </>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(payment.status, payment.dataVencimento)}
                    color={getStatusColor(payment.status, payment.dataVencimento)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhum pagamento encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
} 