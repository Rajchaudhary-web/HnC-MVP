import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import HowItWorks from './pages/HowItWorks';
import Contact from './pages/Contact';
import ReportIssue from './pages/ReportIssue';
import ZoneDashboard from './pages/ZoneDashboard';
import ResolvedIssues from './pages/ResolvedIssues';
import Loader from './components/Loader';
import './index.css';

// Wrapper to handle Loader on route changes
const AppContent = () => {
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Show loader when navigating to certain high-performance sections
  useEffect(() => {
    // Show loader on initial mount
    if (location.pathname === '/' && !window.hasInitiallyLoaded) {
      setLoading(true);
      window.hasInitiallyLoaded = true;
    }

    // Trigger loader for dashboard entering or report page
    if (location.pathname === '/admin' || location.pathname === '/report' || location.pathname === '/zones' || location.pathname === '/resolved') {
      setLoading(true);
    }
  }, [location.pathname]);

  if (loading) {
    return <Loader onComplete={() => setLoading(false)} />;
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/zones" element={<ZoneDashboard />} />
        <Route path="/report" element={<ReportIssue />} />
        <Route path="/resolved" element={<ResolvedIssues />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
