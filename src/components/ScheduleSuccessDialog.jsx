import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function ScheduleSuccessDialog({ open, onClose, appointmentDetails, loading, error }) {
  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Typography color="error" align="center">
            {error}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!appointmentDetails) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CheckCircleOutlineIcon color="success" />
          <Typography variant="h6">
            Agendamento Confirmado!
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          Olá {appointmentDetails.nomeAluno},
        </Typography>
        <Typography variant="body1" paragraph>
          Seu agendamento foi realizado com sucesso! Abaixo estão os detalhes das suas aulas:
        </Typography>

        <List>
          {appointmentDetails.horarios?.map((horario, index) => (
            <React.Fragment key={index}>
              <ListItem>
                <ListItemText
                  primary={`Aula com ${horario.professorNome}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        Data: {format(new Date(horario.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="text.primary">
                        Horário: {horario.horario}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < appointmentDetails.horarios.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            Um e-mail com os detalhes foi enviado para {appointmentDetails.email}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
} 