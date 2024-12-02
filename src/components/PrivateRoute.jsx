import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser && location.pathname.startsWith('/admin')) {
    return <Navigate to="/login" />;
  }

  return children;
} 