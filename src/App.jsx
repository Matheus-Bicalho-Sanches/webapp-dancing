import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './pages/admin/Dashboard';
import IndividualClasses from './pages/admin/IndividualClasses';
import Users from './pages/admin/Users';
import Students from './pages/admin/Students';
import Enrollment from './pages/admin/Enrollment';
import CheckMaster from './pages/admin/CheckMaster';
import Schedule from './pages/public/Schedule';
import PaymentFailure from './pages/public/PaymentFailure';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/agendar" element={<Schedule />} />
          <Route path="/payment-failure" element={<PaymentFailure />} />
          
          {/* Rotas Administrativas */}
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
            path="/admin/matriculas" 
            element={
              <PrivateRoute>
                <Enrollment />
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
          
          {/* Redirecionamentos */}
          <Route path="/" element={<Navigate to="/agendar" />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
