import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function AuthRoute() {
  const { user, loading, registrationPending } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && !registrationPending) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
