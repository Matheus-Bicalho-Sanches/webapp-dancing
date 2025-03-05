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
  Stack,
  Button
} from '@mui/material';
import { 
  FilterList as FilterListIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { collection, query, getDocs, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';

export default function ClassReport() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('todas');
  
  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (classes.length > 0) {
      loadStudentsByClass();
    }
  }, [selectedClass, classes]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const classesRef = collection(db, 'turmasData');
      const classesQuery = query(classesRef, orderBy('nome'));
      const snapshot = await getDocs(classesQuery);
      
      const classesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setClasses(classesData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      setLoading(false);
    }
  };

  const loadStudentsByClass = async () => {
    try {
      setLoading(true);
      setStudents([]);
      
      // Buscar as turmas com seus alunos
      const turmasRef = collection(db, 'turmasData');
      let turmasQuery;
      
      if (selectedClass === 'todas') {
        turmasQuery = query(turmasRef);
      } else {
        turmasQuery = query(turmasRef);
      }
      
      const turmasSnapshot = await getDocs(turmasQuery);
      
      // Array para armazenar todas as promessas de busca de alunos
      const alunosPromises = [];
      const turmasData = {};
      
      // Para cada turma, buscar os dados dos alunos
      for (const turmaDoc of turmasSnapshot.docs) {
        const turma = turmaDoc.data();
        const turmaId = turmaDoc.id;
        
        // Verificar se a turma tem alunos
        if (selectedClass === 'todas' || turmaId === selectedClass) {
          const alunosIds = turma.alunos || [];
          
          if (alunosIds.length > 0) {
            // Armazenar dados da turma para uso posterior
            turmasData[turmaId] = {
              nome: turma.nome,
              dias: turma.dias || [],
              horario: turma.horario || 'N/A',
              horarioTermino: turma.horarioTermino || 'N/A'
            };
            
            // Criar promessas para buscar dados de cada aluno
            for (const alunoId of alunosIds) {
              alunosPromises.push(
                getDoc(doc(db, 'alunos', alunoId)).then(alunoDoc => {
                  if (alunoDoc.exists()) {
                    return {
                      id: alunoDoc.id,
                      ...alunoDoc.data(),
                      turmaId: turmaId,
                      turmaNome: turma.nome,
                      turmaDias: turma.dias || [],
                      turmaHorario: turma.horario || 'N/A'
                    };
                  }
                  return null;
                })
              );
            }
          }
        }
      }
      
      // Aguardar todas as promessas
      const alunosResults = await Promise.all(alunosPromises);
      
      // Filtrar resultados nulos e formatar dados para exibição
      const studentsData = alunosResults
        .filter(aluno => aluno !== null)
        .map(aluno => ({
          id: aluno.id,
          nome: aluno.nome || 'N/A',
          matricula: aluno.matricula || 'N/A',
          telefone: aluno.telefone || 'N/A',
          email: aluno.email || 'N/A',
          turma: aluno.turmaNome,
          turmaId: aluno.turmaId,
          dias: aluno.turmaDias,
          horario: aluno.turmaHorario
        }));
      
      // Ordenar por nome da turma e depois por nome do aluno
      studentsData.sort((a, b) => {
        if (a.turma === b.turma) {
          return a.nome.localeCompare(b.nome);
        }
        return a.turma.localeCompare(b.turma);
      });
      
      setStudents(studentsData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar alunos por turma:', error);
      setLoading(false);
    }
  };

  const handleClassChange = (event) => {
    setSelectedClass(event.target.value);
  };
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    // Agrupar alunos por turma para facilitar a impressão
    const turmasAlunos = {};
    students.forEach(student => {
      if (!turmasAlunos[student.turma]) {
        turmasAlunos[student.turma] = [];
      }
      turmasAlunos[student.turma].push(student);
    });
    
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Alunos por Turma</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { margin-bottom: 20px; text-align: center; }
            .filters { margin-bottom: 20px; }
            .turma-header { 
              background-color: #e3f2fd; 
              font-weight: bold;
              text-align: left;
              padding: 10px;
              border-bottom: 2px solid #1976d2;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Relatório de Alunos por Turma</h2>
            <p>Data de geração: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
          </div>
          
          <div class="filters">
            <p><strong>Turma:</strong> ${selectedClass === 'todas' ? 'Todas as turmas' : classes.find(c => c.id === selectedClass)?.nome || 'N/A'}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Matrícula</th>
                <th>Nome do Aluno</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Turma</th>
                <th>Dias</th>
                <th>Horário</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(turmasAlunos).map(([turmaNome, alunos]) => `
                <tr><td colspan="7" class="turma-header">${turmaNome}</td></tr>
                ${alunos.map(student => `
                  <tr>
                    <td>${student.matricula}</td>
                    <td>${student.nome}</td>
                    <td>${student.telefone}</td>
                    <td>${student.email}</td>
                    <td>${student.turma}</td>
                    <td>${student.dias.join(', ')}</td>
                    <td>${student.horario}</td>
                  </tr>
                `).join('')}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon />
            Filtros
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Imprimir Relatório
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Turma</InputLabel>
              <Select
                value={selectedClass}
                label="Turma"
                onChange={handleClassChange}
              >
                <MenuItem value="todas">Todas as turmas</MenuItem>
                {classes.map(turma => (
                  <MenuItem key={turma.id} value={turma.id}>
                    {turma.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );

  if (loading && classes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {renderFilters()}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Matrícula</TableCell>
                <TableCell>Nome do Aluno</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Turma</TableCell>
                <TableCell>Dias</TableCell>
                <TableCell>Horário</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.length > 0 ? (
                students.map((student, index, array) => {
                  const isFirstOfTurma = index === 0 || student.turma !== array[index - 1].turma;
                  
                  return (
                    <React.Fragment key={student.id}>
                      {isFirstOfTurma && (
                        <TableRow>
                          <TableCell 
                            colSpan={7} 
                            sx={{ 
                              backgroundColor: '#e3f2fd', 
                              fontWeight: 'bold',
                              borderBottom: '2px solid #1976d2'
                            }}
                          >
                            {student.turma}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell>{student.matricula}</TableCell>
                        <TableCell>{student.nome}</TableCell>
                        <TableCell>{student.telefone}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.turma}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {student.dias.map((dia, idx) => (
                              <Chip key={idx} label={dia} size="small" />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>{student.horario}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhum aluno encontrado para a turma selecionada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
} 