import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, getDocsFromCache, getDocsFromServer, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';
import { where, limit } from 'firebase/firestore';

// Custom DateInput component that accepts dd-mm-yy format
function CustomDateInput({ label, value, onChange, required, autoFocus, InputProps, ...props }) {
  const [displayValue, setDisplayValue] = useState('');
  
  // Convert yyyy-MM-dd to dd-mm-yy when component mounts or value changes
  useEffect(() => {
    if (value) {
      try {
        const dateParts = value.split('-');
        if (dateParts.length === 3) {
          const year = dateParts[0];
          const month = dateParts[1];
          const day = dateParts[2];
          
          // Use last 2 digits of year
          const shortYear = year.slice(2);
          setDisplayValue(`${day}-${month}-${shortYear}`);
        } else {
          setDisplayValue(value);
        }
      } catch (e) {
        console.error('Error formatting date for display:', e);
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);
  
  const handleChange = (e) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Try to parse the dd-mm-yy input to yyyy-MM-dd format
    if (inputValue) {
      try {
        const regex = /^(\d{1,2})-(\d{1,2})-(\d{1,2})$/;
        const match = inputValue.match(regex);
        
        if (match) {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          let year = match[3];
          
          // Convert 2-digit year to 4-digit (20xx)
          if (year.length === 2) {
            year = '20' + year;
          }
          
          // Call original onChange with yyyy-MM-dd format
          onChange({ target: { value: `${year}-${month}-${day}` } });
        } else {
          // Pass the raw value if it doesn't match the expected format
          onChange({ target: { value: inputValue } });
        }
      } catch (e) {
        console.error('Error parsing date input:', e);
        onChange({ target: { value: inputValue } });
      }
    } else {
      // Handle empty input
      onChange({ target: { value: '' } });
    }
  };
  
  return (
    <TextField
      label={label}
      value={displayValue}
      onChange={handleChange}
      placeholder="dd-mm-yy"
      required={required}
      autoFocus={autoFocus}
      InputProps={{
        ...InputProps,
      }}
      InputLabelProps={{ shrink: true }}
      {...props}
    />
  );
}

// Custom inline date editor component for the table cells
function CustomDateInlineEditor({ value, onChange, onBlur, onKeyDown, ...props }) {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState(false);
  const [helperText, setHelperText] = useState('');
  
  // Initialize with the input value in dd-mm-yy format
  useEffect(() => {
    if (value) {
      try {
        const dateParts = value.split('-');
        if (dateParts.length === 3) {
          const year = dateParts[0];
          const month = dateParts[1];
          const day = dateParts[2];
          
          // Use last 2 digits of year
          const shortYear = year.slice(2);
          setDisplayValue(`${day}-${month}-${shortYear}`);
          setError(false);
          setHelperText('');
        } else {
          setDisplayValue(value);
          setError(false);
          setHelperText('');
        }
      } catch (e) {
        console.error('Error formatting date for inline editor:', e);
        setDisplayValue(value);
        setError(false);
        setHelperText('');
      }
    } else {
      setDisplayValue('');
      setError(false);
      setHelperText('');
    }
  }, [value]);
  
  const validateDateFormat = (input) => {
    if (!input) return true; // Empty is ok
    
    const regex = /^(\d{1,2})-(\d{1,2})-(\d{1,2})$/;
    const match = input.match(regex);
    
    if (!match) {
      setError(true);
      setHelperText('Formato inválido. Use dd-mm-yy');
      return false;
    }
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10) < 100 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10);
    
    // Validar valores
    if (month < 1 || month > 12) {
      setError(true);
      setHelperText('Mês inválido (1-12)');
      return false;
    }
    
    if (day < 1 || day > 31) {
      setError(true);
      setHelperText('Dia inválido (1-31)');
      return false;
    }
    
    // Verificar se a data existe no calendário
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      setError(true);
      setHelperText('Data inexistente no calendário');
      return false;
    }
    
    setError(false);
    setHelperText('');
    return true;
  };
  
  const handleChange = (e) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Parse the input to the expected format
    if (inputValue) {
      try {
        const regex = /^(\d{1,2})-(\d{1,2})-(\d{1,2})$/;
        const match = inputValue.match(regex);
        
        if (match) {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          let year = match[3];
          
          // Convert 2-digit year to 4-digit (20xx)
          if (year.length === 2) {
            year = '20' + year;
          }
          
          // Validar o formato
          validateDateFormat(inputValue);
          
          // Call original onChange with yyyy-MM-dd format
          onChange({ target: { value: `${year}-${month}-${day}` } });
        } else {
          // Validar formato e mostrar erro se não estiver no padrão esperado
          if (inputValue.length > 0) {
            validateDateFormat(inputValue);
          }
          
          // Pass the raw value if it doesn't match the expected format
          onChange({ target: { value: inputValue } });
        }
      } catch (e) {
        console.error('Error parsing date for inline editor:', e);
        setError(true);
        setHelperText('Erro ao processar a data');
        onChange({ target: { value: inputValue } });
      }
    } else {
      // Handle empty input
      setError(false);
      setHelperText('');
      onChange({ target: { value: '' } });
    }
  };
  
  // Custom onBlur handler to validate the date format when user leaves the field
  const handleBlur = (e) => {
    // Validate on blur
    validateDateFormat(displayValue);
    
    // Call the original onBlur if provided
    if (onBlur) {
      onBlur(e);
    }
  };
  
  return (
    <TextField
      fullWidth
      variant="standard"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onBlur={handleBlur}
      autoFocus
      placeholder="dd-mm-yy"
      size="small"
      error={error}
      helperText={helperText}
      InputProps={{
        style: { fontSize: '0.875rem' }
      }}
      {...props}
    />
  );
}

