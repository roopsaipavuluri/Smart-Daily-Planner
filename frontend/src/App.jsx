import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthRoute from './components/AuthRoute';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import { useAuth } from './context/AuthContext';

const AuthForm = lazy(() => import('./components/AuthForm'));
const PlannerLayout = lazy(() => import('./components/PlannerLayout'));
const PublicLanding = lazy(() => import('./components/PublicLanding'));
const PlannerPages = lazy(() => import('./pages/PlannerPages'));

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/dashboard" replace /> : <PublicLanding />;
}

function NotFound() {
  return <main className="not-found"><span className="brand-mark">d</span><span className="eyebrow">THAT PAGE ISN’T HERE</span><h1>Let’s get you back on track.</h1><a className="button button-primary" href="/">Back to home</a></main>;
}

export default function App() {
  return <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route element={<AuthRoute />}>
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/forgot-password" element={<AuthForm mode="reset" />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<PlannerLayout />}>
          <Route path="/dashboard" element={<PlannerPages page="dashboard" />} />
          <Route path="/today" element={<PlannerPages page="today" />} />
          <Route path="/tasks" element={<PlannerPages page="tasks" />} />
          <Route path="/calendar" element={<PlannerPages page="calendar" />} />
          <Route path="/habits" element={<PlannerPages page="habits" />} />
          <Route path="/analytics" element={<PlannerPages page="analytics" />} />
          <Route path="/settings" element={<PlannerPages page="settings" />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>;
}
