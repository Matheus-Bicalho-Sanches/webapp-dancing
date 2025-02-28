import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
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
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';

export default function TaskReport() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filters, setFilters] = useState({
    tipo: 'todos',
    status: 'todos',
    periodo: 'todos',
    dataInicio: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
    dataFim: dayjs().format('YYYY-MM-DD'),
    ordenacao: 'data'
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksRef = collection(db, 'tarefas');
      const tasksQuery = query(tasksRef, orderBy('createdAt', 'desc'));
      const tasksSnapshot = await getDocs(tasksQuery);
      
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTasks(tasksData);
      setFilteredTasks(tasksData);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tasks.length) return;

    let filtered = [...tasks];

    // Filtro por tipo de tarefa
    if (filters.tipo !== 'todos') {
      filtered = filtered.filter(task => task.tipo === filters.tipo);
    }

    // Filtro por status
    if (filters.status !== 'todos') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    // Filtro por período
    if (filters.periodo === 'personalizado') {
      filtered = filtered.filter(task => {
        const taskDate = dayjs(task.createdAt.toDate());
        const startDate = dayjs(filters.dataInicio);
        const endDate = dayjs(filters.dataFim);
        return taskDate.isAfter(startDate) && taskDate.isBefore(endDate);
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (filters.ordenacao) {
        case 'data':
          return dayjs(b.createdAt?.toDate()).diff(dayjs(a.createdAt?.toDate()));
        case 'tipo':
          return a.tipo.localeCompare(b.tipo);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Finalizada':
        return 'success';
      case 'Em andamento':
        return 'primary';
      case 'Aguardando':
        return 'warning';
      case 'Urgente':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'nao_recorrente':
        return 'Não recorrente';
      case 'diaria':
        return 'Diária';
      case 'semanal':
        return 'Semanal';
      case 'mensal':
        return 'Mensal';
      case 'por_horario':
        return 'Por horário';
      default:
        return tipo;
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    
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
        @media print {
          button { display: none; }
        }
      </style>
    `;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Tarefas</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <h2>Relatório de Tarefas</h2>
            <p>Data de geração: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
          </div>
          <div class="filters">
            <p><strong>Filtros aplicados:</strong></p>
            <p>Tipo: ${filters.tipo === 'todos' ? 'Todos' : getTipoLabel(filters.tipo)}</p>
            <p>Status: ${filters.status === 'todos' ? 'Todos' : filters.status}</p>
            <p>Período: ${filters.periodo === 'todos' ? 'Todos' : filters.periodo}</p>
            ${filters.periodo === 'personalizado' ? 
              `<p>Data Inicial: ${dayjs(filters.dataInicio).format('DD/MM/YYYY')}</p>
               <p>Data Final: ${dayjs(filters.dataFim).format('DD/MM/YYYY')}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Data Criação</th>
                <th>Última Execução</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTasks.map(task => `
                <tr>
                  <td>${task.descricao}</td>
                  <td>${getTipoLabel(task.tipo)}</td>
                  <td>${task.status}</td>
                  <td>${task.createdAt ? dayjs(task.createdAt.toDate()).format('DD/MM/YYYY HH:mm') : '-'}</td>
                  <td>${task.ultimaExecucao ? dayjs(task.ultimaExecucao.toDate()).format('DD/MM/YYYY HH:mm') : '-'}</td>
                  <td>${task.observacoes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.tipo}
                label="Tipo"
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="nao_recorrente">Não recorrente</MenuItem>
                <MenuItem value="diaria">Diária</MenuItem>
                <MenuItem value="semanal">Semanal</MenuItem>
                <MenuItem value="mensal">Mensal</MenuItem>
                <MenuItem value="por_horario">Por horário</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="Pendente">Pendente</MenuItem>
                <MenuItem value="Em andamento">Em andamento</MenuItem>
                <MenuItem value="Finalizada">Finalizada</MenuItem>
                <MenuItem value="Aguardando">Aguardando</MenuItem>
                <MenuItem value="Urgente">Urgente</MenuItem>
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
              <InputLabel>Ordenar por</InputLabel>
              <Select
                value={filters.ordenacao}
                label="Ordenar por"
                onChange={(e) => handleFilterChange('ordenacao', e.target.value)}
              >
                <MenuItem value="data">Data de criação</MenuItem>
                <MenuItem value="tipo">Tipo</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );

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
          onClick={handlePrintReport}
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
              <TableCell>Descrição</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data Criação</TableCell>
              <TableCell>Última Execução</TableCell>
              <TableCell>Observações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.descricao}</TableCell>
                <TableCell>
                  <Chip
                    label={getTipoLabel(task.tipo)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={task.status}
                    color={getStatusColor(task.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {task.createdAt ? dayjs(task.createdAt.toDate()).format('DD/MM/YYYY HH:mm') : '-'}
                </TableCell>
                <TableCell>
                  {task.ultimaExecucao ? dayjs(task.ultimaExecucao.toDate()).format('DD/MM/YYYY HH:mm') : '-'}
                </TableCell>
                <TableCell>{task.observacoes || '-'}</TableCell>
              </TableRow>
            ))}
            {filteredTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhuma tarefa encontrada com os filtros selecionados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
} 