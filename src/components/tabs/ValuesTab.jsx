import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function ValuesTab() {
  const [values, setValues] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingValue, setEditingValue] = useState(null);
  const [formData, setFormData] = useState({
    minClasses: '',
    maxClasses: '',
    valuePerClass: ''
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    loadValues();
  }, []);

  const loadValues = async () => {
    try {
      const valuesSnapshot = await getDocs(collection(db, 'valores_aulas'));
      const valuesData = valuesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Se não houver valores cadastrados, criar os valores padrão
      if (valuesData.length === 0) {
        await initializeDefaultValues();
        return loadValues();
      }
      
      // Ordenar por minClasses
      const sortedValues = valuesData.sort((a, b) => a.minClasses - b.minClasses);
      setValues(sortedValues);
    } catch (error) {
      console.error('Erro ao carregar valores:', error);
      showNotification('Erro ao carregar valores', 'error');
    }
  };

  const initializeDefaultValues = async () => {
    const defaultValues = [
      { minClasses: 1, maxClasses: 3, valuePerClass: 67 },
      { minClasses: 4, maxClasses: 7, valuePerClass: 62 },
      { minClasses: 8, maxClasses: 999, valuePerClass: 57 }
    ];

    try {
      const valuesRef = collection(db, 'valores_aulas');
      for (const value of defaultValues) {
        await addDoc(valuesRef, value);
      }
      showNotification('Valores iniciais configurados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao inicializar valores:', error);
      showNotification('Erro ao inicializar valores', 'error');
    }
  };

  const handleOpenDialog = (value) => {
    setEditingValue(value);
    setFormData({
      minClasses: value.minClasses.toString(),
      maxClasses: value.maxClasses.toString(),
      valuePerClass: value.valuePerClass.toString()
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingValue(null);
    setFormData({
      minClasses: '',
      maxClasses: '',
      valuePerClass: ''
    });
  };

  const handleSave = async () => {
    try {
      const valueData = {
        minClasses: Number(formData.minClasses),
        maxClasses: Number(formData.maxClasses),
        valuePerClass: Number(formData.valuePerClass)
      };

      await updateDoc(doc(db, 'valores_aulas', editingValue.id), valueData);
      showNotification('Valor atualizado com sucesso!', 'success');

      handleCloseDialog();
      loadValues();
    } catch (error) {
      console.error('Erro ao salvar valor:', error);
      showNotification('Erro ao salvar valor', 'error');
    }
  };

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ p: 2 }}>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Quantidade de Aulas</TableCell>
              <TableCell align="right">Valor por Aula (R$)</TableCell>
              <TableCell align="center" width={100}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {values.map((value) => (
              <TableRow key={value.id}>
                <TableCell>
                  {value.maxClasses === 999 
                    ? `${value.minClasses} ou mais` 
                    : `${value.minClasses} a ${value.maxClasses}`}
                </TableCell>
                <TableCell align="right">
                  {value.valuePerClass.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </TableCell>
                <TableCell align="center">
                  <IconButton 
                    onClick={() => handleOpenDialog(value)} 
                    color="primary"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Editar Valor</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Mínimo de Aulas"
              type="number"
              value={formData.minClasses}
              onChange={(e) => setFormData(prev => ({ ...prev, minClasses: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Máximo de Aulas"
              type="number"
              value={formData.maxClasses}
              onChange={(e) => setFormData(prev => ({ ...prev, maxClasses: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Valor por Aula (R$)"
              type="number"
              value={formData.valuePerClass}
              onChange={(e) => setFormData(prev => ({ ...prev, valuePerClass: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            disabled={!formData.minClasses || !formData.maxClasses || !formData.valuePerClass}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 