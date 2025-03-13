import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
  IconButton,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Print as PrintIcon,
  PieChart as PieChartIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

// Configurar dayjs para usar o locale português-Brasil
dayjs.locale('pt-br');

const IndividualClassesReport = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState([]);
  const [filteredReport, setFilteredReport] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [selectedProfessor, setSelectedProfessor] = useState('todos');
  const [reportType, setReportType] = useState('por_professor');
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [statistics, setStatistics] = useState({
    totalClasses: 0,
    totalRevenue: 0,
    totalCashRevenue: 0,
    classesByProfessor: {},
    revenueByProfessor: {}
  });
  const [activeTab, setActiveTab] = useState(0);

  // Verificar a estrutura da coleção de agendamentos ao iniciar o componente
  useEffect(() => {
    const checkCollectionStructure = async () => {
      try {
        // Obter uma pequena amostra de documentos para verificar estrutura
        const agendamentosRef = collection(db, 'agendamentos');
        const sampleQuery = query(agendamentosRef, limit(10));
        const sampleSnapshot = await getDocs(sampleQuery);
        
        console.log(`Verificando estrutura da coleção 'agendamentos'...`);
        console.log(`Encontrados ${sampleSnapshot.size} documentos de exemplo.`);
        
        if (sampleSnapshot.empty) {
          console.log('A coleção agendamentos parece estar vazia.');
        } else {
          // Analisar a estrutura dos dados
          sampleSnapshot.forEach((doc, index) => {
            const data = doc.data();
            
            // Verificar campos com datas
            const temDataAgendamento = data.dataAgendamento && typeof data.dataAgendamento.toDate === 'function';
            const temCreatedAt = data.createdAt && typeof data.createdAt.toDate === 'function';
            const temHorarios = data.horarios && Array.isArray(data.horarios) && data.horarios.length > 0;
            
            // Verificar campos relacionados ao professor
            const temProfessorId = !!data.professorId;
            const temProfessorNome = !!data.professorNome;
            console.log(`Documento ${doc.id} - Tem professorId: ${temProfessorId}, Tem professorNome: ${temProfessorNome}`);
            
            if (temProfessorId) console.log(`  - professorId: ${data.professorId}`);
            if (temProfessorNome) console.log(`  - professorNome: ${data.professorNome}`);
            
            // Verificar campos de aula e informações do professor nos horários
            if (temHorarios) {
              console.log(`  - Horários: ${data.horarios.length}`);
              
              // Analisar até 3 horários por documento para não sobrecarregar o console
              const horariosSample = data.horarios.slice(0, 3);
              horariosSample.forEach((horario, horarioIdx) => {
                const horarioProfessorId = !!horario.professorId;
                const horarioProfessorNome = !!horario.professorNome;
                
                if (horarioProfessorId || horarioProfessorNome) {
                  console.log(`    - Horário #${horarioIdx + 1}:`);
                  if (horarioProfessorId) console.log(`      - professorId: ${horario.professorId}`);
                  if (horarioProfessorNome) console.log(`      - professorNome: ${horario.professorNome}`);
                }
              });
              
              if (data.horarios.length > 3) {
                console.log(`    - ... e mais ${data.horarios.length - 3} horários`);
              }
            }
          });
        }
      } catch (error) {
        console.error('Erro ao verificar estrutura da coleção:', error);
      }
    };
    
    checkCollectionStructure();
  }, []);

  // Carregar lista de professores
  useEffect(() => {
    const loadProfessors = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userType', 'in', ['teacher', 'master']));
        const querySnapshot = await getDocs(q);
        
        const professorsData = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          professorsData.push({
            id: doc.id,
            name: userData.name || 'Nome não disponível'
          });
        });
        
        setProfessors(professorsData);
      } catch (error) {
        console.error('Erro ao carregar professores:', error);
      }
    };
    
    loadProfessors();
  }, []);

  // Função para diagnóstico de agendamentos
  const diagnosticarAgendamentos = (filteredDocs) => {
    console.log('======== DIAGNÓSTICO DE AGENDAMENTOS ========');
    console.log(`Total de agendamentos filtrados: ${filteredDocs.length}`);
    
    // Analisa cada agendamento
    filteredDocs.forEach(({ doc, datesInRange }, index) => {
      const docData = doc.data();
      console.log(`\nAgendamento #${index + 1} (${doc.id}):`);
      
      // Verificar dados do professor no documento principal
      const temProfessorIdPrincipal = !!docData.professorId;
      const temProfessorNomePrincipal = !!docData.professorNome;
      
      console.log(`- Documento principal: professorId=${temProfessorIdPrincipal ? docData.professorId : 'não'}, professorNome=${temProfessorNomePrincipal ? docData.professorNome : 'não'}`);
      
      // Verificar array de horários
      if (docData.horarios && Array.isArray(docData.horarios)) {
        console.log(`- Tem ${docData.horarios.length} horário(s) total`);
      } else {
        console.log('- Não tem array de horários');
      }
      
      // Verificar datas no intervalo
      console.log(`- Tem ${datesInRange.length} data(s) no intervalo selecionado`);
      datesInRange.forEach((dateInfo, dateIndex) => {
        console.log(`  Data #${dateIndex + 1}: ${dateInfo.date.toISOString()}`);
        console.log(`    professorId: ${dateInfo.professorId || 'não informado'}`);
        console.log(`    professorNome: ${dateInfo.professorNome || 'não informado'}`);
      });
    });
    
    console.log('============================================');
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      console.log('Iniciando pesquisa de aulas individuais...');
      
      // Converter datas para objetos do Firestore para comparação
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      console.log('Período de pesquisa:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Buscar aulas individuais
      const agendamentosRef = collection(db, 'agendamentos');
      
      // Consulta base - sem filtros
      console.log('Construindo query...');
      const q = query(agendamentosRef);
      
      console.log('Executando consulta...');
      const querySnapshot = await getDocs(q);
      console.log(`Encontrados ${querySnapshot.size} resultados.`);
      
      // Processar resultados
      const classesData = [];
      let professorsMap = new Map(); // Para armazenar dados dos professores
      let studentsMap = new Map(); // Para armazenar dados dos alunos
      
      // Primeiro, coletar IDs únicos de professores e alunos
      const professorIds = new Set();
      const studentIds = new Set();
      
      // Filtrar agendamentos pelo período de data
      const filteredDocs = [];
      
      querySnapshot.forEach((doc) => {
        const classData = doc.data();
        
        // Lógica adaptada para lidar com diferentes estruturas de dados
        let classDates = [];
        
        // Verificar se existe dataAgendamento
        if (classData.dataAgendamento && typeof classData.dataAgendamento.toDate === 'function') {
          classDates.push({
            date: classData.dataAgendamento.toDate(),
            time: classData.horario || '12:00',
            professorId: classData.professorId || '',
            professorNome: classData.professorNome || ''
          });
        }
        
        // Verificar se existe horarios (array)
        if (classData.horarios && Array.isArray(classData.horarios)) {
          for (const horario of classData.horarios) {
            if (horario.data && typeof horario.data.toDate === 'function') {
              // Garantir que capturamos explicitamente o professorNome do horário
              const professorNome = horario.professorNome || '';
              
              classDates.push({
                date: horario.data.toDate(),
                time: horario.horario || '12:00',
                professorId: horario.professorId || '',
                professorNome: professorNome
              });
              
              // Registrar explicitamente quando encontramos um professorNome
              if (professorNome) {
                console.log(`Encontrado professorNome "${professorNome}" no horário para data ${horario.data.toDate().toISOString()}`);
              }
            }
          }
        }
        
        // Registrar também se o documento principal tem professorNome
        if (classData.professorNome) {
          console.log(`Documento ${doc.id} tem professorNome "${classData.professorNome}" no nível principal`);
        }
        
        console.log(`Documento ${doc.id} tem ${classDates.length} datas de aula.`);
        
        // Se não encontramos nenhuma data, pular este documento
        if (classDates.length === 0) {
          console.log(`Documento sem datas válidas: ${doc.id}`);
          return;
        }
        
        // Filtrar pelas datas no período
        const datesInRange = classDates.filter(dateInfo => 
          dateInfo.date >= startDate && dateInfo.date <= endDate
        );
        
        if (datesInRange.length > 0) {
          // Adicionar documento aos filtrados
          filteredDocs.push({
            doc,
            datesInRange
          });
          
          // Coletar IDs de professores e alunos
          // Dos horários
          datesInRange.forEach(dateInfo => {
            if (dateInfo.professorId) {
              professorIds.add(dateInfo.professorId);
              console.log(`Adicionando professorId: ${dateInfo.professorId}, Nome: ${dateInfo.professorNome || 'não disponível'}`);
            }
          });
          
          // Do documento principal
          if (classData.professorId) {
            professorIds.add(classData.professorId);
            console.log(`Adicionando professorId do documento principal: ${classData.professorId}`);
          }
          
          if (classData.alunoId) {
            studentIds.add(classData.alunoId);
          }
        }
      });
      
      console.log(`Após filtro de data: ${filteredDocs.length} resultados.`);
      console.log('IDs de professores:', [...professorIds]);
      console.log('IDs de alunos:', [...studentIds]);
      
      // Diagnóstico detalhado dos agendamentos após filtragem
      diagnosticarAgendamentos(filteredDocs);
      
      // Buscar dados dos professores
      for (const professorId of professorIds) {
        try {
          const professorDoc = await getDoc(doc(db, 'users', professorId));
          if (professorDoc.exists()) {
            professorsMap.set(professorId, {
              id: professorId,
              name: professorDoc.data().name || 'Nome não disponível'
            });
          } else {
            console.log(`Professor não encontrado: ${professorId}`);
          }
        } catch (error) {
          console.error(`Erro ao buscar professor ${professorId}:`, error);
        }
      }
      
      // Buscar dados dos alunos
      for (const studentId of studentIds) {
        try {
          const studentDoc = await getDoc(doc(db, 'alunos', studentId));
          if (studentDoc.exists()) {
            studentsMap.set(studentId, {
              id: studentId,
              name: studentDoc.data().nome || 'Nome não disponível'
            });
          } else {
            console.log(`Aluno não encontrado: ${studentId}`);
          }
        } catch (error) {
          console.error(`Erro ao buscar aluno ${studentId}:`, error);
        }
      }
      
      console.log('Processando documentos filtrados...');
      
      // Agora processar os dados das aulas com as informações obtidas
      filteredDocs.forEach(({ doc: docRef, datesInRange }) => {
        const classData = docRef.data();
        
        // Processar cada data no intervalo separadamente
        datesInRange.forEach(dateInfo => {
          // Obter dados do professor
          let professorId = dateInfo.professorId || classData.professorId || 'não-informado';
          
          // IMPORTANTE: Priorizar o professorNome do próprio horário (dateInfo)
          let professorName = dateInfo.professorNome || classData.professorNome || '';
          
          console.log(`Processando aula: ${docRef.id} - Professor: ID=${professorId}, Nome inicial=${professorName}`);
          
          // Se não temos o nome do professor, tentar buscar pelo ID
          if (!professorName && professorId !== 'não-informado') {
            const professor = professorsMap.get(professorId);
            if (professor) {
              professorName = professor.name;
              console.log(`Nome do professor obtido do cache: ${professorName}`);
            } else {
              professorName = 'Professor não encontrado';
              console.log(`Professor com ID ${professorId} não encontrado no cache`);
            }
          }
          
          console.log(`Nome final do professor: ${professorName || 'Nome não disponível'}`);
          
          // Obter nome do aluno
          let studentName = classData.nomeAluno || '';
          let studentId = classData.alunoId || 'não-informado';
          
          if (studentId !== 'não-informado') {
            const student = studentsMap.get(studentId);
            if (student) {
              studentName = student.name;
            }
          }
          
          if (!studentName) {
            studentName = 'Aluno não informado';
          }
          
          // Calcular valores financeiros
          const status = classData.status || 'pendente';
          const valorPago = parseFloat(classData.valorPago || 0);
          let valorAula = parseFloat(classData.valorAula || classData.valorUnitario || 0);
          
          // Se não temos valor da aula individual, tentar calcular do valor total
          if (valorAula === 0 && classData.valorTotal && classData.quantidadeAulas) {
            valorAula = parseFloat(classData.valorTotal) / parseInt(classData.quantidadeAulas);
          }
          
          classesData.push({
            id: docRef.id + '-' + dateInfo.date.getTime(), // Criar ID único para cada aula
            date: dayjs(dateInfo.date).format('DD/MM/YYYY'),
            time: dateInfo.time,
            professorId: professorId,
            professorName: professorName || 'Nome não disponível',
            studentId: studentId,
            studentName: studentName,
            status: status,
            paymentStatus: classData.statusPagamento || 'não informado',
            classFee: valorAula,
            paidAmount: valorPago,
            rawDate: dateInfo.date
          });
        });
      });
      
      console.log(`Processados ${classesData.length} registros de aulas.`);
      
      // Ordenar os dados por data (mais recente primeiro)
      classesData.sort((a, b) => b.rawDate - a.rawDate);
      
      // Log detalhado dos registros processados
      console.log('Registros de aula finalizados:');
      classesData.forEach((aula, index) => {
        console.log(`Aula #${index + 1}:`, {
          data: aula.date,
          horario: aula.time,
          professorId: aula.professorId,
          professorName: aula.professorName,
          studentName: aula.studentName
        });
      });
      
      // Atualizar estado com os dados buscados
      setReport(classesData);
      
      // Aplicar filtro inicial
      applyFilters(classesData, selectedProfessor, reportType);
      
      console.log('Pesquisa concluída com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar relatório de aulas individuais:', error);
      console.error({
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para aplicar filtros aos dados do relatório
  const applyFilters = (data, professor, type) => {
    console.log('Aplicando filtros:', { professor, type, dataLength: data.length });
    
    let filtered = [...data];
    
    // Filtrar por professor se necessário
    if (professor !== 'todos') {
      console.log(`Filtrando por professor ID: ${professor}`);
      filtered = filtered.filter(item => item.professorId === professor);
      console.log(`Após filtro de professor: ${filtered.length} resultados`);
    }
    
    // Calcular estatísticas
    const stats = {
      totalClasses: filtered.length,
      totalRevenue: 0,
      totalCashRevenue: 0,
      classesByProfessor: {},
      revenueByProfessor: {}
    };
    
    // Processar dados para estatísticas
    filtered.forEach(item => {
      try {
        // Verificação de valores antes de acessá-los
        const classFee = Number(item.classFee) || 0;
        const paidAmount = Number(item.paidAmount) || 0;
        const professorId = item.professorId || 'desconhecido';
        const professorName = item.professorName || 'Professor desconhecido';
        
        // Contagem de aulas por professor
        if (!stats.classesByProfessor[professorId]) {
          stats.classesByProfessor[professorId] = {
            count: 0,
            name: professorName
          };
        }
        stats.classesByProfessor[professorId].count++;
        
        // Receita total (competência)
        stats.totalRevenue += classFee;
        
        // Receita por professor (competência)
        if (!stats.revenueByProfessor[professorId]) {
          stats.revenueByProfessor[professorId] = {
            amount: 0,
            name: professorName
          };
        }
        stats.revenueByProfessor[professorId].amount += classFee;
        
        // Receita total (caixa - baseado em pagamentos confirmados)
        if (item.paymentStatus === 'pago') {
          stats.totalCashRevenue += paidAmount;
        }
      } catch (error) {
        console.error('Erro ao processar item para estatísticas:', error, item);
      }
    });
    
    console.log('Estatísticas calculadas:', {
      totalClasses: stats.totalClasses,
      totalRevenue: stats.totalRevenue,
      totalCashRevenue: stats.totalCashRevenue,
      professorCount: Object.keys(stats.classesByProfessor).length
    });
    
    setStatistics(stats);
    setFilteredReport(filtered);
  };

  // Atualizar filtros quando mudarem
  useEffect(() => {
    if (report.length > 0) {
      applyFilters(report, selectedProfessor, reportType);
    } else if (report.length === 0 && !loading) {
      console.log('Nenhum dado encontrado para o período selecionado.');
    }
  }, [selectedProfessor, reportType, report, loading]);

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfessorChange = (event) => {
    setSelectedProfessor(event.target.value);
  };

  const handleReportTypeChange = (event) => {
    setReportType(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePrint = () => {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    
    // Estilos para impressão
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2, h3 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .header { margin-bottom: 20px; }
        .report-section { margin-bottom: 30px; }
        .summary-box { 
          display: inline-block; 
          border: 1px solid #ddd; 
          border-radius: 4px;
          padding: 10px; 
          margin: 5px;
          min-width: 200px;
          text-align: center;
        }
        .summary-value { 
          font-size: 1.5em; 
          font-weight: bold; 
          margin: 5px 0;
        }
        .summary-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-around;
          margin-bottom: 20px;
        }
        @media print {
          button { display: none; }
        }
      </style>
    `;

    // Formatar os dados para o relatório
    const formatCurrency = (value) => {
      return (value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    };

    // Construir o conteúdo HTML para impressão
    let content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Aulas Individuais</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Aulas Individuais</h1>
            <p>Período: ${dayjs(dateRange.startDate).format('DD/MM/YYYY')} a ${dayjs(dateRange.endDate).format('DD/MM/YYYY')}</p>
            <p>Professor: ${selectedProfessor === 'todos' ? 'Todos os professores' : professors.find(p => p.id === selectedProfessor)?.name || 'Não especificado'}</p>
          </div>

          <div class="report-section">
            <h2>Resumo</h2>
            <div class="summary-container">
              <div class="summary-box">
                <div>Total de Aulas</div>
                <div class="summary-value">${statistics.totalClasses}</div>
              </div>
              <div class="summary-box">
                <div>Faturamento Total (Competência)</div>
                <div class="summary-value">${formatCurrency(statistics.totalRevenue)}</div>
              </div>
              <div class="summary-box">
                <div>Faturamento Total (Caixa)</div>
                <div class="summary-value">${formatCurrency(statistics.totalCashRevenue)}</div>
              </div>
            </div>
          </div>
    `;

    // Adicionar seção de aulas por professor
    content += `
      <div class="report-section">
        <h2>Aulas por Professor</h2>
        <table>
          <thead>
            <tr>
              <th>Professor</th>
              <th>Quantidade de Aulas</th>
              <th>Faturamento</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Adicionar dados de professores
    Object.keys(statistics.classesByProfessor).forEach(professorId => {
      const profData = statistics.classesByProfessor[professorId];
      const profRevenue = statistics.revenueByProfessor[professorId]?.amount || 0;
      
      content += `
        <tr>
          <td>${profData.name}</td>
          <td>${profData.count}</td>
          <td>${formatCurrency(profRevenue)}</td>
        </tr>
      `;
    });

    content += `
          </tbody>
        </table>
      </div>
    `;

    // Adicionar seção de listagem detalhada de aulas
    content += `
      <div class="report-section">
        <h2>Listagem de Aulas</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Horário</th>
              <th>Professor</th>
              <th>Aluno</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Adicionar dados de aulas
    filteredReport.forEach(lesson => {
      content += `
        <tr>
          <td>${lesson.date}</td>
          <td>${lesson.time}</td>
          <td>${lesson.professorName || 'Nome não disponível'}</td>
          <td>${lesson.studentName}</td>
          <td>${lesson.status}</td>
          <td>${formatCurrency(lesson.classFee)}</td>
        </tr>
      `;
    });

    content += `
          </tbody>
        </table>
      </div>
    `;

    // Fechar o documento HTML
    content += `
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

  // Renderizar os filtros
  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon />
            Filtros
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={loading || filteredReport.length === 0}
          >
            Imprimir Relatório
          </Button>
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Data Inicial"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Data Final"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Professor</InputLabel>
              <Select
                value={selectedProfessor}
                label="Professor"
                onChange={handleProfessorChange}
              >
                <MenuItem value="todos">Todos os professores</MenuItem>
                {professors.map((professor) => (
                  <MenuItem key={professor.id} value={professor.id}>
                    {professor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSearch}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Pesquisar'}
            </Button>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );

  // Renderizar estatísticas
  const renderStatistics = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Total de Aulas
            </Typography>
            <Typography variant="h3" color="primary">
              {statistics.totalClasses || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Faturamento (Competência)
            </Typography>
            <Typography variant="h3" color="success.main">
              {(statistics.totalRevenue || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Faturamento (Caixa)
            </Typography>
            <Typography variant="h3" color="info.main">
              {(statistics.totalCashRevenue || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Renderizar aulas por professor
  const renderClassesByProfessor = () => (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>Professor</strong></TableCell>
            <TableCell align="center"><strong>Quantidade de Aulas</strong></TableCell>
            <TableCell align="right"><strong>Faturamento</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(statistics.classesByProfessor || {}).map(professorId => {
            const profData = statistics.classesByProfessor[professorId];
            const profRevenue = statistics.revenueByProfessor[professorId]?.amount || 0;
            
            return (
              <TableRow key={professorId}>
                <TableCell>{profData.name}</TableCell>
                <TableCell align="center">{profData.count}</TableCell>
                <TableCell align="right">
                  {profRevenue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </TableCell>
              </TableRow>
            );
          })}
          {Object.keys(statistics.classesByProfessor || {}).length === 0 && (
            <TableRow>
              <TableCell colSpan={3} align="center">
                Nenhum dado disponível
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Renderizar listagem de aulas
  const renderClassesList = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>Data</strong></TableCell>
            <TableCell><strong>Horário</strong></TableCell>
            <TableCell><strong>Professor</strong></TableCell>
            <TableCell><strong>Aluno</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell align="right"><strong>Valor</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredReport.map((lesson) => {
            // Garantir que classFee seja um número válido
            const classFee = Number(lesson.classFee) || 0;
            
            return (
              <TableRow key={lesson.id}>
                <TableCell>{lesson.date}</TableCell>
                <TableCell>{lesson.time}</TableCell>
                <TableCell>{lesson.professorName || 'Nome não disponível'}</TableCell>
                <TableCell>{lesson.studentName}</TableCell>
                <TableCell>
                  <Chip 
                    label={lesson.status} 
                    color={lesson.status === 'realizada' ? 'success' : lesson.status === 'cancelada' ? 'error' : 'warning'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell align="right">
                  {classFee.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </TableCell>
              </TableRow>
            );
          })}
          {filteredReport.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                Nenhuma aula encontrada com os filtros selecionados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Se não houver dados e não estiver carregando, mostrar mensagem para pesquisar
  if (report.length === 0 && !loading) {
    return (
      <Box>
        {renderFilters()}
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            Selecione um período e clique em Pesquisar
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Utilize os filtros acima para visualizar os dados de aulas individuais
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontSize: '0.9rem' }}>
            Dica: Se você já pesquisou e não encontrou resultados, verifique se existem aulas agendadas no período selecionado.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Renderizar loading
  if (loading) {
    return (
      <Box>
        {renderFilters()}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {renderFilters()}
      
      {/* Estatísticas */}
      {renderStatistics()}
      
      {/* Tabs para diferentes visualizações */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<PieChartIcon />} 
            label="Resumo por Professor" 
            id="tab-0" 
            aria-controls="tabpanel-0" 
          />
          <Tab 
            icon={<TableChartIcon />} 
            label="Listagem de Aulas" 
            id="tab-1" 
            aria-controls="tabpanel-1" 
          />
        </Tabs>
      </Box>
      
      {/* Conteúdo das tabs */}
      <Box hidden={activeTab !== 0} id="tabpanel-0" aria-labelledby="tab-0">
        {renderClassesByProfessor()}
      </Box>
      
      <Box hidden={activeTab !== 1} id="tabpanel-1" aria-labelledby="tab-1">
        {renderClassesList()}
      </Box>
    </Box>
  );
};

export default IndividualClassesReport; 