// Custom calendar date editor component for specific table cells
function CalendarDateInlineEditor({ value, onChange, onBlur, onKeyDown, ...props }) {
  const [dateValue, setDateValue] = useState(null);
  
  // Initialize date value when component mounts
  useEffect(() => {
    if (value) {
      try {
        // Try to parse the value to a date
        const date = dayjs(value);
        if (date.isValid()) {
          setDateValue(date);
        } else {
          setDateValue(null);
        }
      } catch (e) {
        console.error('Error parsing date for calendar editor:', e);
        setDateValue(null);
      }
    } else {
      setDateValue(null);
    }
  }, [value]);
  
  // Handle date selection from DatePicker
  const handleDateChange = (newDate) => {
    if (newDate && newDate.isValid()) {
      // Update state
      setDateValue(newDate);
      
      // Formatar a data como dd-mm-yy para compatibilidade com o resto do sistema
      // Garante que o dia vem primeiro, depois o mês, depois o ano com 2 dígitos
      const day = newDate.format('DD'); // Dia com 2 dígitos (01-31)
      const month = newDate.format('MM'); // Mês com 2 dígitos (01-12)
      const yearShort = newDate.format('YY'); // Ano com 2 dígitos (00-99)
      
      const formattedForDisplay = `${day}-${month}-${yearShort}`;
      console.log('Calendar selected date formatted as dd-mm-yy:', formattedForDisplay);
      
      // Limpamos qualquer valor anterior
      setEditValue('');
      
      // Set no formato dd-mm-yy para compatibilidade com o resto do sistema
      onChange({ target: { value: formattedForDisplay } });
      
      // Para debug
      console.log('Valor enviado para onChange:', formattedForDisplay);
      
      // Salvar imediatamente após a seleção, sem esperar o onBlur
      if (onBlur) {
        // Usar um pequeno delay para garantir que o estado foi atualizado
        setTimeout(() => {
          console.log('Chamando onBlur com valor:', formattedForDisplay);
          onBlur();
        }, 100);
      }
    }
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        value={dateValue}
        onChange={handleDateChange}
        slotProps={{
          textField: {
            fullWidth: true,
            variant: "standard",
            size: "small",
            autoFocus: true,
            onKeyDown: onKeyDown,
            InputProps: {
              style: { fontSize: '0.875rem' }
            }
          },
          popper: {
            sx: {
              zIndex: 9999
            }
          }
        }}
        {...props}
      />
    </LocalizationProvider>
  );
}

// Custom date input with calendar component for forms
function CalendarDateInput({ label, value, onChange, required, autoFocus, InputProps, ...props }) {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState(false);
  const [helperText, setHelperText] = useState('');
  const [openCalendar, setOpenCalendar] = useState(false);
  
  // Convert yyyy-MM-dd to dd-mm-yy when component mounts or value changes
  useEffect(() => {
    if (value) {
      try {
        const dateParts = value.split('-');
        if (dateParts.length === 3) {
          const year = dateParts[0];
          const month = dateParts[1];
          const day = dateParts[2];
          
          // Use last 2 digits of year
          const shortYear = year.slice(2);
          setDisplayValue(`${day}-${month}-${shortYear}`);
          setError(false);
          setHelperText('');
        } else {
          setDisplayValue(value);
          setError(false);
          setHelperText('');
        }
      } catch (e) {
        console.error('Error formatting date for display:', e);
        setDisplayValue(value);
        setError(false);
        setHelperText('');
      }
    } else {
      setDisplayValue('');
      setError(false);
      setHelperText('');
    }
  }, [value]);
  
  const validateDateFormat = (input) => {
    if (!input) return true; // Empty is ok
    
    const regex = /^(\d{1,2})-(\d{1,2})-(\d{1,2})$/;
    const match = input.match(regex);
    
    if (!match) {
      setError(true);
      setHelperText('Formato inválido. Use dd-mm-yy');
      return false;
    }
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10) < 100 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10);
    
    // Validar valores
    if (month < 1 || month > 12) {
      setError(true);
      setHelperText('Mês inválido (1-12)');
      return false;
    }
    
    if (day < 1 || day > 31) {
      setError(true);
      setHelperText('Dia inválido (1-31)');
      return false;
    }
    
    // Verificar se a data existe no calendário
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      setError(true);
      setHelperText('Data inexistente no calendário');
      return false;
    }
    
    setError(false);
    setHelperText('');
    return true;
  };
  
  const handleChange = (e) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Try to parse the dd-mm-yy input to yyyy-MM-dd format
    if (inputValue) {
      try {
        const regex = /^(\d{1,2})-(\d{1,2})-(\d{1,2})$/;
        const match = inputValue.match(regex);
        
        if (match) {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          let year = match[3];
          
          // Convert 2-digit year to 4-digit (20xx)
          if (year.length === 2) {
            year = '20' + year;
          }
          
          // Validar o formato
          validateDateFormat(inputValue);
          
          // Call original onChange with yyyy-MM-dd format
          onChange({ target: { value: `${year}-${month}-${day}` } });
        } else {
          // Validate and show error if not matching expected pattern
          if (inputValue.length > 0) {
            validateDateFormat(inputValue);
          }
          
          // Pass the raw value if it doesn't match the expected format
          onChange({ target: { value: inputValue } });
        }
      } catch (e) {
        console.error('Error parsing date input:', e);
        setError(true);
        setHelperText('Erro ao processar a data');
        onChange({ target: { value: inputValue } });
      }
    } else {
      // Handle empty input
      setError(false);
      setHelperText('');
      onChange({ target: { value: '' } });
    }
  };
  
  // Handle date selection from the DatePicker
  const handleDatePickerChange = (date) => {
    if (date && date.isValid && date.isValid()) {
      // Formatar a data como dd-mm-yy para compatibilidade com o resto do sistema
      const day = date.format('DD');
      const month = date.format('MM');
      const yearShort = date.format('YY'); // Apenas os dois últimos dígitos do ano
      
      const formattedDate = `${day}-${month}-${yearShort}`;
      console.log('CalendarDateInput - Data selecionada como dd-mm-yy:', formattedDate);
      
      setDisplayValue(formattedDate);
      onChange({ target: { value: formattedDate } });
      setError(false);
      setHelperText('');
      
      // Fechar o calendário após selecionar a data
      setOpenCalendar(false);
    } else if (date) {
      // Se for uma data, mas não estiver no formato do dayjs
      try {
        const dateObj = dayjs(date);
        if (dateObj.isValid()) {
          // Formatar a data como dd-mm-yy para compatibilidade
          const dayFmt = dateObj.format('DD');
          const monthFmt = dateObj.format('MM');
          const yearFmt = dateObj.format('YY'); // Apenas os dois últimos dígitos do ano
          
          const formattedDateAlt = `${dayFmt}-${monthFmt}-${yearFmt}`;
          console.log('CalendarDateInput - Data convertida como dd-mm-yy:', formattedDateAlt);
          
          setDisplayValue(formattedDateAlt);
          onChange({ target: { value: formattedDateAlt } });
          setError(false);
          setHelperText('');
        } else {
          console.error('Data inválida recebida pelo calendário:', date);
          setError(true);
          setHelperText('Data inválida');
        }
      } catch (e) {
        console.error('Erro ao processar data do calendário:', e);
        setError(true);
        setHelperText('Erro ao processar data');
      }
      
      // Fechar o calendário após selecionar a data
      setOpenCalendar(false);
    }
  };
  
  return (
    <Box>
      <TextField
        label={label}
        value={displayValue}
        onChange={handleChange}
        placeholder="dd-mm-yy"
        required={required}
        autoFocus={autoFocus}
        error={error}
        helperText={helperText}
        InputProps={{
          ...InputProps,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                onClick={() => setOpenCalendar(true)}
              >
                <CalendarIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }}
        InputLabelProps={{ shrink: true }}
        {...props}
      />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          open={openCalendar}
          onClose={() => setOpenCalendar(false)}
          onChange={handleDatePickerChange}
          value={value ? dayjs(value) : null}
          slotProps={{
            popper: {
              sx: {
                zIndex: 9999
              }
            }
          }}
        />
      </LocalizationProvider>
    </Box>
  );
}

