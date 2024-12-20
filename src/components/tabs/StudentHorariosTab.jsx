import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Stack,
  Chip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function StudentHorariosTab({ studentId }) {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);

  useEffect(() => {
    loadTurmasDoAluno();
    loadTurmasDisponiveis();
  }, [studentId]);

  const loadTurmasDoAluno = async () => {
    try {
      setLoading(true);
      const turmasRef = collection(db, 'turmasData');
      const q = query(turmasRef, where('alunos', 'array-contains', studentId));
      const querySnapshot = await getDocs(q);
      const turmasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas do aluno:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTurmasDisponiveis = async () => {
    try {
      const turmasRef = collection(db, 'turmasData');
      const querySnapshot = await getDocs(turmasRef);
      const turmasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTurmasDisponiveis(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas disponíveis:', error);
    }
  };

  const handleAddTurma = async () => {
    if (!selectedTurma) return;

    try {
      const turmaRef = doc(db, 'turmasData', selectedTurma);
      const turmaDoc = await getDoc(turmaRef);

      if (turmaDoc.exists()) {
        const turmaData = turmaDoc.data();
        const alunosAtuais = turmaData.alunos || [];

        if (!alunosAtuais.includes(studentId)) {
          await updateDoc(turmaRef, {
            alunos: [...alunosAtuais, studentId],
            updatedAt: serverTimestamp()
          });
        }
      }

      setOpenDialog(false);
      setSelectedTurma(null);
      loadTurmasDoAluno();
    } catch (error) {
      console.error('Erro ao adicionar aluno à turma:', error);
    }
  };

  const handleRemoveTurma = async (turmaId) => {
    if (!window.confirm('Tem certeza que deseja remover o aluno desta turma?')) return;

    try {
      const turmaRef = doc(db, 'turmasData', turmaId);
      const turmaDoc = await getDoc(turmaRef);

      if (turmaDoc.exists()) {
        const turmaData = turmaDoc.data();
        const alunosAtuais = turmaData.alunos || [];

        await updateDoc(turmaRef, {
          alunos: alunosAtuais.filter(id => id !== studentId),
          updatedAt: serverTimestamp()
        });
      }

      loadTurmasDoAluno();
    } catch (error) {
      console.error('Erro ao remover aluno da turma:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Adicionar à Turma
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome da Turma</TableCell>
                <TableCell>Dias da Turma</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {turmas.map((turma) => (
                <TableRow key={turma.id}>
                  <TableCell>{turma.nome}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {(turma.dias || []).map((dia, index) => (
                        <Chip key={index} label={dia} size="small" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{turma.horario}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveTurma(turma.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {turmas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Aluno não está matriculado em nenhuma turma
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog para adicionar aluno a uma turma */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedTurma(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Adicionar Aluno à Turma
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Selecione a Turma</InputLabel>
              <Select
                value={selectedTurma || ''}
                onChange={(e) => setSelectedTurma(e.target.value)}
                label="Selecione a Turma"
              >
                {turmasDisponiveis
                  .filter(turma => !(turma.alunos || []).includes(studentId))
                  .map((turma) => (
                    <MenuItem key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.horario} ({(turma.dias || []).join(', ')})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setSelectedTurma(null);
          }}>
            Cancelar
          </Button>
          <Button
            onClick={handleAddTurma}
            variant="contained"
            disabled={!selectedTurma}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 