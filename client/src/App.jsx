import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Import useLocation
import { lazy, Suspense, useState, useEffect } from 'react';
import './App.css';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { RaceProvider } from './context/RaceContext';

// Components
import Navbar from './components/Navbar';
import Loading from './components/Loading';
import Modal from './components/Modal';
import Leaderboard from './components/Leaderboard';

// Lazy-loaded pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/Home'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const Race = lazy(() => import('./pages/Race'));
const Lobby = lazy(() => import('./pages/Lobby')); // Lazy load Lobby page
const AboutUs = lazy(() => import('./pages/AboutUs')); // Add lazy import for AboutUs

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

// Helper component to conditionally render Navbar and manage Tutorial
const ConditionalNavbar = () => {
  const location = useLocation();
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const { login, authenticated, user, loading } = useAuth();
  const [isTutorialRunning, setTutorialRunning] = useState(false);

  // Effect to auto-start tutorial for new users
  useEffect(() => {
    // Check only when auth loading is complete and user is authenticated
    if (!loading && authenticated && user && !user.has_completed_tutorial) {
      console.log('User logged in and has not completed tutorial. Starting tutorial automatically.');
      setTutorialRunning(true);
    }
  }, [authenticated, user, loading]); // Depend on auth state, user object, and loading status
  
  // Don't render Navbar on the landing page
  if (location.pathname === '/') {
    return null;
  }
  
  const handleOpenLeaderboard = () => setIsLeaderboardOpen(true);
  const handleCloseLeaderboard = () => setIsLeaderboardOpen(false);
  
  // Render Navbar on all other pages
  return (
    <>
      <Navbar 
        onOpenLeaderboard={handleOpenLeaderboard}
        onLoginClick={login}
        isTutorialRunning={isTutorialRunning}
        setTutorialRunning={setTutorialRunning}
      />
      
      {/* Leaderboard Modal */}
      {isLeaderboardOpen && (
        <Modal
          isOpen={isLeaderboardOpen}
          onClose={handleCloseLeaderboard}
          isLarge={true}
          showCloseButton={true}
        >
          <Leaderboard defaultDuration={15} defaultPeriod="alltime" layoutMode="modal" />
        </Modal>
      )}
    </>
  );
};

function AppRoutes() {
  return (
    <Router>
      <ConditionalNavbar /> {/* Use the conditional component */}
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
          <Route path="/lobby/:lobbyCode" element={ // Add route for Lobby page with code param
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          } />
          <Route path="/about" element={<AboutUs />} /> {/* Add route for About Us page */}
          <Route path="/lobby/:code" element={
            <ProtectedRoute>
              <Lobby />
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
