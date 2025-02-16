import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import { SubscriptionManager } from '../../components/SubscriptionManager';
import { Box, Paper } from '@mui/material';

const Subscriptions = () => {
  return (
    <MainLayout title="Assinaturas">
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <SubscriptionManager />
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default Subscriptions; 