import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './pages/admin/Dashboard';
import IndividualClasses from './pages/admin/IndividualClasses';
import Users from './pages/admin/Users';
import Students from './pages/admin/Students';
import StudentProfile from './pages/admin/StudentProfile';
import Enrollment from './pages/admin/Enrollment';
import Classes from './pages/admin/Classes';
import CheckMaster from './pages/admin/CheckMaster';
import Tasks from './pages/admin/Tasks';
import Schedule from './pages/public/Schedule';
import PrivateRoute from './components/PrivateRoute';
import CashControl from './pages/admin/CashControl';
import Reports from './pages/admin/Reports';
import Attendance from './pages/admin/Attendance';
import Products from './pages/admin/Products';
import Notifications from './pages/admin/Notifications';
import MainLayout from './layouts/MainLayout';
import { Box, Alert } from '@mui/material';
import AppointmentBooking from './pages/public/AppointmentBooking';
import PaymentSuccess from './pages/public/PaymentSuccess';
import CRM from './pages/private/CRM';
import ConfigTest from './components/ConfigTest';
import Uniform from './pages/admin/Uniform';
import Subscriptions from './pages/admin/Subscriptions';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/agendar" element={<Schedule />} />
          <Route path="/config-test" element={
            <MainLayout>
              <ConfigTest />
            </MainLayout>
          } />
          
          {/* Rotas privadas */}
          <Route 
            path="/admin/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/aulas" 
            element={
              <PrivateRoute>
                <IndividualClasses />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/usuarios" 
            element={
              <PrivateRoute>
                <Users />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/alunos" 
            element={
              <PrivateRoute>
                <Students />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/alunos/:id" 
            element={
              <PrivateRoute>
                <StudentProfile />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/matriculas" 
            element={
              <PrivateRoute>
                <Enrollment />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/turmas" 
            element={
              <PrivateRoute>
                <Classes />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/tarefas" 
            element={
              <PrivateRoute>
                <Tasks />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/crm" 
            element={
              <PrivateRoute>
                <CRM />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/caixa" 
            element={
              <PrivateRoute>
                <CashControl />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/relatorios" 
            element={
              <PrivateRoute>
                <Reports />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/frequencia" 
            element={
              <PrivateRoute>
                <Attendance />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/check-master" 
            element={
              <PrivateRoute>
                <CheckMaster />
              </PrivateRoute>
            } 
          />
          <Route path="/admin/cantina" element={
            <PrivateRoute>
              <Products />
            </PrivateRoute>
          } />
          <Route 
            path="/admin/notifications" 
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            } 
          />
          <Route path="/admin/uniforme" element={
            <PrivateRoute>
              <MainLayout>
                <Uniform />
              </MainLayout>
            </PrivateRoute>
          } />
          <Route path="/admin/assinaturas" element={
            <PrivateRoute>
              <Subscriptions />
            </PrivateRoute>
          } />
          
          {/* Redirecionamentos */}
          <Route path="/" element={<Navigate to="/agendar" />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
          <Route path="/schedule" element={<AppointmentBooking />} />
          <Route path="/success" element={<PaymentSuccess />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
