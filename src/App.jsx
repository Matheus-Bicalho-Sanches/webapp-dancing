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
import MercadoLivre from './pages/admin/MercadoLivre';
import PagSeguro from './pages/admin/PagSeguro';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/agendar" element={<Schedule />} />

          {/* Rotas administrativas */}
          <Route 
            path="/admin/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
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
            path="/admin/usuarios" 
            element={
              <PrivateRoute>
                <Users />
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
          <Route path="/admin/produtos" element={
            <PrivateRoute>
              <Products />
            </PrivateRoute>
          } />
          <Route path="/admin/mercado-livre" element={
            <PrivateRoute>
              <MercadoLivre />
            </PrivateRoute>
          } />
          <Route path="/admin/pag-seguro" element={
            <PrivateRoute>
              <PagSeguro />
            </PrivateRoute>
          } />
          
          {/* Redirecionamentos */}
          <Route path="/" element={<Navigate to="/agendar" />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
