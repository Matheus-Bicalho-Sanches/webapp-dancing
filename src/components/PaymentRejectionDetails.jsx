import React from 'react';
import { Box, Typography, Alert, AlertTitle, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const PaymentRejectionDetails = ({ rejectionDetails, onRetry }) => {
  if (!rejectionDetails) return null;

  const { title, message, recommendation } = rejectionDetails;

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Alert 
        severity="error"
        icon={<ErrorOutlineIcon fontSize="inherit" />}
        sx={{
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <AlertTitle>{title}</AlertTitle>
        <Typography variant="body1" gutterBottom>
          {message}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {recommendation}
        </Typography>
        {onRetry && (
          <Button
            variant="contained"
            color="primary"
            onClick={onRetry}
            sx={{ mt: 2 }}
          >
            Tentar Novamente
          </Button>
        )}
      </Alert>
    </Box>
  );
};

export default PaymentRejectionDetails; 