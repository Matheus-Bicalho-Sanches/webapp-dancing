import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Grid,
  Typography,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br'; // Para nomes dos dias em português
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

dayjs.locale('pt-br');

export default function ScheduleTab() {
  const [selectedDates, setSelectedDates] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState({});

  // Inicializar as três datas (hoje, amanhã, depois)
  useEffect(() => {
    const today = dayjs();
    const dates = [
      today,
      today.add(1, 'day'),
      today.add(2, 'day')
    ];
    setSelectedDates(dates);
  }, []);

  // Carregar horários para as datas selecionadas
  useEffect(() => {
    const loadSchedules = async () => {
      if (selectedDates.length === 0) return;

      setLoading(true);
      try {
        const schedulesData = {};
        
        for (const date of selectedDates) {
          const dateStr = date.format('YYYY-MM-DD');
          console.log('Data:', dateStr);
          console.log('Dia da semana original:', date.format('dddd'));
          
          // Mapeamento correto dos dias da semana
          const diasSemanaMap = {
            'domingo': 'domingo',
            'segunda-feira': 'segunda',
            'terça-feira': 'terca',
            'quarta-feira': 'quarta',
            'quinta-feira': 'quinta',
            'sexta-feira': 'sexta',
            'sábado': 'sabado'
          };
          
          const diaSemana = diasSemanaMap[date.format('dddd')] || '';
          console.log('Dia da semana convertido:', diaSemana);
          
          // Buscar horários disponíveis para este dia da semana
          const timesQuery = query(
            collection(db, 'horarios'),
            where('diaSemana', '==', diaSemana)
          );
          
          const querySnapshot = await getDocs(timesQuery);
          console.log('Horários encontrados:', querySnapshot.docs.length);
          
          schedulesData[dateStr] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }
        
        setSchedules(schedulesData);
      } catch (error) {
        console.error('Erro ao carregar horários:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [selectedDates]);

  // Novo useEffect para carregar professores
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachersSnapshot = await getDocs(collection(db, 'professores'));
        const teachersData = {};
        teachersSnapshot.docs.forEach(doc => {
          teachersData[doc.id] = doc.data();
        });
        setTeachers(teachersData);
      } catch (error) {
        console.error('Erro ao carregar professores:', error);
      }
    };

    loadTeachers();
  }, []);

  const formatDate = (date) => {
    return `${date.format('dddd')} ${date.format('DD/MM/YY')}`;
  };

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => {/* Implementaremos depois */}}
          sx={{ marginLeft: 'auto' }}
        >
          Novo Agendamento
        </Button>
      </Box>

      <Grid container spacing={2}>
        {selectedDates.map((date) => (
          <Grid item xs={12} md={4} key={date.format('YYYY-MM-DD')}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {formatDate(date)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              
              {loading ? (
                <Typography>Carregando horários...</Typography>
              ) : (
                <Box>
                  {schedules[date.format('YYYY-MM-DD')]?.map((schedule) => (
                    <Box 
                      key={schedule.id} 
                      sx={{ 
                        p: 1, 
                        my: 1, 
                        border: '1px solid #e0e0e0',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="subtitle1">
                        {schedule.horario}
                      </Typography>
                      <Box sx={{ ml: 2 }}>
                        {schedule.professores?.map(profId => (
                          <Typography 
                            key={profId} 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.875rem'
                            }}
                          >
                            • {teachers[profId]?.nome || 'Carregando...'}
                          </Typography>
                        ))}
                        {(!schedule.professores || schedule.professores.length === 0) && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              fontStyle: 'italic'
                            }}
                          >
                            Nenhum professor disponível
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                  {(!schedules[date.format('YYYY-MM-DD')] || 
                    schedules[date.format('YYYY-MM-DD')].length === 0) && (
                    <Typography 
                      sx={{ 
                        textAlign: 'center', 
                        color: 'text.secondary',
                        mt: 2 
                      }}
                    >
                      Nenhum horário disponível
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </>
  );
} 