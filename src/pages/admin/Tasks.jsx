import React, { useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

// Dados de exemplo
const SAMPLE_TASKS = [
  {
    id: 1,
    descricao: 'Organizar apresentação de fim de ano',
    responsavel: 'Maria Silva',
    prazoLimite: '2024-12-10',
    observacoes: 'Preparar coreografia e músicas'
  },
  {
    id: 2,
    descricao: 'Manutenção dos equipamentos',
    responsavel: 'João Santos',
    prazoLimite: '2024-03-15',
    observacoes: 'Verificar patins e equipamentos de segurança'
  },
  {
    id: 3,
    descricao: 'Reunião com pais',
    responsavel: 'Ana Oliveira',
    prazoLimite: '2024-04-01',
    observacoes: 'Discutir progresso dos alunos e próximos eventos'
  },
  {
    id: 4,
    descricao: 'Atualizar planilha de frequência',
    responsavel: 'Carlos Lima',
    prazoLimite: '2024-03-05',
    observacoes: 'Incluir novos alunos e verificar faltas'
  },
  {
    id: 5,
    descricao: 'Preparar festival de inverno',
    responsavel: 'Maria Silva',
    prazoLimite: '2024-07-15',
    observacoes: 'Definir tema e programação'
  }
];

const RESPONSAVEIS = [
  'Maria Silva',
  'João Santos',
  'Ana Oliveira',
  'Carlos Lima',
  'Patricia Souza'
];

export default function Tasks() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    descricao: '',
    responsavel: '',
    prazoLimite: dayjs().format('YYYY-MM-DD'),
    observacoes: ''
  });

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        descricao: task.descricao,
        responsavel: task.responsavel,
        prazoLimite: task.prazoLimite,
        observacoes: task.observacoes
      });
    } else {
      setEditingTask(null);
      setFormData({
        descricao: '',
        responsavel: '',
        prazoLimite: dayjs().format('YYYY-MM-DD'),
        observacoes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleSubmit = () => {
    if (editingTask) {
      // Editar tarefa existente
      setTasks(tasks.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...formData }
          : task
      ));
    } else {
      // Adicionar nova tarefa
      const newTask = {
        id: Math.max(...tasks.map(t => t.id)) + 1,
        ...formData
      };
      setTasks([...tasks, newTask]);
    }
    handleCloseDialog();
  };

  const handleDelete = (taskId) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      setTasks(tasks.filter(task => task.id !== taskId));
    }
  };

  const getStatusColor = (prazoLimite) => {
    const hoje = dayjs();
    const prazo = dayjs(prazoLimite);
    const diasRestantes = prazo.diff(hoje, 'day');

    if (diasRestantes < 0) return 'error';
    if (diasRestantes <= 7) return 'warning';
    return 'success';
  };

  return (
    <MainLayout title="Tarefas">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Gerenciamento de Tarefas
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nova Tarefa
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Descrição</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Prazo</TableCell>
                <TableCell>Observações</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.descricao}</TableCell>
                  <TableCell>{task.responsavel}</TableCell>
                  <TableCell>
                    <Chip
                      label={dayjs(task.prazoLimite).format('DD/MM/YYYY')}
                      color={getStatusColor(task.prazoLimite)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{task.observacoes}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(task)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(task.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog para adicionar/editar tarefa */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                required
              />

              <FormControl fullWidth required>
                <InputLabel>Responsável</InputLabel>
                <Select
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  label="Responsável"
                >
                  {RESPONSAVEIS.map((responsavel) => (
                    <MenuItem key={responsavel} value={responsavel}>
                      {responsavel}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Prazo Limite"
                type="date"
                value={formData.prazoLimite}
                onChange={(e) => setFormData({ ...formData, prazoLimite: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />

              <TextField
                fullWidth
                label="Observações"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                multiline
                rows={4}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.descricao || !formData.responsavel || !formData.prazoLimite}
            >
              {editingTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
} 