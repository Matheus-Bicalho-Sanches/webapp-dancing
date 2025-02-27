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
  TablePagination,
  FormGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Search as SearchIcon
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
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState(['AE Agend', 'AE Feita', 'Barra', 'Lead']);
  const [statusSort, setStatusSort] = useState('asc');
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);

  const [proxContatoFilter, setProxContatoFilter] = useState(null);
  const [proxContatoSort, setProxContatoSort] = useState('asc');
  const [proxContatoAnchorEl, setProxContatoAnchorEl] = useState(null);

  const [dataAEFilter, setDataAEFilter] = useState(null);
  const [dataAEAnchorEl, setDataAEAnchorEl] = useState(null);

  const [turmaAEFilter, setTurmaAEFilter] = useState(null);
  const [turmaAEAnchorEl, setTurmaAEAnchorEl] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    status: 'Lead',
    whatsapp: '',
    ultimoContato: '',
    proximoContato: '',
    dataAE: '',
    turmaAE: '',
    observacoes: '',
    origemLead: ''
  });

  // Status constants
  const statusOptions = ['Matrícula', 'Inativo', 'AE Agend', 'AE Feita', 'Barra', 'Lead'];
  const statusColorMap = {
    'Matrícula': '#4caf50', // green
    'Inativo': '#f44336',   // red
    'AE Agend': '#ff9800',  // orange
    'AE Feita': '#2196f3',  // blue
    'Barra': '#9c27b0',     // purple
    'Lead': '#757575'       // gray
  };

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

  // Add turma color mapping
  const turmaColorMap = {
    'D12N': '#1976d2', // blue
    'D13M': '#9c27b0', // purple
    'D13T': '#673ab7', // deep purple
    'D13N': '#3f51b5', // indigo
    'D14M': '#006064', // dark cyan
    'D14N': '#ff6f00', // amber
    'ADULTO': '#689f38', // light green
    'AI': '#bf360c', // deep orange/brown
    'REC10': '#d32f2f', // dark red
    'REC11': '#c2185b', // dark pink
  };

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
    // Toggle the status in the selected statuses array
    setSelectedStatuses(prevSelected => {
      if (prevSelected.includes(status)) {
        return prevSelected.filter(s => s !== status);
      } else {
        return [...prevSelected, status];
      }
    });
  };

  const clearStatusFilter = () => {
    setSelectedStatuses([]);
    setStatusFilter('');
    setStatusFilterOpen(false);
  };

  const [tempProxContatoFilter, setTempProxContatoFilter] = useState('');

  const handleProxContatoFilterClick = (event) => {
    setProxContatoAnchorEl(event.currentTarget);
    setTempProxContatoFilter(proxContatoFilter || '');
  };

  const handleProxContatoFilterClose = () => {
    setProxContatoAnchorEl(null);
    setTempProxContatoFilter('');
  };

  const handleProxContatoFilterChange = (date) => {
    setProxContatoFilter(date);
  };

  const applyProxContatoFilter = () => {
    handleProxContatoFilterChange(tempProxContatoFilter);
    handleProxContatoFilterClose();
  };

  const clearProxContatoFilter = () => {
    setProxContatoFilter(null);
    handleProxContatoFilterClose();
  };

  const [tempDataAEFilter, setTempDataAEFilter] = useState('');

  // Atualizar o estado temporário quando o popover abrir
  const handleDataAEFilterClick = (event) => {
    setDataAEAnchorEl(event.currentTarget);
    setTempDataAEFilter(dataAEFilter || '');
  };

  const handleDataAEFilterClose = () => {
    setDataAEAnchorEl(null);
    setTempDataAEFilter('');
  };

  const handleDataAEFilterChange = (date) => {
    setDataAEFilter(date);
  };

  const clearDataAEFilter = () => {
    setDataAEFilter(null);
    handleDataAEFilterClose();
  };

  const applyDataAEFilter = () => {
    handleDataAEFilterChange(tempDataAEFilter);
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
    let result = [...leadsToFilter];

    // Apply search term filter
    if (searchTerm) {
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();
      result = result.filter(lead => 
        (lead.nome && lead.nome.toLowerCase().includes(normalizedSearchTerm)) || 
        (lead.whatsapp && lead.whatsapp.toLowerCase().includes(normalizedSearchTerm))
      );
    }

    // Filter by status (if any selected)
    if (selectedStatuses.length > 0) {
      result = result.filter(lead => selectedStatuses.includes(lead.status));
    } else if (statusFilter) {
      result = result.filter(lead => lead.status === statusFilter);
    }

    // Apply próximo contato filter
    if (proxContatoFilter) {
      const filterDate = dayjs(proxContatoFilter).startOf('day');
      result = result.filter(lead => {
        if (!lead.proximoContato) return false;
        const leadDate = dayjs(lead.proximoContato).startOf('day');
        return leadDate.isSame(filterDate);
      });
    }

    // Apply data AE filter
    if (dataAEFilter) {
      const filterDate = dayjs(dataAEFilter).startOf('day');
      result = result.filter(lead => {
        if (!lead.dataAE) return false;
        const leadDate = dayjs(lead.dataAE).startOf('day');
        return leadDate.isSame(filterDate);
      });
    }

    // Apply turma AE filter
    if (turmaAEFilter) {
      result = result.filter(lead => lead.turmaAE === turmaAEFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      // Primeiro, tentamos ordenar por próximo contato se essa ordenação estiver ativa
      if (proxContatoSort) {
        if (!a.proximoContato && !b.proximoContato) {
          // Se ambos não têm próximo contato, usamos o status como critério
      if (statusSort && a.status !== b.status) {
        const aStatus = a.status || '';
        const bStatus = b.status || '';
        return statusSort === 'asc' 
          ? aStatus.localeCompare(bStatus)
          : bStatus.localeCompare(aStatus);
          }
          return 0;
      }

        if (!a.proximoContato) return 1;
        if (!b.proximoContato) return -1;

        const dateA = new Date(a.proximoContato);
        const dateB = new Date(b.proximoContato);

        return proxContatoSort === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      } 
      // Se não há ordenação por próximo contato, mas há por status
      else if (statusSort) {
        if (a.status !== b.status) {
          const aStatus = a.status || '';
          const bStatus = b.status || '';
          return statusSort === 'asc'
            ? aStatus.localeCompare(bStatus)
            : bStatus.localeCompare(aStatus);
        }
      }

      return 0;
    });

    return result;
  };

  // Update filtered leads when filters or leads change
  useEffect(() => {
    const filtered = filterLeads(leads);
    setFilteredLeads(filtered);
  }, [leads, statusFilter, selectedStatuses, proxContatoFilter, dataAEFilter, turmaAEFilter,
      statusSort, proxContatoSort, searchTerm]);

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
        observacoes: lead.observacoes || '',
        origemLead: lead.origemLead || ''
      });
    } else {
      // Obter a data de hoje no formato YYYY-MM-DD para o campo ultimoContato
      const today = new Date();
      const formattedToday = format(today, 'yyyy-MM-dd');
      
      setEditingLead(null);
      setFormData({
        nome: '',
        status: 'Lead',
        whatsapp: '',
        ultimoContato: formattedToday, // Preenche com a data de hoje
        proximoContato: '',
        dataAE: '',
        turmaAE: '',
        observacoes: '',
        origemLead: ''
      });
    }
    // Limpa qualquer erro ao abrir o diálogo
    setFormError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLead(null);
    // Limpa qualquer erro ao fechar o diálogo
    setFormError('');
  };

  const handleSubmit = async () => {
    try {
      // Limpa qualquer erro anterior
      setFormError('');

      // Validar se WhatsApp está preenchido
      if (!formData.whatsapp.trim()) {
        setFormError('O campo WhatsApp é obrigatório.');
        return;
      }

      // Normaliza o número de WhatsApp (remove espaços, traços, etc)
      const normalizedWhatsApp = formData.whatsapp.trim().replace(/\D/g, '');
      
      // Verifica se tem o formato adequado para um número de WhatsApp brasileiro
      if (normalizedWhatsApp.length < 10 || normalizedWhatsApp.length > 13) {
        setFormError('O número de WhatsApp parece inválido. Verifique o formato.');
        return;
      }
      
      // Se estiver criando um novo lead (não editando), verifica se o WhatsApp já existe
      if (!editingLead) {
        // Verifica se o WhatsApp já existe em algum lead
        const whatsAppExists = leads.some(lead => {
          if (!lead.whatsapp) return false;
          const leadWhatsApp = lead.whatsapp.replace(/\D/g, '');
          return leadWhatsApp === normalizedWhatsApp;
        });
        
        if (whatsAppExists) {
          setFormError('Este número de WhatsApp já está cadastrado.');
          return;
        }
      } else if (editingLead.whatsapp) {
        // Se estiver editando e o WhatsApp atual for diferente do original
        const originalWhatsApp = editingLead.whatsapp.replace(/\D/g, '');
        
        if (normalizedWhatsApp !== originalWhatsApp) {
          // Verifica se o novo número já existe em outro lead
          const whatsAppExists = leads.some(lead => {
            if (lead.id === editingLead.id || !lead.whatsapp) return false;
            const leadWhatsApp = lead.whatsapp.replace(/\D/g, '');
            return leadWhatsApp === normalizedWhatsApp;
          });
          
          if (whatsAppExists) {
            setFormError('Este número de WhatsApp já está cadastrado.');
            return;
          }
        }
      }

      // Formatação do WhatsApp para exibição
      let formattedWhatsApp = normalizedWhatsApp;
      // Se for um número brasileiro
      if (normalizedWhatsApp.startsWith('55') && normalizedWhatsApp.length >= 12) {
        // Formato: (XX) XXXXX-XXXX
        formattedWhatsApp = normalizedWhatsApp.replace(
          /^55(\d{2})(\d{5})(\d{4})$/,
          '($1) $2-$3'
        );
      }

      // Preparar os dados do lead, convertendo as datas para o formato correto
      const leadData = {
        ...formData,
        whatsapp: formattedWhatsApp, // Salva o WhatsApp formatado para exibição
        ultimoContato: formData.ultimoContato ? formatDateForSave(formData.ultimoContato) : '',
        proximoContato: formData.proximoContato ? formatDateForSave(formData.proximoContato) : '',
        dataAE: formData.dataAE ? formatDateForSave(formData.dataAE) : '',
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
      
      // Tratamento diferenciado conforme o tipo de campo
      let valueToSave;
      if (['ultimoContato', 'proximoContato', 'dataAE'].includes(field)) {
        // Formata como data apenas os campos que são datas
        valueToSave = formatDateForSave(editValue);
      } else {
        // Para campos de texto, usa o valor como está
        valueToSave = editValue;
      }
      
      await updateDoc(leadRef, {
        [field]: valueToSave,
        updatedAt: serverTimestamp(),
      });

      setSnackbar({
        open: true,
        message: field === 'ultimoContato' 
          ? 'Último contato atualizado com sucesso!'
          : field === 'proximoContato'
          ? 'Próximo contato atualizado com sucesso!'
          : field === 'dataAE'
          ? 'Data da aula experimental atualizada com sucesso!'
          : field === 'observacoes'
          ? 'Observações atualizadas com sucesso!'
          : field === 'origemLead'
          ? 'Origem do lead atualizada com sucesso!'
          : 'Campo atualizado com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating field:', error);
      setSnackbar({
        open: true,
        message: field === 'ultimoContato'
          ? 'Erro ao atualizar último contato'
          : field === 'proximoContato'
          ? 'Erro ao atualizar próximo contato'
          : field === 'dataAE'
          ? 'Erro ao atualizar data da aula experimental'
          : field === 'observacoes'
          ? 'Erro ao atualizar observações'
          : field === 'origemLead'
          ? 'Erro ao atualizar origem do lead'
          : 'Erro ao atualizar campo',
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="CRM">
      <Box sx={{ 
        overflow: 'hidden',
        maxWidth: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, px: 0.25 }}>
          <Typography variant="h5" sx={{ color: '#000', fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
            Gestão de Leads
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="small"
            sx={{ height: '28px', fontSize: '0.8rem' }}
          >
            Novo Lead
          </Button>
        </Box>
        
        {/* Campo de pesquisa */}
        <Box sx={{ mb: 1, px: 0.25 }}>
          <TextField
            placeholder="Pesquisar por nome ou WhatsApp..."
            variant="outlined"
            fullWidth
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={() => setSearchTerm('')}
                    sx={{ p: 0.5 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: 1, height: '36px' }
            }}
          />
        </Box>

        <Paper sx={{ width: "100%", mb: 2, borderRadius: 2 }}>
          <TableContainer
            sx={{
              maxWidth: "calc(100vw - 32px)",
              overflowX: "auto",
              "&::-webkit-scrollbar": {
                height: "10px",
                width: "10px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#bdbdbd",
                borderRadius: "5px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "#f5f5f5",
              },
              maxHeight: "450px",  // Set fixed height for container
              overflowY: "auto",   // Enable vertical scrolling
            }}
          >
            <Table size="small" stickyHeader sx={{ 
              tableLayout: 'fixed', 
              width: '100%', 
              borderSpacing: 0
            }}>
              <TableHead>
                <TableRow sx={{ height: '40px' }}>
                  <TableCell width="16%" sx={{ minWidth: 110, maxWidth: 130, py: 1, px: 0.5 }}>Nome</TableCell>
                  <TableCell width="8%" sx={{ minWidth: 70, maxWidth: 80, py: 1, px: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Status
                      <Box sx={{ display: 'flex', ml: 'auto' }}>
                        <FilterListIcon 
                          fontSize="small" 
                          onClick={handleStatusFilterClick}
                          sx={{ 
                            cursor: 'pointer',
                            color: selectedStatuses.length > 0 ? 'primary.main' : 'inherit'
                          }}
                        />
                        {selectedStatuses.length > 0 && (
                          <Box
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'white',
                              borderRadius: '50%',
                              width: 16,
                              height: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              ml: -0.8,
                              mt: -0.8,
                            }}
                          >
                            {selectedStatuses.length}
                          </Box>
                        )}
                      </Box>
                      <Popover
                        open={Boolean(statusAnchorEl)}
                        anchorEl={statusAnchorEl}
                        onClose={handleStatusFilterClose}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'left',
                        }}
                      >
                        <Box sx={{ p: 2, width: 200 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                            Filtrar por status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
                          </Typography>
                          <FormControl component="fieldset">
                            <FormGroup>
                              {statusOptions.map((status) => (
                                <FormControlLabel
                                  key={status}
                                  control={
                                    <Checkbox 
                                      checked={selectedStatuses.includes(status)} 
                                      onChange={() => handleStatusFilterChange(status)}
                                      sx={{
                                        color: statusColorMap[status] || 'default',
                                        '&.Mui-checked': {
                                          color: statusColorMap[status] || 'primary.main',
                                        },
                                      }}
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Box
                                        sx={{
                                          width: 12,
                                          height: 12,
                                          borderRadius: '50%',
                                          mr: 1,
                                          bgcolor: statusColorMap[status] || '#757575',
                                        }}
                                      />
                                      {status}
                                    </Box>
                                  }
                                />
                              ))}
                            </FormGroup>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                onClick={clearStatusFilter}
                                sx={{ mr: 1, fontSize: '0.75rem', py: 0.5 }}
                              >
                                Limpar
                              </Button>
                              <Button 
                                variant="contained" 
                                size="small" 
                                onClick={handleStatusFilterClose}
                                sx={{ fontSize: '0.75rem', py: 0.5 }}
                              >
                                Aplicar
                              </Button>
                            </Box>
                          </FormControl>
                        </Box>
                      </Popover>
                    </Box>
                  </TableCell>
                  <TableCell width="10%" sx={{ minWidth: 80, maxWidth: 90, py: 1, px: 0.5 }}>WhatsApp</TableCell>
                  <TableCell width="7%" sx={{ minWidth: 60, maxWidth: 70, py: 1, px: 0.5 }}>Últ.</TableCell>
                  <TableCell width="7%" sx={{ minWidth: 60, maxWidth: 70, py: 1, px: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Próx.
                      <IconButton 
                        size="small" 
                        onClick={handleProxContatoFilterClick}
                        sx={{ 
                          p: 0.3,
                          color: (proxContatoFilter || proxContatoSort === 'desc') ? 'primary.main' : 'inherit'
                        }}
                      >
                        <FilterListIcon sx={{ fontSize: '0.8rem' }} />
                      </IconButton>
                      {proxContatoFilter && (
                        <IconButton 
                          size="small" 
                          onClick={clearProxContatoFilter}
                          sx={{ p: 0.3 }}
                        >
                          <ClearIcon sx={{ fontSize: '0.8rem' }} />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell width="7%" sx={{ minWidth: 60, maxWidth: 70, py: 1, px: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Data
                      <IconButton 
                        size="small" 
                        onClick={handleDataAEFilterClick}
                        sx={{ 
                          p: 0.3,
                          color: dataAEFilter ? 'primary.main' : 'inherit'
                        }}
                      >
                        <FilterListIcon sx={{ fontSize: '0.8rem' }} />
                      </IconButton>
                      {dataAEFilter && (
                        <IconButton 
                          size="small" 
                          onClick={clearDataAEFilter}
                          sx={{ p: 0.3 }}
                        >
                          <ClearIcon sx={{ fontSize: '0.8rem' }} />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell width="8%" sx={{ minWidth: 70, maxWidth: 80, py: 1, px: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Turma
                      <IconButton 
                        size="small" 
                        onClick={handleTurmaAEFilterClick}
                        sx={{ 
                          p: 0.3,
                          color: turmaAEFilter ? 'primary.main' : 'inherit'
                        }}
                      >
                        <FilterListIcon sx={{ fontSize: '0.8rem' }} />
                      </IconButton>
                      {turmaAEFilter && (
                        <IconButton 
                          size="small" 
                          onClick={clearTurmaAEFilter}
                          sx={{ p: 0.3 }}
                        >
                          <ClearIcon sx={{ fontSize: '0.8rem' }} />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell width="17%" sx={{ minWidth: 100, maxWidth: 120, py: 1, px: 0.5 }}>Obs.</TableCell>
                  <TableCell width="12%" sx={{ minWidth: 70, maxWidth: 80, py: 1, px: 0.5 }}>Origem</TableCell>
                  <TableCell width="5%" sx={{ minWidth: 60, maxWidth: 70, py: 1, px: 0.5 }} align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ '& tr': { height: '36px !important' } }}>
                {(rowsPerPage > 0
                  ? filteredLeads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  : filteredLeads
                ).map((lead) => (
                  <TableRow key={lead.id} sx={{ 
                    height: '36px !important', 
                    maxHeight: '36px !important', 
                    minHeight: '36px !important', 
                    '& .MuiTableCell-root': { 
                      height: '36px !important',
                      py: 0.5, 
                      px: 0.5 
                    } 
                  }}>
                    <TableCell sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
                      {lead.nome}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 80, p: 0.25, height: '36px' }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={lead.status}
                          onChange={(e) => handleStatusUpdate(lead.id, e.target.value)}
                          size="small"
                          sx={{ 
                            minWidth: 60, 
                            fontSize: '0.8rem', 
                            height: '28px',
                            '& .MuiSelect-select': { 
                              padding: '4px 6px',
                              paddingRight: '24px' 
                            }
                          }}
                          renderValue={(value) => (
                            <Chip
                              label={value}
                              size="small"
                              sx={{
                                height: 20,
                                bgcolor: statusColorMap[value] || '#757575',
                                color: 'white',
                                fontSize: '0.7rem',
                                fontWeight: 'medium',
                                '& .MuiChip-label': { px: 0.8 }
                              }}
                            />
                          )}
                          MenuProps={{
                            PaperProps: {
                              style: {
                                maxHeight: 200
                              }
                            }
                          }}
                        >
                          {statusOptions.map((option) => (
                            <MenuItem 
                              key={option} 
                              value={option}
                              sx={{ 
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: statusColorMap[option] || '#757575',
                                  mr: 1
                                }}
                              />
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
                      {lead.whatsapp}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
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
                    <TableCell sx={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
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
                    <TableCell sx={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
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
                    <TableCell sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={lead.turmaAE || ''}
                          onChange={(e) => handleTurmaUpdate(lead.id, e.target.value)}
                          size="small"
                          displayEmpty
                          sx={{ 
                            fontSize: '0.8rem', 
                            height: '2rem',
                            '& .MuiSelect-select': { 
                              padding: '4px 6px',
                              paddingRight: '24px' 
                            }
                          }}
                          renderValue={(value) => (
                            value ? (
                              <Chip
                                label={value}
                                color="default"
                                size="small"
                                sx={{ 
                                  height: '20px',
                                  bgcolor: turmaColorMap[value] || '#757575',
                                  color: 'white',
                                  '& .MuiChip-label': { 
                                    px: 0.8, 
                                    fontSize: '0.75rem',
                                    fontWeight: 500
                                  } 
                                }}
                              />
                            ) : (
                              <em style={{ fontSize: '0.75rem', opacity: 0.7 }}>Sem turma</em>
                            )
                          )}
                          MenuProps={{
                            PaperProps: {
                              style: {
                                maxHeight: 200
                              }
                            }
                          }}
                        >
                          <MenuItem value="">
                            <em>Sem turma</em>
                          </MenuItem>
                          {turmaOptions.map((turma) => (
                            <MenuItem 
                              key={turma} 
                              value={turma}
                              sx={{ 
                                fontSize: '0.8rem',
                                minHeight: '30px', 
                                py: 0.5 
                              }}
                            >
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <Box 
                                  sx={{ 
                                    width: 14, 
                                    height: 14, 
                                    borderRadius: '50%', 
                                    bgcolor: turmaColorMap[turma] || '#757575' 
                                  }} 
                                />
                                {turma}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
                      {editingCell === `${lead.id}-obs` ? (
                        <TextField
                          fullWidth
                          variant="standard"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, lead.id, 'observacoes')}
                          onBlur={() => handleSaveEdit(lead.id, 'observacoes')}
                          autoFocus
                          size="small"
                          InputProps={{
                            style: { fontSize: '0.875rem' }
                          }}
                        />
                      ) : (
                        <Box
                          onClick={() => {
                            setEditingCell(`${lead.id}-obs`);
                            setEditValue(lead.observacoes || '');
                          }}
                          style={{ cursor: 'pointer', minHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {lead.observacoes || '-'}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
                      {editingCell === `${lead.id}-origem` ? (
                        <TextField
                          fullWidth
                          variant="standard"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, lead.id, 'origemLead')}
                          onBlur={() => handleSaveEdit(lead.id, 'origemLead')}
                          autoFocus
                          size="small"
                          InputProps={{
                            style: { fontSize: '0.875rem' }
                          }}
                        />
                      ) : (
                        <Box
                          onClick={() => {
                            setEditingCell(`${lead.id}-origem`);
                            setEditValue(lead.origemLead || '');
                          }}
                          style={{ cursor: 'pointer', minHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {lead.origemLead || '-'}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ maxWidth: 70, p: 0.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenDialog(lead)}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(lead.id)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[50]}
            component="div"
            count={filteredLeads.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            labelRowsPerPage="Por página"
            sx={{ 
              '& .MuiTablePagination-toolbar': { minHeight: '36px', p: 0.5 },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.75rem'
              },
              borderTop: '1px solid rgba(224, 224, 224, 1)',
              marginTop: 'auto',
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'white',
              zIndex: 1
            }}
          />
        </Paper>

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
              {formError && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {formError}
                </Alert>
              )}
              
              <TextField
                fullWidth
                label="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />

              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  {statusOptions.map((status) => (
                    <MenuItem 
                      key={status} 
                      value={status}
                      sx={{ 
                        fontSize: '0.7rem',
                        py: 0.25,
                        px: 0.5,
                        minHeight: '24px'
                      }}
                    >
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="WhatsApp"
                value={formData.whatsapp}
                onChange={(e) => {
                  setFormData({ ...formData, whatsapp: e.target.value });
                  // Limpa o erro quando o usuário modifica o campo
                  if (formError && formError.includes('WhatsApp')) {
                    setFormError('');
                  }
                }}
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
                  renderValue={(value) => (
                    value ? (
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            width: 14, 
                            height: 14, 
                            borderRadius: '50%', 
                            bgcolor: turmaColorMap[value] || '#757575' 
                          }} 
                        />
                        {value}
                      </Box>
                    ) : 'Sem turma'
                  )}
                >
                  {turmaOptions.map((turma) => (
                    <MenuItem key={turma} value={turma}>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            width: 14, 
                            height: 14, 
                            borderRadius: '50%', 
                            bgcolor: turmaColorMap[turma] || '#757575' 
                          }} 
                        />
                        {turma}
                      </Box>
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

              <TextField
                fullWidth
                label="Origem Lead"
                value={formData.origemLead}
                onChange={(e) => setFormData({ ...formData, origemLead: e.target.value })}
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
              disabled={!formData.whatsapp}
            >
              {editingLead ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

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
              value={tempProxContatoFilter || ''}
              onChange={(e) => setTempProxContatoFilter(e.target.value)}
              sx={{ minWidth: 200 }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: '2100-12-31' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 1 }}>
              <Button 
                size="small" 
                onClick={clearProxContatoFilter}
                disabled={!proxContatoFilter}
              >
                Limpar Filtro
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={handleProxContatoFilterClose}>
                  Cancelar
                </Button>
                <Button size="small" variant="contained" onClick={applyProxContatoFilter}>
                  Aplicar
                </Button>
              </Box>
            </Box>
            
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
              value={tempDataAEFilter || ''}
              onChange={(e) => setTempDataAEFilter(e.target.value)}
              sx={{ minWidth: 200 }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: '2100-12-31' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 1 }}>
              <Button 
                size="small" 
                onClick={clearDataAEFilter}
                disabled={!dataAEFilter}
              >
                Limpar Filtro
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={handleDataAEFilterClose}>
                  Cancelar
                </Button>
                <Button size="small" variant="contained" onClick={applyDataAEFilter}>
                  Aplicar
                </Button>
              </Box>
            </Box>
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
                renderValue={(value) => (
                  value ? (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: turmaColorMap[value] || '#757575' 
                        }} 
                      />
                      {value}
                    </Box>
                  ) : 'Todas as turmas'
                )}
              >
                <MenuItem value="">
                  <em>Todas</em>
                </MenuItem>
                {turmaOptions.map((turma) => (
                  <MenuItem key={turma} value={turma}>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: turmaColorMap[turma] || '#757575' 
                        }} 
                      />
                      {turma}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Popover>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
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