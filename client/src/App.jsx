
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import './App.css';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { RaceProvider } from './context/RaceContext';

// Components
import Navbar from './components/Navbar';
import Loading from './components/Loading';

// Lazy-loaded pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/Home'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const Race = lazy(() => import('./pages/Race'));

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { authenticated, loading } = useAuth();
  
  if (loading) {
    return <Loading />;
  }
  
  if (!authenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Router>
      <Navbar />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/race" element={
            <ProtectedRoute>
              <Race />
            </ProtectedRoute>
          } />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <RaceProvider>
          <AppRoutes />
        </RaceProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;