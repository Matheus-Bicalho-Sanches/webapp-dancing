import React, { useState, useEffect } from 'react';
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
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Link,
  Divider,
  Popover,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';

export default function CRM() {
  const { currentUser } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState(null);
  const [statusSort, setStatusSort] = useState('asc');
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);

  const [proxContatoFilter, setProxContatoFilter] = useState(null);
  const [proxContatoSort, setProxContatoSort] = useState('asc');
  const [proxContatoAnchorEl, setProxContatoAnchorEl] = useState(null);

  const [dataAEFilter, setDataAEFilter] = useState(null);
  const [dataAESort, setDataAESort] = useState('asc');
  const [dataAEAnchorEl, setDataAEAnchorEl] = useState(null);

  const [turmaAEFilter, setTurmaAEFilter] = useState(null);
  const [turmaAESort, setTurmaAESort] = useState('asc');
  const [turmaAEAnchorEl, setTurmaAEAnchorEl] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    status: 'Lead',
    whatsapp: '',
    ultimoContato: '',
    proximoContato: '',
    dataAE: '',
    turmaAE: '',
    observacoes: ''
  });

  // Status options for the leads
  const statusOptions = [
    'Lead',
    'AE Agend',
    'AE Feita',
    'Barra',
    'Matrícula',
    'Inativo'
  ];

  // Add this after statusOptions array
  const turmaOptions = [
    'D12N',
    'D13M',
    'D13T',
    'D13N',
    'D14M',
    'D14N',
    'ADULTO',
    'AI',
    'REC10',
    'REC11'
  ];

  // Add pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(50);

  // Add date conversion helpers
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  };

  const formatDateForSave = (inputDate) => {
    if (!inputDate) return '';
    try {
      // Create date at noon to avoid timezone issues
      const [year, month, day] = inputDate.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      return date.toISOString();
    } catch (error) {
      console.error('Error formatting date for save:', error);
      return '';
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      // Add 12 hours to the date to ensure it's in the middle of the day
      const date = new Date(dateString);
      date.setHours(12);
      return format(date, 'dd/MM/yy', { locale: ptBR });
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return '';
    }
  };

  // Filter handlers
  const handleStatusFilterClick = (event) => {
    setStatusAnchorEl(event.currentTarget);
  };

  const handleStatusFilterClose = () => {
    setStatusAnchorEl(null);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    handleStatusFilterClose();
  };

  const clearStatusFilter = () => {
    setStatusFilter(null);
    handleStatusFilterClose();
  };

  const handleProxContatoFilterClick = (event) => {
    setProxContatoAnchorEl(event.currentTarget);
  };

  const handleProxContatoFilterClose = () => {
    setProxContatoAnchorEl(null);
  };

  const handleProxContatoFilterChange = (date) => {
    setProxContatoFilter(date);
    handleProxContatoFilterClose();
  };

  const clearProxContatoFilter = () => {
    setProxContatoFilter(null);
    handleProxContatoFilterClose();
  };

  const handleDataAEFilterClick = (event) => {
    setDataAEAnchorEl(event.currentTarget);
  };

  const handleDataAEFilterClose = () => {
    setDataAEAnchorEl(null);
  };

  const handleDataAEFilterChange = (date) => {
    setDataAEFilter(date);
    handleDataAEFilterClose();
  };

  const clearDataAEFilter = () => {
    setDataAEFilter(null);
    handleDataAEFilterClose();
  };

  const handleTurmaAEFilterClick = (event) => {
    setTurmaAEAnchorEl(event.currentTarget);
  };

  const handleTurmaAEFilterClose = () => {
    setTurmaAEAnchorEl(null);
  };

  const handleTurmaAEFilterChange = (turma) => {
    setTurmaAEFilter(turma);
    handleTurmaAEFilterClose();
  };

  const clearTurmaAEFilter = () => {
    setTurmaAEFilter(null);
    handleTurmaAEFilterClose();
  };

  // Filter logic
  const filterLeads = (leadsToFilter) => {
    console.log('Starting filterLeads function');
    console.log('Current dataAESort value:', dataAESort);
    let filtered = [...leadsToFilter];

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Apply próximo contato filter
    if (proxContatoFilter) {
      filtered = filtered.filter(lead => {
        if (!lead.proximoContato) return false;
        return dayjs(lead.proximoContato).format('YYYY-MM-DD') === proxContatoFilter;
      });
    }

    // Apply data AE filter
    if (dataAEFilter) {
      filtered = filtered.filter(lead => {
        if (!lead.dataAE) return false;
        return dayjs(lead.dataAE).format('YYYY-MM-DD') === dataAEFilter;
      });
    }

    // Apply turma AE filter
    if (turmaAEFilter) {
      filtered = filtered.filter(lead => lead.turmaAE === turmaAEFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      console.log('Sorting with:', {
        statusSort,
        proxContatoSort,
        dataAESort,
        turmaAESort
      });

      // Status sorting
      if (statusSort && a.status !== b.status) {
        const aStatus = a.status || '';
        const bStatus = b.status || '';
        return statusSort === 'asc' 
          ? aStatus.localeCompare(bStatus)
          : bStatus.localeCompare(aStatus);
      }

      // Próximo contato sorting - moved before Data AE sorting
      if (proxContatoSort) {
        console.log('Applying Próximo Contato sort:', {
          direction: proxContatoSort,
          aProx: a.proximoContato,
          bProx: b.proximoContato
        });

        // Handle cases where one or both dates are missing
        if (!a.proximoContato && !b.proximoContato) return 0;
        if (!a.proximoContato) return 1;
        if (!b.proximoContato) return -1;

        const dateA = new Date(a.proximoContato);
        const dateB = new Date(b.proximoContato);

        const result = proxContatoSort === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();

        if (result !== 0) return result;
      }

      // Data AE sorting
      if (dataAESort) {
        // Handle cases where one or both dates are missing
        if (!a.dataAE && !b.dataAE) return 0;
        if (!a.dataAE) return 1;
        if (!b.dataAE) return -1;

        const dateA = new Date(a.dataAE);
        const dateB = new Date(b.dataAE);
        
        const result = dataAESort === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();

        if (result !== 0) return result;
      }

      // Turma AE sorting
      if (turmaAESort) {
        const aTurma = a.turmaAE || '';
        const bTurma = b.turmaAE || '';
        const result = turmaAESort === 'asc'
          ? aTurma.localeCompare(bTurma)
          : bTurma.localeCompare(aTurma);

        if (result !== 0) return result;
      }

      return 0;
    });

    return filtered;
  };

  // Update filtered leads when filters or leads change
  useEffect(() => {
    const filtered = filterLeads(leads);
    setFilteredLeads(filtered);
  }, [leads, statusFilter, proxContatoFilter, dataAEFilter, turmaAEFilter,
      statusSort, proxContatoSort, dataAESort, turmaAESort]);

  useEffect(() => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'leads'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const leadsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setLeads(leadsData);
          setLoading(false);
        },
        (error) => {
          console.error("Error loading leads:", error);
          setSnackbar({
            open: true,
            message: 'Erro ao carregar leads. Por favor, tente novamente.',
            severity: 'error'
          });
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up leads listener:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: 'Erro ao configurar monitoramento de leads.',
        severity: 'error'
      });
    }
  }, []);

  const handleOpenDialog = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        nome: lead.nome,
        status: lead.status,
        whatsapp: lead.whatsapp,
        ultimoContato: lead.ultimoContato || '',
        proximoContato: lead.proximoContato || '',
        dataAE: lead.dataAE || '',
        turmaAE: lead.turmaAE || '',
        observacoes: lead.observacoes || ''
      });
    } else {
      setEditingLead(null);
      setFormData({
        nome: '',
        status: 'Lead',
        whatsapp: '',
        ultimoContato: '',
        proximoContato: '',
        dataAE: '',
        turmaAE: '',
        observacoes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLead(null);
  };

  const handleSubmit = async () => {
    try {
      const leadData = {
        ...formData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editingLead) {
        await updateDoc(doc(db, 'leads', editingLead.id), leadData);
        setSnackbar({
          open: true,
          message: 'Lead atualizado com sucesso!',
          severity: 'success'
        });
      } else {
        await addDoc(collection(db, 'leads'), {
          ...leadData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
        setSnackbar({
          open: true,
          message: 'Lead criado com sucesso!',
          severity: 'success'
        });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar lead. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (leadId) => {
    if (window.confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        await deleteDoc(doc(db, 'leads', leadId));
        setSnackbar({
          open: true,
          message: 'Lead excluído com sucesso!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Erro ao excluir lead:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir lead. Por favor, tente novamente.',
          severity: 'error'
        });
      }
    }
  };

  const handleWhatsAppClick = (whatsapp) => {
    const formattedNumber = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${formattedNumber}`, '_blank');
  };

  // Add this new handler for inline status update
  const handleStatusUpdate = async (leadId, newStatus) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });
      setSnackbar({
        open: true,
        message: 'Status atualizado com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  // Add this new handler for turma updates
  const handleTurmaUpdate = async (leadId, newTurma) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        turmaAE: newTurma,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });
      setSnackbar({
        open: true,
        message: 'Turma atualizada com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao atualizar turma:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar turma. Por favor, tente novamente.',
        severity: 'error'
      });
    }
  };

  // Add pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Update handleStartEditing
  const handleStartEditing = (leadId, value) => {
    setEditingCell(leadId);
    setEditValue(formatDateForInput(value) || '');
  };

  // Update handleSaveEdit
  const handleSaveEdit = async (leadId, field) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        [field]: formatDateForSave(editValue),
        updatedAt: serverTimestamp(),
      });

      setSnackbar({
        open: true,
        message: field === 'ultimoContato' 
          ? 'Último contato atualizado com sucesso!'
          : field === 'proximoContato'
          ? 'Próximo contato atualizado com sucesso!'
          : 'Data da aula experimental atualizada com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating contact:', error);
      setSnackbar({
        open: true,
        message: field === 'ultimoContato'
          ? 'Erro ao atualizar último contato'
          : field === 'proximoContato'
          ? 'Erro ao atualizar próximo contato'
          : 'Erro ao atualizar data da aula experimental',
        severity: 'error'
      });
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (event, leadId, field) => {
    if (event.key === 'Enter') {
      handleSaveEdit(leadId, field);
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (loading) {
    return (
      <MainLayout title="CRM">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="CRM">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ color: '#000' }}>
            Gestão de Leads
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Novo Lead
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Status
                    <IconButton 
                      size="small" 
                      onClick={handleStatusFilterClick}
                      sx={{ 
                        ml: 1,
                        color: (statusFilter || statusSort === 'desc') ? 'primary.main' : 'inherit'
                      }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                    {statusFilter && (
                      <IconButton 
                        size="small" 
                        onClick={clearStatusFilter}
                        sx={{ ml: 0.5 }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell>WhatsApp</TableCell>
                <TableCell>Últ. Contato</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Próx. Contato
                    <IconButton 
                      size="small" 
                      onClick={handleProxContatoFilterClick}
                      sx={{ 
                        ml: 1,
                        color: (proxContatoFilter || proxContatoSort === 'desc') ? 'primary.main' : 'inherit'
                      }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                    {proxContatoFilter && (
                      <IconButton 
                        size="small" 
                        onClick={clearProxContatoFilter}
                        sx={{ ml: 0.5 }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Data AE
                    <IconButton 
                      size="small" 
                      onClick={handleDataAEFilterClick}
                      sx={{ 
                        ml: 1,
                        color: (dataAEFilter || dataAESort === 'desc') ? 'primary.main' : 'inherit'
                      }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                    {dataAEFilter && (
                      <IconButton 
                        size="small" 
                        onClick={clearDataAEFilter}
                        sx={{ ml: 0.5 }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Turma AE
                    <IconButton 
                      size="small" 
                      onClick={handleTurmaAEFilterClick}
                      sx={{ 
                        ml: 1,
                        color: (turmaAEFilter || turmaAESort === 'desc') ? 'primary.main' : 'inherit'
                      }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                    {turmaAEFilter && (
                      <IconButton 
                        size="small" 
                        onClick={clearTurmaAEFilter}
                        sx={{ ml: 0.5 }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell>Observações</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rowsPerPage > 0
                ? filteredLeads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                : filteredLeads
              ).map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>{lead.nome}</TableCell>
                  <TableCell>
                    <FormControl size="small">
                      <Select
                        value={lead.status}
                        onChange={(e) => handleStatusUpdate(lead.id, e.target.value)}
                        size="small"
                        sx={{ minWidth: 120 }}
                        renderValue={(value) => (
                          <Chip
                            label={value}
                            color={
                              value === 'Matrícula' ? 'success' :
                              value === 'Inativo' ? 'error' :
                              value === 'AE Agend' ? 'warning' :
                              value === 'AE Feita' ? 'info' :
                              value === 'Barra' ? 'secondary' :
                              'default'
                            }
                            size="small"
                          />
                        )}
                      >
                        {statusOptions.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {lead.whatsapp}
                      <IconButton
                        size="small"
                        onClick={() => handleWhatsAppClick(lead.whatsapp)}
                        color="success"
                      >
                        <WhatsAppIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {editingCell === lead.id ? (
                      <TextField
                        type="date"
                        fullWidth
                        variant="standard"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, lead.id, 'ultimoContato')}
                        onBlur={() => handleSaveEdit(lead.id, 'ultimoContato')}
                        autoFocus
                        size="small"
                        InputProps={{
                          style: { fontSize: '0.875rem' }
                        }}
                      />
                    ) : (
                      <Box
                        onClick={() => handleStartEditing(lead.id, lead.ultimoContato)}
                        style={{ cursor: 'pointer', minHeight: '20px' }}
                      >
                        {lead.ultimoContato ? formatDateForDisplay(lead.ultimoContato) : ''}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCell === `${lead.id}-prox` ? (
                      <TextField
                        type="date"
                        fullWidth
                        variant="standard"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, lead.id, 'proximoContato')}
                        onBlur={() => handleSaveEdit(lead.id, 'proximoContato')}
                        autoFocus
                        size="small"
                        InputProps={{
                          style: { fontSize: '0.875rem' }
                        }}
                      />
                    ) : (
                      <Box
                        onClick={() => {
                          setEditingCell(`${lead.id}-prox`);
                          setEditValue(formatDateForInput(lead.proximoContato));
                        }}
                        style={{ cursor: 'pointer', minHeight: '20px' }}
                      >
                        {lead.proximoContato ? formatDateForDisplay(lead.proximoContato) : '-'}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCell === `${lead.id}-ae` ? (
                      <TextField
                        type="date"
                        fullWidth
                        variant="standard"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, lead.id, 'dataAE')}
                        onBlur={() => handleSaveEdit(lead.id, 'dataAE')}
                        autoFocus
                        size="small"
                        InputProps={{
                          style: { fontSize: '0.875rem' }
                        }}
                      />
                    ) : (
                      <Box
                        onClick={() => {
                          setEditingCell(`${lead.id}-ae`);
                          setEditValue(formatDateForInput(lead.dataAE));
                        }}
                        style={{ cursor: 'pointer', minHeight: '20px' }}
                      >
                        {lead.dataAE ? formatDateForDisplay(lead.dataAE) : '-'}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small">
                      <Select
                        value={lead.turmaAE || ''}
                        onChange={(e) => handleTurmaUpdate(lead.id, e.target.value)}
                        size="small"
                        sx={{ minWidth: 120 }}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Sem turma</em>
                        </MenuItem>
                        {turmaOptions.map((turma) => (
                          <MenuItem key={turma} value={turma}>
                            {turma}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>{lead.observacoes || '-'}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(lead)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(lead.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[50]}
            component="div"
            count={filteredLeads.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            labelRowsPerPage="Leads por página"
          />
        </TableContainer>

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingLead ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="WhatsApp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                required
              />

              <TextField
                fullWidth
                label="Último Contato"
                type="date"
                value={formData.ultimoContato}
                onChange={(e) => setFormData({ ...formData, ultimoContato: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Próximo Contato"
                type="date"
                value={formData.proximoContato}
                onChange={(e) => setFormData({ ...formData, proximoContato: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Data da Aula Experimental"
                type="date"
                value={formData.dataAE}
                onChange={(e) => setFormData({ ...formData, dataAE: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth>
                <InputLabel>Turma da Aula Experimental</InputLabel>
                <Select
                  value={formData.turmaAE}
                  onChange={(e) => setFormData({ ...formData, turmaAE: e.target.value })}
                  label="Turma da Aula Experimental"
                >
                  {turmaOptions.map((turma) => (
                    <MenuItem key={turma} value={turma}>
                      {turma}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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
              disabled={!formData.nome || !formData.whatsapp}
            >
              {editingLead ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Filter Popover */}
        <Popover
          open={Boolean(statusAnchorEl)}
          anchorEl={statusAnchorEl}
          onClose={handleStatusFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por status
            </Typography>
            <FormControl size="small">
              <Select
                value={statusFilter || ''}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                sx={{ minWidth: 200 }}
                displayEmpty
              >
                <MenuItem value="">Todos</MenuItem>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={statusSort}
                onChange={(e) => setStatusSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">A-Z</MenuItem>
                <MenuItem value="desc">Z-A</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

        {/* Próximo Contato Filter Popover */}
        <Popover
          open={Boolean(proxContatoAnchorEl)}
          anchorEl={proxContatoAnchorEl}
          onClose={handleProxContatoFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por próximo contato
            </Typography>
            <TextField
              type="date"
              size="small"
              value={proxContatoFilter || ''}
              onChange={(e) => handleProxContatoFilterChange(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={proxContatoSort}
                onChange={(e) => setProxContatoSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">Mais antigos primeiro</MenuItem>
                <MenuItem value="desc">Mais recentes primeiro</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

        {/* Data AE Filter Popover */}
        <Popover
          open={Boolean(dataAEAnchorEl)}
          anchorEl={dataAEAnchorEl}
          onClose={handleDataAEFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por data da aula experimental
            </Typography>
            <TextField
              type="date"
              size="small"
              value={dataAEFilter || ''}
              onChange={(e) => handleDataAEFilterChange(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={dataAESort}
                onChange={(e) => setDataAESort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">Mais antigos primeiro</MenuItem>
                <MenuItem value="desc">Mais recentes primeiro</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

        {/* Turma AE Filter Popover */}
        <Popover
          open={Boolean(turmaAEAnchorEl)}
          anchorEl={turmaAEAnchorEl}
          onClose={handleTurmaAEFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">
              Filtrar por turma
            </Typography>
            <FormControl size="small">
              <Select
                value={turmaAEFilter || ''}
                onChange={(e) => handleTurmaAEFilterChange(e.target.value)}
                sx={{ minWidth: 200 }}
                displayEmpty
              >
                <MenuItem value="">Todas</MenuItem>
                {turmaOptions.map((turma) => (
                  <MenuItem key={turma} value={turma}>
                    {turma}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2">
              Ordenação
            </Typography>
            <FormControl size="small">
              <Select
                value={turmaAESort}
                onChange={(e) => setTurmaAESort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="asc">A-Z</MenuItem>
                <MenuItem value="desc">Z-A</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Popover>

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