// Adicionar uma constante para o número de linhas a serem exibidas por página
const ROWS_PER_PAGE = 50;

export default function CRM() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [formError, setFormError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE);
  
  // Estados relacionados aos logs
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(10);

  // Add date conversion helpers
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    // Add debugging to see what type of value we're receiving
    console.log('formatDateForInput received:', dateString, 'Type:', typeof dateString);
    
    if (typeof dateString === 'number') {
      // If it's a raw number (like a timestamp in milliseconds)
      console.log('Converting number to date:', dateString);
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return format(date, 'yyyy-MM-dd');
        } else {
          console.warn('Invalid date from number:', dateString);
          return '';
        }
      } catch (error) {
        console.error('Error converting number to date:', error);
        return '';
      }
    }
    
    try {
      let date;
      
      // Se for um timestamp do Firestore (objeto com seconds e nanoseconds)
      if (dateString && typeof dateString === 'object' && dateString.seconds !== undefined) {
        date = new Date(dateString.seconds * 1000);
        console.log('Converting Firestore timestamp to date:', date);
        
        // Verificar se o timestamp é válido - alguns timestamps antigos podem causar problemas
        if (date.getFullYear() < 1950 || date.getFullYear() > 2100) {
          console.warn('Data fora do intervalo válido:', date);
          // Usar data atual como fallback
          date = new Date();
        }
      }
      // Se for um timestamp ISO ou string de data
      else if (typeof dateString === 'string') {
        // Check if it's a numeric string that might be a timestamp
        if (/^\d+(\.\d+)?$/.test(dateString)) {
          console.log('Converting numeric string to date:', dateString);
          date = new Date(parseFloat(dateString));
        } else {
          console.log('Converting date string to date:', dateString);
          date = new Date(dateString);
        }
      }
      // Se for um Date object
      else if (dateString instanceof Date) {
        date = dateString;
        console.log('Already a Date object:', date);
      }
      // Se for um objeto com formato de data personalizado
      else if (dateString && typeof dateString === 'object') {
        if (dateString.toDate && typeof dateString.toDate === 'function') {
          date = dateString.toDate();
          console.log('Converting object with toDate() to date:', date);
          
          // Verificar se o timestamp é válido - alguns timestamps antigos podem causar problemas
          if (date.getFullYear() < 1950 || date.getFullYear() > 2100) {
            console.warn('Data fora do intervalo válido:', date);
            // Usar data atual como fallback
            date = new Date();
          }
        } else if (dateString.ISO) {
          date = new Date(dateString.ISO);
          console.log('Converting object with ISO to date:', date);
        } else {
          console.warn('Formato de data não reconhecido para input:', dateString);
          return '';
        }
      } else {
        console.warn('Formato de data não reconhecido para input:', dateString);
        return '';
      }
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida para input:', dateString);
        return '';
      }
      
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log('Formatted date for input:', formattedDate);
      return formattedDate;
    } catch (error) {
      console.error('Error formatting date for input:', error, 'Value:', dateString);
      return '';
    }
  };

  const formatDateForSave = (inputDate) => {
    if (!inputDate) return null;
    
    console.log('formatDateForSave recebeu:', inputDate);
    
    try {
      // Verificar se a entrada está no formato dd-mm-yy
      const ddMmYyRegex = /^(\d{1,2})-(\d{1,2})-(\d{1,2})$/;
      const ddMmYyMatch = inputDate.match(ddMmYyRegex);
      
      let year, month, day;
      
      if (ddMmYyMatch) {
        // Formato dd-mm-yy
        day = parseInt(ddMmYyMatch[1], 10);
        month = parseInt(ddMmYyMatch[2], 10);
        let shortYear = parseInt(ddMmYyMatch[3], 10);
        
        // Converter ano de 2 dígitos para 4 dígitos (assumindo anos 2000)
        year = shortYear < 100 ? 2000 + shortYear : shortYear;
        
        console.log(`Data no formato dd-mm-yy: dia=${day}, mês=${month}, ano=${year}`);
      } else {
        // Verificar se está no formato yyyy-MM-dd
        const yyyyMmDdRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        const yyyyMmDdMatch = inputDate.match(yyyyMmDdRegex);
        
        if (yyyyMmDdMatch) {
          // Formato yyyy-MM-dd
          year = parseInt(yyyyMmDdMatch[1], 10);
          month = parseInt(yyyyMmDdMatch[2], 10);
          day = parseInt(yyyyMmDdMatch[3], 10);
          
          console.log(`Data no formato yyyy-MM-dd: ano=${year}, mês=${month}, dia=${day}`);
          
          // Convertendo para formato dd-mm-yy para consistência
          const shortYear = year.toString().slice(2);
          inputDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${shortYear}`;
          console.log('Convertido para formato dd-mm-yy:', inputDate);
        } else {
          // Nenhum formato reconhecido, dividir por traço e tentar determinar
          const parts = inputDate.split('-').map(Number);
          
          if (parts.length === 3) {
            // Se o primeiro número for maior que 31, assume que é o ano
            if (parts[0] > 31) {
              year = parts[0];
              month = parts[1];
              day = parts[2];
              console.log('Formato detectado como ano-mês-dia:', year, month, day);
              
              // Convertendo para formato dd-mm-yy para consistência
              const shortYear = year.toString().slice(2);
              inputDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${shortYear}`;
              console.log('Convertido para formato dd-mm-yy:', inputDate);
            } 
            // Se o último número for maior que 31 ou menor que 1000, assume que é o ano
            else if (parts[2] > 31 || (parts[2] < 100 && parts[0] <= 31)) {
              day = parts[0];
              month = parts[1];
              year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
              console.log('Formato detectado como dia-mês-ano:', day, month, year);
              
              // Já está no formato dd-mm-yy, só padroniza
              inputDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year.toString().slice(-2)}`;
              console.log('Padronizado para formato dd-mm-yy:', inputDate);
            } else {
              // Último caso, assumir formato ISO (yyyy-MM-dd)
              year = parts[0];
              month = parts[1];
              day = parts[2];
              console.log('Formato assumido como padrão ISO:', year, month, day);
              
              // Convertendo para formato dd-mm-yy para consistência
              const shortYear = year.toString().slice(2);
              inputDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${shortYear}`;
              console.log('Convertido para formato dd-mm-yy:', inputDate);
            }
          } else {
            console.warn('Formato de data não reconhecido:', inputDate);
            return null;
          }
        }
      }
      
      // Depois de toda a tentativa de normalização, tenta extrair novamente os valores
      const finalMatch = inputDate.match(ddMmYyRegex);
      if (finalMatch) {
        day = parseInt(finalMatch[1], 10);
        month = parseInt(finalMatch[2], 10);
        let shortYear = parseInt(finalMatch[3], 10);
        year = shortYear < 100 ? 2000 + shortYear : shortYear;
      }
      
      // Verificar se os valores são válidos
      if (isNaN(year) || isNaN(month) || isNaN(day) || 
          month < 1 || month > 12 || day < 1 || day > 31) {
        console.warn('Data inválida para salvar:', inputDate);
        return null;
      }
      
      // Cria uma data às 12:00 para evitar problemas de timezone
      const date = new Date(year, month - 1, day, 12, 0, 0);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida para salvar após conversão:', inputDate);
        return null;
      }
      
      // Verificar se a data resultante é a mesma que foi solicitada
      // Isso detecta datas inexistentes como 31/02
      if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        console.warn(`Data inexistente no calendário: ${day}/${month}/${year} convertida para ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`);
        return null;
      }
      
      console.log('Data válida, criando timestamp com:', date);
      
      // Cria um Timestamp do Firestore
      return Timestamp.fromDate(date);
    } catch (error) {
      console.error('Error formatting date for save:', error, 'Value:', inputDate);
      return null;
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      let date;
      
      // Se for um timestamp do Firestore (objeto com seconds e nanoseconds)
      if (dateString && typeof dateString === 'object' && dateString.seconds !== undefined) {
        // Converter timestamp do Firestore para Date
        date = new Date(dateString.seconds * 1000);
      }
      // Se for um timestamp ISO ou string de data
      else if (typeof dateString === 'string') {
        date = new Date(dateString);
      }
      // Se for um Date object
      else if (dateString instanceof Date) {
        date = dateString;
      }
      // Se for um objeto com formato de data personalizado
      else if (dateString && typeof dateString === 'object') {
        // Tentar procurar por campos auxiliares
        if (dateString.toDate && typeof dateString.toDate === 'function') {
          // Se for um Timestamp do Firebase (diferente do Firestore)
          date = dateString.toDate();
        } else if (dateString.ISO) {
          // Se usamos o campo ISO do nosso script de importação
          date = new Date(dateString.ISO);
        } else if (dateString.formatted) {
          // Se já temos o valor formatado, retorna ele diretamente
          return dateString.formatted;
        } else {
          // Último recurso: converter para string e tentar extrair a data
          console.warn('Formato de data não reconhecido:', dateString);
          return '';
        }
      } else {
        console.warn('Formato de data não reconhecido:', dateString);
        return '';
      }
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateString);
        return '';
      }
      
      // Definir para meio-dia para evitar problemas de fuso horário
      date.setHours(12);
      return format(date, 'dd/MM/yy', { locale: ptBR });
    } catch (error) {
      console.error('Error formatting date for display:', error, 'Value:', dateString);
      return '';
    }
  };

  // Função auxiliar para converter qualquer formato de data para um objeto dayjs
  const convertToDateObject = (dateValue) => {
    if (!dateValue) return null;
    
    try {
      // Se for um timestamp do Firestore (objeto com seconds e nanoseconds)
      if (typeof dateValue === 'object' && dateValue.seconds !== undefined) {
        return dayjs(new Date(dateValue.seconds * 1000));
      }
      // Se for um objeto Timestamp do Firebase
      else if (dateValue && typeof dateValue.toDate === 'function') {
        return dayjs(dateValue.toDate());
      }
      // Se for uma string ISO
      else if (typeof dateValue === 'string') {
        return dayjs(dateValue);
      }
      // Se for um objeto Date
      else if (dateValue instanceof Date) {
        return dayjs(dateValue);
      }
      // Se for um objeto com campo ISO
      else if (typeof dateValue === 'object' && dateValue.ISO) {
        return dayjs(dateValue.ISO);
      }
      
      return null;
    } catch (error) {
      console.warn('Erro ao converter data:', error, dateValue);
      return null;
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

  // Implementar debounce para o searchTerm com indicador visual
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
    
    // Configurar um timer para atualizar o debouncedSearchTerm após 300ms
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    // Limpar o timer se searchTerm mudar antes do timeout
    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm, debouncedSearchTerm]);

  // Otimizar a função filterLeads dividindo em partes para melhor desempenho
  const applySearchTermFilter = useCallback((leads) => {
    if (!debouncedSearchTerm) return leads;
    
    const normalizedSearchTerm = debouncedSearchTerm.toLowerCase().trim();
    
    // Não aplicar o filtro para termos de busca muito curtos
    if (normalizedSearchTerm.length < 2) return leads;
    
    return leads.filter(lead => {
      // Verifica o nome (se existir e for string)
      const nameMatches = lead.nome && 
                        typeof lead.nome === 'string' && 
                        lead.nome.toLowerCase().includes(normalizedSearchTerm);
    
      // Verifica o WhatsApp (se existir)
      let whatsappMatches = false;
      if (lead.whatsapp) {
        if (typeof lead.whatsapp === 'string') {
          // Se for string, faz a busca normalmente
          whatsappMatches = lead.whatsapp.toLowerCase().includes(normalizedSearchTerm);
        } else if (typeof lead.whatsapp === 'number') {
          // Se for número, converte para string para buscar
          whatsappMatches = String(lead.whatsapp).includes(normalizedSearchTerm);
        }
      }
      
      return nameMatches || whatsappMatches;
    });
  }, [debouncedSearchTerm]);

  const applyStatusFilter = useCallback((leads) => {
    if (selectedStatuses.length > 0) {
      return leads.filter(lead => selectedStatuses.includes(lead.status));
    } else if (statusFilter) {
      return leads.filter(lead => lead.status === statusFilter);
    }
    return leads;
  }, [selectedStatuses, statusFilter]);

  const applyDateFilters = useCallback((leads) => {
    let result = leads;
    
    // Apply próximo contato filter
    if (proxContatoFilter) {
      const filterDate = dayjs(proxContatoFilter).startOf('day');
      result = result.filter(lead => {
        if (!lead.proximoContato) return false;
        
        const leadDate = convertToDateObject(lead.proximoContato);
        if (!leadDate) return false;
        
        return leadDate.startOf('day').isSame(filterDate);
      });
    }

    // Apply data AE filter
    if (dataAEFilter) {
      const filterDate = dayjs(dataAEFilter).startOf('day');
      result = result.filter(lead => {
        if (!lead.dataAE) return false;
        
        const leadDate = convertToDateObject(lead.dataAE);
        if (!leadDate) return false;
        
        return leadDate.startOf('day').isSame(filterDate);
      });
    }

    // Apply turma AE filter
    if (turmaAEFilter) {
      result = result.filter(lead => lead.turmaAE === turmaAEFilter);
    }

    return result;
  }, [proxContatoFilter, dataAEFilter, turmaAEFilter]);

  const applySorting = useCallback((leads) => {
    return [...leads].sort((a, b) => {
      // Primeiro, tentamos ordenar por próximo contato se essa ordenação estiver ativa
      if (proxContatoSort) {
        const dateA = convertToDateObject(a.proximoContato);
        const dateB = convertToDateObject(b.proximoContato);
        
        if (!dateA && !dateB) {
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
        
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return proxContatoSort === 'asc'
          ? dateA.unix() - dateB.unix()
          : dateB.unix() - dateA.unix();
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
  }, [proxContatoSort, statusSort]);

  // Memoizar os resultados filtrados com otimização em pipeline
  const memoizedFilteredLeads = useMemo(() => {
    // Aplicar filtros em pipeline para melhor desempenho
    return applySorting(
      applyDateFilters(
        applyStatusFilter(
          applySearchTermFilter(leads)
        )
      )
    );
  }, [leads, applySearchTermFilter, applyStatusFilter, applyDateFilters, applySorting]);

  // Update filtered leads when filters or leads change
  useEffect(() => {
    setFilteredLeads(memoizedFilteredLeads);
  }, [memoizedFilteredLeads]);

  const [lastUpdate, setLastUpdate] = useState(null);
  const [dataSource, setDataSource] = useState('cache'); // 'cache' ou 'server'
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Use Effect para carregar leads do Cache ou do Server com controle manual
  useEffect(() => {
    setLoading(true);
    
    const loadLeads = async () => {
      try {
        const leadsCollection = collection(db, 'leads');
        const q = query(leadsCollection, orderBy('createdAt', 'desc'));
        
        // Tentar carregar do cache primeiro
        if (dataSource === 'cache' && !isInitialLoad) {
          try {
            const cachedSnapshot = await getDocsFromCache(q);
            
            if (!cachedSnapshot.empty) {
              const leadsData = cachedSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              
              console.log(`Carregados ${leadsData.length} leads do cache.`);
              setLeads(leadsData);
              setLoading(false);
              return;
            } else {
              console.log('Cache vazio, carregando do servidor...');
              // Se o cache estiver vazio, carregaremos do servidor
              setDataSource('server');
            }
          } catch (error) {
            console.warn('Erro ao carregar do cache:', error);
            setDataSource('server');
          }
        }
        
        // Se chegarmos aqui, precisamos carregar do servidor
        if (dataSource === 'server' || isInitialLoad) {
          const serverSnapshot = await getDocsFromServer(q);
          const leadsData = serverSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log(`Carregados ${leadsData.length} leads do servidor.`);
          setLeads(leadsData);
          setLastUpdate(new Date());
          setIsInitialLoad(false);
          setDataSource('cache'); // Voltar para cache nas próximas atualizações
        }
      } catch (error) {
        console.error("Erro ao carregar leads:", error);
        setSnackbar({
          open: true,
          message: 'Erro ao carregar leads. Por favor, tente novamente.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadLeads();
  }, [dataSource, isInitialLoad]);

  // Funções para operações CRUD que mantêm o estado local atualizado
  const syncLocalLeads = (leadId, newData = null, operation = 'update') => {
    if (operation === 'delete') {
      setLeads(currentLeads => currentLeads.filter(lead => lead.id !== leadId));
    } else if (operation === 'update' && newData) {
      setLeads(currentLeads => 
        currentLeads.map(lead => 
          lead.id === leadId ? { ...lead, ...newData } : lead
        )
      );
    } else if (operation === 'add' && newData) {
      setLeads(currentLeads => [newData, ...currentLeads]);
    }
  };

  // Função para forçar atualização de dados do servidor
  const handleRefreshData = () => {
    setDataSource('server');
  };

  const handleOpenDialog = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        nome: lead.nome,
        status: lead.status,
        whatsapp: lead.whatsapp,
        ultimoContato: formatDateForInput(lead.ultimoContato),
        proximoContato: formatDateForInput(lead.proximoContato),
        dataAE: formatDateForInput(lead.dataAE),
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
      if (!formData.whatsapp || !formData.whatsapp.trim()) {
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
          
          // Garante que lead.whatsapp é uma string antes de chamar replace
          const leadWhatsApp = typeof lead.whatsapp === 'string' 
            ? lead.whatsapp.replace(/\D/g, '') 
            : String(lead.whatsapp);
            
          return leadWhatsApp === normalizedWhatsApp;
        });
        
        if (whatsAppExists) {
          setFormError('Este número de WhatsApp já está cadastrado.');
          return;
        }
      } else if (editingLead.whatsapp) {
        // Se estiver editando e o WhatsApp atual for diferente do original
        const originalWhatsApp = typeof editingLead.whatsapp === 'string'
          ? editingLead.whatsapp.replace(/\D/g, '')
          : String(editingLead.whatsapp);
        
        if (normalizedWhatsApp !== originalWhatsApp) {
          // Verifica se o novo número já existe em outro lead
          const whatsAppExists = leads.some(lead => {
            if (lead.id === editingLead.id || !lead.whatsapp) return false;
            
            // Garante que lead.whatsapp é uma string antes de chamar replace
            const leadWhatsApp = typeof lead.whatsapp === 'string' 
              ? lead.whatsapp.replace(/\D/g, '') 
              : String(lead.whatsapp);
              
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
        
        // Atualizar o estado local imediatamente
        syncLocalLeads(editingLead.id, { 
          ...leadData, 
          id: editingLead.id, 
          updatedAt: new Date() // Usamos uma data local para a UI
        }, 'update');
        
        setSnackbar({
          open: true,
          message: 'Lead atualizado com sucesso!',
          severity: 'success'
        });
      } else {
        // Ao adicionar um novo documento
        const docRef = await addDoc(collection(db, 'leads'), {
          ...leadData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
        
        // Atualizar o estado local imediatamente
        syncLocalLeads(docRef.id, {
          ...leadData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }, 'add');
        
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
        
        // Atualizar o estado local imediatamente
        syncLocalLeads(leadId, null, 'delete');
        
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
    try {
      // Remover formatação do número
      const cleanNumber = whatsapp.replace(/\D/g, '');
      
      // Se o número já tem o código do país, usa como está
      const whatsappNumber = cleanNumber.startsWith('55') 
        ? cleanNumber 
        : `55${cleanNumber}`;
      
      // Abrir o link do WhatsApp
      window.open(`https://wa.me/${whatsappNumber}`, '_blank');
      
      // Código de registro de log removido
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      alert('Erro ao abrir o WhatsApp. Verifique o número.');
    }
  };

  // Modificar handleStatusUpdate
  const handleStatusUpdate = async (leadId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      await updateDoc(doc(db, 'leads', leadId), updateData);
      
      // Atualizar o estado local imediatamente
      syncLocalLeads(leadId, {
        ...updateData,
        updatedAt: new Date() // Usamos uma data local para a UI
      }, 'update');
      
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

  // Modificar handleTurmaUpdate
  const handleTurmaUpdate = async (leadId, newTurma) => {
    try {
      const updateData = {
        turmaAE: newTurma,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      await updateDoc(doc(db, 'leads', leadId), updateData);
      
      // Atualizar o estado local imediatamente
      syncLocalLeads(leadId, {
        ...updateData,
        updatedAt: new Date() // Usamos uma data local para a UI
      }, 'update');
      
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

  // Modificar handleSaveEdit para aceitar um valor customizado
  const handleSaveEdit = async (leadId, field, customValue = null) => {
    try {
      // Get the lead from local state
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        console.error('Lead not found:', leadId);
        setEditingCell(null);
        setEditValue('');
        return;
      }
      
      // Usar o valor customizado se fornecido, caso contrário, usar editValue do estado
      const valueToProcess = customValue !== null ? customValue : editValue;
      
      // Log para debug
      console.log(`Salvando ${field} com valor:`, valueToProcess);
      
      // Se o valor estiver vazio e for um campo opcional, definir como null
      if (!valueToProcess && ['ultimoContato', 'proximoContato', 'dataAE'].includes(field)) {
        console.log(`Limpando campo ${field} (valor vazio)`);
        
        // Se o campo já estiver vazio, não faz nada
        if (!lead[field]) {
          console.log(`Campo ${field} já está vazio, skipping update`);
          setEditingCell(null);
          setEditValue('');
          return;
        }
        
        // Atualizar com null para limpar o campo
        const leadRef = doc(db, 'leads', leadId);
        const updateData = {
          [field]: null,
          updatedAt: serverTimestamp(),
        };
        
        await updateDoc(leadRef, updateData);
        
        // Atualizar o estado local
        syncLocalLeads(leadId, {
          ...updateData,
          updatedAt: new Date()
        }, 'update');
        
        setSnackbar({
          open: true,
          message: `Campo ${field} limpo com sucesso!`,
          severity: 'success'
        });
        
        setEditingCell(null);
        setEditValue('');
        return;
      }
      
      // Detectar se o valor está já formatado corretamente como dd-mm-yy
      const isDDMMYYFormat = /^\d{1,2}-\d{1,2}-\d{1,2}$/.test(valueToProcess);
      console.log('Valor está no formato dd-mm-yy?', isDDMMYYFormat);
      
      // Tratamento diferenciado conforme o tipo de campo
      let valueToSave;
      if (['ultimoContato', 'proximoContato', 'dataAE'].includes(field)) {
        // Formata como data apenas os campos que são datas
        valueToSave = formatDateForSave(valueToProcess);
        
        // Log para debug
        console.log('Valor formatado para salvar:', valueToSave);
        
        // Se o valor não for válido, exibe mensagem de erro e não salva
        if (!valueToSave) {
          setSnackbar({
            open: true,
            message: `Formato de data inválido para o campo ${field}`,
            severity: 'error'
          });
          setEditingCell(null);
          setEditValue('');
          return;
        }
        
        // Get the original value
        const originalValue = lead[field];
        
        // Check if the values are effectively the same
        let noChange = false;
        
        // If both are null/empty, no change
        if ((!valueToSave && !originalValue) || 
            (valueToSave === '' && !originalValue) ||
            (!valueToSave && originalValue === '')) {
          noChange = true;
        } 
        // If both exist, compare them
        else if (valueToSave && originalValue) {
          try {
            // If it's a Firestore Timestamp, convert to milliseconds for comparison
            const originalTime = originalValue.toDate ? originalValue.toDate().getTime() : new Date(originalValue).getTime();
            const newTime = valueToSave.toDate ? valueToSave.toDate().getTime() : new Date(valueToSave).getTime();
            
            // Log para debug
            console.log('Comparando datas:', new Date(originalTime), 'vs', new Date(newTime));
            
            // Compare the timestamps (ignoring milliseconds which are insignificant)
            noChange = Math.floor(originalTime / 1000) === Math.floor(newTime / 1000);
          } catch (error) {
            console.error('Erro ao comparar datas:', error);
            noChange = false; // Em caso de erro, tenta salvar
          }
        }
        
        if (noChange) {
          console.log(`No changes detected in ${field}, skipping update`);
          setEditingCell(null);
          setEditValue('');
          return;
        }
      } else {
        // Para campos de texto, usa o valor como está
        valueToSave = valueToProcess;
        
        // Skip update if no changes
        if (valueToSave === lead[field]) {
          console.log(`No changes in ${field}, skipping update`);
          setEditingCell(null);
          setEditValue('');
          return;
        }
      }
      
      console.log('Prosseguindo com o salvamento para:', field, 'com valor:', valueToSave);
      
      const leadRef = doc(db, 'leads', leadId);
      const updateData = {
        [field]: valueToSave,
        updatedAt: serverTimestamp(),
      };
      
      // Log para debug
      console.log('Atualizando documento com:', updateData);
      
      await updateDoc(leadRef, updateData);
      
      // Atualizar o estado local imediatamente
      syncLocalLeads(leadId, {
        ...updateData,
        updatedAt: new Date() // Usamos uma data local para a UI
      }, 'update');

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

  // Otimizar a renderização da tabela exibindo apenas os itens da página atual
  const paginatedLeads = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return memoizedFilteredLeads.slice(startIndex, startIndex + rowsPerPage);
  }, [memoizedFilteredLeads, page, rowsPerPage]);

  // Função para formatar detalhes do log
  const formatLogDetails = (action, details) => {
    if (!details) return '';
    
    try {
      // Se os detalhes já estiverem em formato de texto
      if (typeof details === 'string') return details;
      
      // Para atualizações de campo específicas
      if (action === 'field_update' && details.fieldName && details.hasOwnProperty('oldValue') && details.hasOwnProperty('newValue')) {
        let oldDisplay = details.oldValue !== null && details.oldValue !== undefined ? details.oldValue : '(vazio)';
        let newDisplay = details.newValue !== null && details.newValue !== undefined ? details.newValue : '(vazio)';
        
        // Formatação especial para datas
        if (['ultimoContato', 'proximoContato', 'dataAE'].includes(details.fieldName)) {
          if (details.oldValue) oldDisplay = formatDateForDisplay(details.oldValue);
          if (details.newValue) newDisplay = formatDateForDisplay(details.newValue);
        }
        
        return `Campo "${details.fieldName}": ${oldDisplay} → ${newDisplay}`;
      }
      
      // Para outros tipos de logs, retornar representação JSON formatada
      return JSON.stringify(details, null, 2);
    } catch (error) {
      console.error('Erro ao formatar detalhes do log:', error);
      return 'Erro ao formatar detalhes';
    }
  };

  // Função para carregar logs do Firestore
  const loadLogs = async () => {
    if (!currentUser) return;
    
    setLoadingLogs(true);
    
    try {
      let logsRef = collection(db, 'logs');
      let logsQuery;
      
      if (logFilter !== 'all') {
        logsQuery = query(logsRef, 
          where('action', '==', logFilter),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      } else {
        logsQuery = query(logsRef,
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      }
      
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      
      setLogs(logsData);
      setLoadingLogs(false);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setLoadingLogs(false);
      // Notificar o usuário sobre o erro
      setSnackbar({
        open: true,
        message: 'Erro ao carregar logs. Tente novamente mais tarde.',
        severity: 'error'
      });
    }
  };

  // Função para formatar o log
  const formatLogAction = (action) => {
    switch (action) {
      case 'create':
        return 'Criação de Lead';
      case 'update':
        return 'Atualização de Lead';
      case 'delete':
        return 'Exclusão de Lead';
      case 'field_update':
        return 'Atualização de Campo';
      case 'status_update':
        return 'Atualização de Status';
      case 'turma_update':
        return 'Atualização de Turma';
      case 'whatsapp_click':
        return 'Contato via WhatsApp';
      default:
        return action;
    }
  };

  // Determina qual aba está ativa com base na URL
  const getActiveTab = () => {
    const tab = searchParams.get('tab');
    return tab === 'logs' ? 1 : 0;
  };
  
  // State derivado para controlar a exibição de logs
  const showLogs = getActiveTab() === 1;
  
  // Função para mudar de aba
  const handleTabChange = (event, newValue) => {
    if (newValue === 1) {
      setSearchParams({ tab: 'logs' });
    } else {
      setSearchParams({});
    }
  };
  
  // Carregar logs quando a aba de logs for aberta
  useEffect(() => {
    if (showLogs) {
      loadLogs();
    }
  }, [showLogs, logFilter]);

  // Funções para navegação entre páginas de logs
  const handleLogPageChange = (event, newPage) => {
    setLogPage(newPage);
  };
  
  const handleLogRowsPerPageChange = (event) => {
    setLogRowsPerPage(parseInt(event.target.value, 10));
    setLogPage(0);
  };
  
  // Filtrar os logs paginados
  const paginatedLogs = useMemo(() => {
    const startIndex = logPage * logRowsPerPage;
    return logs.slice(startIndex, startIndex + logRowsPerPage);
  }, [logs, logPage, logRowsPerPage]);

  // Componente para células de data com calendário
  function TableCellWithInlineCalendar({ lead, field, fieldId, formatValue, formatInput }) {
    const [editing, setEditing] = useState(false);
    const [localEditValue, setLocalEditValue] = useState('');
    
    // Adaptador genérico para o handler de edição
    const handleEditComplete = (valueToSave = null) => {
      if (editing) {
        // Usar o valor passado como parâmetro ou o valor atual do estado
        const valueToSubmit = valueToSave !== null ? valueToSave : localEditValue;
        console.log(`Salvando ${field} com valor editado:`, valueToSubmit);
        
        // IMPORTANTE: Usamos diretamente o valor formatado como dd-mm-yy
        handleSaveEdit(lead.id, field, valueToSubmit);
        setEditing(false);
      }
    };
    
    // Função para converter a data do Firestore para formato dd-mm-yy
    const convertToDisplayFormat = (dateValue) => {
      if (!dateValue) return '';
      
      try {
        // Se for um timestamp, converte para Date
        if (dateValue && typeof dateValue === 'object' && dateValue.seconds !== undefined) {
          const date = new Date(dateValue.seconds * 1000);
          // Formata diretamente para dd-mm-yy
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = String(date.getFullYear()).slice(2);
          return `${day}-${month}-${year}`;
        } 
        // Se já for uma string formatada
        else if (typeof dateValue === 'string') {
          // Verifica se já está no formato dd-mm-yy
          if (/^\d{1,2}-\d{1,2}-\d{1,2}$/.test(dateValue)) {
            return dateValue;
          }
          
          // Verifica se está no formato yyyy-MM-dd
          const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (match) {
            const year = match[1].slice(2);
            const month = match[2];
            const day = match[3];
            return `${day}-${month}-${year}`;
          }
        }
        
        // Fallback: tenta usar o formatDateForInput e converter
        const formatted = formatDateForInput(dateValue);
        if (formatted) {
          const parts = formatted.split('-');
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0].slice(2)}`;
          }
        }
        
        return '';
      } catch (e) {
        console.error('Erro ao converter data para exibição:', e);
        return '';
      }
    };
    
    // Handler para seleção de data no calendário
    const handleDateSelection = (newDate) => {
      if (newDate && newDate.isValid()) {
        // Formatar explicitamente no formato dd-mm-yy
        const day = newDate.format('DD');
        const month = newDate.format('MM');
        const yearShort = newDate.format('YY');
        
        const formattedDate = `${day}-${month}-${yearShort}`;
        console.log(`Data selecionada no calendário para ${field}:`, formattedDate);
        
        // Atualizar estado local com o formato dd-mm-yy
        setLocalEditValue(formattedDate);
        
        // Destacar que o valor está no formato dd-mm-yy para debug
        console.log(`Valor formatado dd-mm-yy para salvar ${field}:`, formattedDate);
        
        // Iniciar o salvamento após um pequeno delay
        setTimeout(() => {
          // IMPORTANTE: Passamos o formattedDate diretamente para o handleEditComplete
          // em vez de depender do estado localEditValue que pode não ter sido atualizado ainda
          handleEditComplete(formattedDate);
        }, 100);
      }
    };
    
    // Quando o componente abre, preparar valor inicial no formato dd-mm-yy
    useEffect(() => {
      if (editing && lead[field]) {
        const formattedValue = convertToDisplayFormat(lead[field]);
        console.log(`Valor inicial convertido para edição (${field}):`, formattedValue);
        setLocalEditValue(formattedValue);
      }
    }, [editing, field, lead]);
    
    return (
      <TableCell sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
        {editing ? (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              open
              onClose={() => setEditing(false)}
              onChange={handleDateSelection}
              value={lead[field] ? dayjs(formatDateForInput(lead[field])) : null}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: "standard",
                  size: "small",
                  autoFocus: true,
                  style: { fontSize: '0.875rem' }
                },
                popper: {
                  sx: { zIndex: 9999 }
                }
              }}
            />
          </LocalizationProvider>
        ) : (
          <Box
            onClick={() => {
              setEditing(true);
            }}
            style={{ cursor: 'pointer', minHeight: '20px' }}
          >
            {lead[field] ? formatValue(lead[field]) : '-'}
          </Box>
        )}
      </TableCell>
    );
  }

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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshData}
              size="small"
              sx={{ height: '28px', fontSize: '0.8rem' }}
            >
              Atualizar
            </Button>
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
        </Box>
        
        {lastUpdate && (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5, px: 0.25 }}>
            Última atualização: {lastUpdate.toLocaleString()}
          </Typography>
        )}
        
        {/* Abas para navegação entre Leads e Logs */}
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          mb: 2,
          mt: 1,
          width: '100%'
        }}>
          <Tabs
            value={getActiveTab()}
            onChange={handleTabChange}
            aria-label="CRM tabs"
            variant="standard"
            sx={{ 
              '& .MuiTab-root': {
                fontWeight: 'bold',
                fontSize: '1rem',
                color: '#666',
                '&.Mui-selected': {
                  color: '#1976d2',
                  fontWeight: 'bold'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#1976d2',
                height: 3
              }
            }}
          >
            <Tab label="Leads" />
            <Tab label="Logs" data-testid="logs-tab" />
          </Tabs>
        </Box>

        {/* Conteúdo da aba de Leads */}
        {!showLogs && (
          <>
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
                      {isSearching ? (
                        <CircularProgress size={16} thickness={4} />
                      ) : (
                        <SearchIcon fontSize="small" />
                      )}
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
                      <TableCell width="14%" sx={{ minWidth: 110, maxWidth: 130, py: 1, px: 0.5 }}>Nome</TableCell>
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
                      <TableCell width="9%" sx={{ minWidth: 70, maxWidth: 90, py: 1, px: 0.5 }}>Últ. Contato</TableCell>
                      <TableCell width="9%" sx={{ minWidth: 80, maxWidth: 100, py: 1, px: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Próx. Contato
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
                      <TableCell width="9%" sx={{ minWidth: 70, maxWidth: 90, py: 1, px: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Data AE
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
                    {paginatedLeads.map((lead) => (
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
                          {lead.whatsapp ? (typeof lead.whatsapp === 'string' ? lead.whatsapp : String(lead.whatsapp)) : '-'}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.5, px: 0.5 }}>
                          {editingCell === lead.id ? (
                            <CustomDateInlineEditor
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={(e) => handleSaveEdit(lead.id, 'ultimoContato')}
                              onKeyDown={(e) => handleKeyPress(e, lead.id, 'ultimoContato')}
                              field="ultimoContato"
                            />
                          ) : (
                            <Box
                              onClick={() => {
                                setEditingCell(lead.id);
                                // Usar a data de hoje como valor padrão para edição do último contato
                                setEditValue(formatDateForInput(new Date()));
                              }}
                              style={{ cursor: 'pointer', minHeight: '20px' }}
                            >
                              {lead.ultimoContato ? formatDateForDisplay(lead.ultimoContato) : ''}
                            </Box>
                          )}
                        </TableCell>
                        <TableCellWithInlineCalendar 
                          lead={lead}
                          field="proximoContato"
                          fieldId={`${lead.id}-prox`}
                          formatValue={formatDateForDisplay}
                          formatInput={formatDateForInput}
                        />
                        
                        <TableCellWithInlineCalendar 
                          lead={lead}
                          field="dataAE"
                          fieldId={`${lead.id}-ae`}
                          formatValue={formatDateForDisplay}
                          formatInput={formatDateForInput}
                        />
                        
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
          </>
        )}
        
        {/* Conteúdo da aba de Logs */}
        {showLogs && (
          <>
            {/* Filtros para logs */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="log-filter-label">Filtrar por ação</InputLabel>
                <Select
                  labelId="log-filter-label"
                  value={logFilter}
                  label="Filtrar por ação"
                  onChange={(e) => setLogFilter(e.target.value)}
                  size="small"
                >
                  <MenuItem value="all">Todas as ações</MenuItem>
                  <MenuItem value="create">Criação de Lead</MenuItem>
                  <MenuItem value="update">Atualização de Lead</MenuItem>
                  <MenuItem value="delete">Exclusão de Lead</MenuItem>
                  <MenuItem value="field_update">Atualização de Campo</MenuItem>
                  <MenuItem value="status_update">Atualização de Status</MenuItem>
                  <MenuItem value="turma_update">Atualização de Turma</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadLogs}
                size="small"
              >
                Atualizar Logs
              </Button>
            </Box>
            
            {loadingLogs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
                  <Table stickyHeader aria-label="logs table" size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="15%">Data e Hora</TableCell>
                        <TableCell width="15%">Usuário</TableCell>
                        <TableCell width="15%">Ação</TableCell>
                        <TableCell width="15%">Lead</TableCell>
                        <TableCell width="40%">Detalhes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log) => (
                          <TableRow key={log.id} hover>
                            <TableCell>{log.timestamp.toLocaleString()}</TableCell>
                            <TableCell>{log.userName}</TableCell>
                            <TableCell>{formatLogAction(log.action)}</TableCell>
                            <TableCell>{log.leadName}</TableCell>
                            <TableCell>{formatLogDetails(log.action, log.details)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            Nenhum log encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  component="div"
                  count={logs.length}
                  rowsPerPage={logRowsPerPage}
                  page={logPage}
                  onPageChange={handleLogPageChange}
                  onRowsPerPageChange={handleLogRowsPerPageChange}
                  labelRowsPerPage="Logs por página"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                />
              </Paper>
            )}
          </>
        )}

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

              <CustomDateInput
                fullWidth
                label="Último Contato"
                value={formData.ultimoContato}
                onChange={(e) => setFormData({ ...formData, ultimoContato: e.target.value })}
              />

              <CalendarDateInput
                fullWidth
                label="Próximo Contato"
                value={formData.proximoContato}
                onChange={(e) => setFormData({ ...formData, proximoContato: e.target.value })}
              />

              <CalendarDateInput
                fullWidth
                label="Data da Aula Experimental"
                value={formData.dataAE}
                onChange={(e) => setFormData({ ...formData, dataAE: e.target.value })}
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
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={tempProxContatoFilter ? dayjs(tempProxContatoFilter) : null}
                onChange={(date) => {
                  if (date && date.isValid()) {
                    // Formatar no formato dd-mm-yy
                    const day = date.format('DD');
                    const month = date.format('MM');
                    const shortYear = date.format('YY');
                    
                    setTempProxContatoFilter(`${day}-${month}-${shortYear}`);
                  } else {
                    setTempProxContatoFilter('');
                  }
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: { minWidth: 200 }
                  }
                }}
              />
            </LocalizationProvider>
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
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={tempDataAEFilter ? dayjs(tempDataAEFilter) : null}
                onChange={(date) => {
                  if (date && date.isValid()) {
                    // Formatar no formato dd-mm-yy
                    const day = date.format('DD');
                    const month = date.format('MM');
                    const shortYear = date.format('YY');
                    
                    setTempDataAEFilter(`${day}-${month}-${shortYear}`);
                  } else {
                    setTempDataAEFilter('');
                  }
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: { minWidth: 200 }
                  }
                }}
              />
            </LocalizationProvider>
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