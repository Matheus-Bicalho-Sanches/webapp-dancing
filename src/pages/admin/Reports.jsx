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
  FilterList as FilterListIcon,
  Print as PrintIcon,
  Groups as GroupsIcon,
  ContactPhone as ContactPhoneIcon
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
import TaskReport from '../../components/reports/TaskReport';
import ClassReport from '../../components/reports/ClassReport';

export default function Reports() {
  const [openDialog, setOpenDialog] = useState({
    matriculas: false,
    financeiro: false,
    frequencia: false,
    tarefas: false,
    turmas: false,
    leads: false
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
  const [leadsData, setLeadsData] = useState([]);
  const [filteredLeadsData, setFilteredLeadsData] = useState([]);
  const [leadsFilters, setLeadsFilters] = useState({
    periodo: 'personalizado',
    dataInicio: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    dataFim: dayjs().format('YYYY-MM-DD'),
  });
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsStats, setLeadsStats] = useState({
    total: 0,
    experimental: 0,
    inativo: 0,
    matriculas: 0
  });

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
    },
    {
      id: 'turmas',
      title: 'Turmas',
      icon: <GroupsIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f' // vermelho
    },
    {
      id: 'leads',
      title: 'Leads',
      icon: <ContactPhoneIcon sx={{ fontSize: 40 }} />,
      color: '#0288d1' // azul claro
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
        case 'alfabetica':
          return a.nomeAluno.localeCompare(b.nomeAluno);
        default:
          return 0;
      }
    });

    setFilteredData(filtered);
  }, [enrollmentData, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handlePrintEnrollments = () => {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    
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
        .status-ativa { background-color: #e8f5e9; color: #2e7d32; }
        .status-vencida { background-color: #ffebee; color: #c62828; }
        .status-baixada { background-color: #f5f5f5; color: #757575; }
        .status-inativa { background-color: #f5f5f5; color: #757575; }
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
          <title>Relatório de Matrículas</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <h2>Relatório de Matrículas</h2>
            <p>Data de geração: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
          </div>
          <div class="filters">
            <p><strong>Filtros aplicados:</strong></p>
            <p>Status: ${filters.status === 'todos' ? 'Todos' : filters.status}</p>
            <p>Período: ${filters.periodo === 'todos' ? 'Todos' : filters.periodo}</p>
            ${filters.periodo === 'personalizado' ? 
              `<p>Data Inicial: ${dayjs(filters.dataInicio).format('DD/MM/YYYY')}</p>
               <p>Data Final: ${dayjs(filters.dataFim).format('DD/MM/YYYY')}</p>` : ''}
            <p>Plano: ${filters.plano === 'todos' ? 'Todos' : filters.plano}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID do Aluno</th>
                <th>Nome do Aluno</th>
                <th>Telefone</th>
                <th>Plano</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Período</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(row => `
                <tr>
                  <td>${row.alunoId}</td>
                  <td>${row.nomeAluno}</td>
                  <td>${row.telefone}</td>
                  <td>${row.plano}</td>
                  <td style="text-align: right">${row.valor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}</td>
                  <td>
                    <span class="status status-${getStatusLabel(row.status, row.dataTermino).toLowerCase()}">
                      ${getStatusLabel(row.status, row.dataTermino)}
                    </span>
                  </td>
                  <td>${dayjs(row.dataInicio).format('DD/MM/YYYY')} até ${dayjs(row.dataTermino).format('DD/MM/YYYY')}</td>
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

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon />
            Filtros
          </Typography>
          {openDialog.matriculas && (
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrintEnrollments}
            >
              Imprimir Relatório
            </Button>
          )}
        </Box>
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
                <MenuItem value="alfabetica">Ordem alfabética</MenuItem>
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

  // Nova função para carregar relatórios de leads
  const loadLeadsReport = async () => {
    try {
      setLeadsLoading(true);
      
      // Buscar leads diretamente da coleção "leads" ao invés de logs
      const leadsRef = collection(db, 'leads');
      const leadsQuery = query(
        leadsRef,
        orderBy('createdAt', 'desc')
      );
      const leadsSnapshot = await getDocs(leadsQuery);
      
      // Função auxiliar para processar datas, verificando o tipo antes de chamar toDate()
      const processDate = (date) => {
        if (!date) return null;
        
        // Se já for um objeto Date, retorná-lo diretamente
        if (date instanceof Date) return date;
        
        // Se for um Timestamp do Firebase, chamar toDate()
        if (date && typeof date.toDate === 'function') {
          return date.toDate();
        }
        
        // Se for uma string em formato de data
        if (typeof date === 'string') {
          try {
            return new Date(date);
          } catch (e) {
            console.log('Erro ao converter string para data:', date, e);
            return null;
          }
        }
        
        // Em caso de formato desconhecido
        console.log('Formato de data não reconhecido:', date);
        return null;
      };
      
      // Organizar dados para o relatório
      const processedLeads = leadsSnapshot.docs.map(doc => {
        const lead = doc.data();
        
        // Processar as datas com a função auxiliar
        const createdAt = processDate(lead.createdAt);
        const dataAE = processDate(lead.dataAE);
        
        return {
          id: doc.id,
          nome: lead.nome || 'Sem nome',
          createdAt: createdAt || new Date(),
          dataAE: dataAE,
          turmaAE: lead.turmaAE || '',
          status: lead.status || 'Lead',
          whatsapp: lead.whatsapp || '',
          observacoes: lead.observacoes || '',
          origemLead: lead.origemLead || '',
          // Verificações para relatório
          hasExperimental: lead.status === 'AE Agend' || dataAE !== null,
          isInactive: lead.status === 'Inativo'
        };
      });

      console.log('Total de leads encontrados:', processedLeads.length);
      
      // Aplicar filtros por período
      const startDate = dayjs(leadsFilters.dataInicio);
      const endDate = dayjs(leadsFilters.dataFim);
      
      let filteredReport = processedLeads;
      
      // Filtrar por período personalizado
      if (leadsFilters.periodo === 'personalizado') {
        filteredReport = processedLeads.filter(lead => {
          const leadDate = dayjs(lead.createdAt);
          return leadDate.isAfter(startDate) && leadDate.isBefore(endDate.add(1, 'day'));
        });
      }
      
      console.log('Leads filtrados por período:', filteredReport.length);
      
      // Calcular estatísticas
      const totalLeads = filteredReport.length;
      const leadsComAulaExperimental = filteredReport.filter(lead => 
        lead.hasExperimental || lead.status === 'AE Agend' || lead.dataAE !== null
      ).length;
      const leadsInativos = filteredReport.filter(lead => 
        lead.isInactive || lead.status === 'Inativo'
      ).length;
      const leadsMatriculados = filteredReport.filter(lead => {
        const status = (lead.status || '').toLowerCase();
        return status.includes('matricula') || status.includes('matrícula') || status === 'barra';
      }).length;
      
      console.log('Estatísticas calculadas:', {
        total: totalLeads,
        experimental: leadsComAulaExperimental,
        inativo: leadsInativos,
        matriculas: leadsMatriculados
      });
      
      setLeadsStats({
        total: totalLeads,
        experimental: leadsComAulaExperimental,
        inativo: leadsInativos,
        matriculas: leadsMatriculados
      });
      
      setLeadsData(processedLeads);
      setFilteredLeadsData(filteredReport);
    } catch (error) {
      console.error('Erro ao carregar relatório de leads:', error);
      
      // Log adicional para depuração
      console.error('Detalhes do erro:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Exibir alerta para o usuário
      alert(`Erro ao carregar leads: ${error.message}`);
    } finally {
      setLeadsLoading(false);
    }
  };

  // Aplicar filtros ao relatório de leads
  useEffect(() => {
    if (!leadsData.length) return;

    let filtered = [...leadsData];

    // Filtro de período
    if (leadsFilters.periodo === 'personalizado') {
      const filterInicio = dayjs(leadsFilters.dataInicio);
      const filterFim = dayjs(leadsFilters.dataFim).add(1, 'day');
      
      filtered = filtered.filter(lead => {
        const leadDate = dayjs(lead.createdAt);
        return leadDate.isAfter(filterInicio) && leadDate.isBefore(filterFim);
      });
    }

    // Calcular estatísticas com os dados filtrados
    const totalLeads = filtered.length;
    const leadsComAulaExperimental = filtered.filter(lead => 
      lead.hasExperimental || lead.status === 'AE Agend' || lead.dataAE !== null
    ).length;
    const leadsInativos = filtered.filter(lead => 
      lead.isInactive || lead.status === 'Inativo'
    ).length;
    const leadsMatriculados = filtered.filter(lead => {
      const status = (lead.status || '').toLowerCase();
      return status.includes('matricula') || status.includes('matrícula') || status === 'barra';
    }).length;
    
    setLeadsStats({
      total: totalLeads,
      experimental: leadsComAulaExperimental,
      inativo: leadsInativos,
      matriculas: leadsMatriculados
    });

    setFilteredLeadsData(filtered);
  }, [leadsData, leadsFilters]);

  const handleLeadsFilterChange = (field, value) => {
    setLeadsFilters(prev => ({ ...prev, [field]: value }));
  };

  // Função para obter a cor do chip de status baseado no status do lead
  const getLeadStatusColor = (status) => {
    if (!status) return 'warning'; // Cor padrão laranja para status vazio
    
    const normalizedStatus = status.toLowerCase();
    
    // Ajustando as cores para corresponder ao CRM
    if (normalizedStatus === 'lead') return 'warning'; // Laranja para leads
    if (normalizedStatus === 'inativo') return 'error'; // Vermelho para inativos
    if (normalizedStatus.includes('matricula') || normalizedStatus.includes('matrícula') || normalizedStatus === 'barra') return 'success'; // Verde para matrículas
    if (normalizedStatus.includes('ae') || normalizedStatus.includes('agend')) return 'primary'; // Azul para aulas experimentais
    if (normalizedStatus.includes('contato')) return 'info'; // Ciano para contatos
    
    return 'warning'; // Laranja para outros status não especificados
  };

  const renderLeadsFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon />
            Filtros
          </Typography>
          {openDialog.leads && (
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrintLeads}
              disabled={leadsLoading || filteredLeadsData.length === 0}
            >
              Imprimir Relatório
            </Button>
          )}
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Período</InputLabel>
              <Select
                value={leadsFilters.periodo}
                label="Período"
                onChange={(e) => handleLeadsFilterChange('periodo', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="personalizado">Personalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {leadsFilters.periodo === 'personalizado' && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Inicial"
                  type="date"
                  value={leadsFilters.dataInicio}
                  onChange={(e) => handleLeadsFilterChange('dataInicio', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Final"
                  type="date"
                  value={leadsFilters.dataFim}
                  onChange={(e) => handleLeadsFilterChange('dataFim', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
          
          <Grid item xs={12} sm={6} md={2}>
            <Button 
              variant="contained" 
              onClick={loadLeadsReport}
              disabled={leadsLoading}
              fullWidth
            >
              {leadsLoading ? <CircularProgress size={24} color="inherit" /> : 'Pesquisar'}
            </Button>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );

  const renderLeadsStats = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Novos Leads
            </Typography>
            <Typography variant="h3" color="primary">
              {leadsStats.total}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Aulas Experimentais
            </Typography>
            <Typography variant="h3" color="primary">
              {leadsStats.experimental}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Matrículas Realizadas
            </Typography>
            <Typography variant="h3" color="success.main">
              {leadsStats.matriculas}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Leads Inativos
            </Typography>
            <Typography variant="h3" color="text.secondary">
              {leadsStats.inativo}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderLeadsReport = () => {
    if (leadsLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    // Se não tiver dados e não estiver carregando, mostrar mensagem para pesquisar
    if (filteredLeadsData.length === 0 && !leadsLoading) {
      return (
        <>
          {renderLeadsFilters()}
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Selecione um período e clique em Pesquisar
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Utilize os filtros acima para visualizar os dados de leads
            </Typography>
          </Paper>
        </>
      );
    }

    return (
      <>
        {renderLeadsFilters()}
        {renderLeadsStats()}
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome do Lead</TableCell>
                <TableCell>Data de Criação</TableCell>
                <TableCell>Aula Experimental</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLeadsData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.nome}</TableCell>
                  <TableCell>{dayjs(row.createdAt).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    {row.hasExperimental || row.dataAE ? (
                      <Chip 
                        label={row.turmaAE ? `Agendada - ${row.turmaAE}` : "Agendada"} 
                        color="primary" 
                        size="small" 
                      />
                    ) : (
                      <Chip 
                        label="Não agendada" 
                        color="default" 
                        size="small" 
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status || 'Lead'} 
                      color={getLeadStatusColor(row.status || 'Lead')}
                      size="small"
                      sx={{
                        '& .MuiChip-label': {
                          color: normalizedStatus => 
                            normalizedStatus === 'default' ? 'inherit' : '#fff'
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  };

  const handlePrintLeads = () => {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    
    // Função para determinar a classe CSS para o status
    const getStatusClass = (status) => {
      if (!status) return 'status-lead';
      
      const normalizedStatus = status.toLowerCase();
      
      if (normalizedStatus === 'inativo') return 'status-inativo';
      if (normalizedStatus.includes('matricula') || normalizedStatus.includes('matrícula') || normalizedStatus === 'barra') return 'status-matricula';
      if (normalizedStatus.includes('ae') || normalizedStatus.includes('agend')) return 'status-aula-exp';
      if (normalizedStatus.includes('contato')) return 'status-contato';
      if (normalizedStatus === 'lead') return 'status-lead';
      
      return 'status-lead'; // Default para outros status
    };

    // Estilos para impressão
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .header { margin-bottom: 20px; }
        .filters { margin-bottom: 20px; }
        .stats { margin-bottom: 20px; display: flex; flex-wrap: wrap; }
        .stats-box { 
          border: 1px solid #ddd; 
          padding: 10px; 
          margin-bottom: 10px;
          display: inline-block;
          width: 23%;
          text-align: center;
          margin-right: 1%;
        }
        .stats-title { font-weight: bold; margin-bottom: 5px; }
        .stats-value { font-size: 24px; color: #1976d2; }
        .status-agendada { 
          display: inline-block;
          background-color: #e3f2fd; 
          color: #1976d2;
          border-radius: 16px;
          padding: 4px 8px;
          font-size: 12px;
        }
        .status-nao-agendada { 
          display: inline-block;
          background-color: #f5f5f5; 
          color: #757575;
          border-radius: 16px;
          padding: 4px 8px;
          font-size: 12px;
        }
        .status-lead {
          display: inline-block;
          background-color: #ff9800;
          color: white;
          border-radius: 16px;
          padding: 4px 8px;
          font-size: 12px;
        }
        .status-aula-exp {
          display: inline-block;
          background-color: #1976d2;
          color: white;
          border-radius: 16px;
          padding: 4px 8px;
          font-size: 12px;
        }
        .status-matricula {
          display: inline-block;
          background-color: #2e7d32;
          color: white;
          border-radius: 16px;
          padding: 4px 8px;
          font-size: 12px;
        }
        .status-inativo {
          display: inline-block;
          background-color: #d32f2f;
          color: white;
          border-radius: 16px;
          padding: 4px 8px;
          font-size: 12px;
        }
        .status-contato {
          display: inline-block;
          background-color: #0097a7;
          color: white;
          border-radius: 16px;
          padding: 4px 8px;
          font-size: 12px;
        }
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
          <title>Relatório de Leads</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <h2>Relatório de Leads</h2>
            <p>Data de geração: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
          </div>
          <div class="filters">
            <p><strong>Filtros aplicados:</strong></p>
            <p>Período: ${leadsFilters.periodo === 'todos' ? 'Todos' : 'Personalizado'}</p>
            ${leadsFilters.periodo === 'personalizado' ? 
              `<p>Data Inicial: ${dayjs(leadsFilters.dataInicio).format('DD/MM/YYYY')}</p>
               <p>Data Final: ${dayjs(leadsFilters.dataFim).format('DD/MM/YYYY')}</p>` : ''}
          </div>
          <div class="stats">
            <div class="stats-box">
              <div class="stats-title">Novos Leads</div>
              <div class="stats-value">${leadsStats.total}</div>
            </div>
            <div class="stats-box">
              <div class="stats-title">Aulas Experimentais</div>
              <div class="stats-value">${leadsStats.experimental}</div>
            </div>
            <div class="stats-box">
              <div class="stats-title">Matrículas Realizadas</div>
              <div class="stats-value" style="color: #2e7d32">${leadsStats.matriculas}</div>
            </div>
            <div class="stats-box">
              <div class="stats-title">Leads Inativos</div>
              <div class="stats-value" style="color: #757575">${leadsStats.inativo}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nome do Lead</th>
                <th>Data de Criação</th>
                <th>Aula Experimental</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLeadsData.map(row => `
                <tr>
                  <td>${row.nome}</td>
                  <td>${dayjs(row.createdAt).format('DD/MM/YYYY')}</td>
                  <td>
                    <span class="${(row.hasExperimental || row.dataAE) ? 'status-agendada' : 'status-nao-agendada'}">
                      ${(row.hasExperimental || row.dataAE) ? (row.turmaAE ? `Agendada - ${row.turmaAE}` : 'Agendada') : 'Não agendada'}
                    </span>
                  </td>
                  <td>
                    <span class="${getStatusClass(row.status)}">
                      ${row.status || 'Lead'}
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
    };
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
              ) : category.id === 'tarefas' ? (
                <TaskReport />
              ) : category.id === 'turmas' ? (
                <ClassReport />
              ) : category.id === 'leads' ? (
                renderLeadsReport()
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