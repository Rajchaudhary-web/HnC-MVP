import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import HowItWorks from './pages/HowItWorks';
import Contact from './pages/Contact';
import ReportIssue from './pages/ReportIssue';
import ResolvedIssues from './pages/ResolvedIssues';
import WorkerDashboard from './pages/WorkerDashboard';
import ContactRequests from './pages/ContactRequests';
import InsightsPanel from './pages/InsightsPanel';
import Loader from './components/Loader';
import './index.css';

// Wrapper to handle Loader on route changes
const AppContent = () => {
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = () => {
    const isLandingPage = location.pathname === "/";
    if (isLandingPage) return;

    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Show loader when navigating to certain high-performance sections
  useEffect(() => {
    // Show loader on initial mount
    if (location.pathname === '/' && !window.hasInitiallyLoaded) {
      setLoading(true);
      window.hasInitiallyLoaded = true;
    }

    // Trigger loader for dashboard entering, report page, or requests registry
    if (location.pathname === '/admin' || 
        location.pathname === '/report' || 
        location.pathname === '/resolved' || 
        location.pathname === '/worker' || 
        location.pathname === '/insights' || 
        location.pathname === '/admin/requests') {
      setLoading(true);
    }
  }, [location.pathname]);

  if (loading) {
    return <Loader onComplete={() => setLoading(false)} />;
  }

  return (
    <>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/report" element={<ReportIssue />} />
        <Route path="/worker" element={<WorkerDashboard />} />
        <Route path="/resolved" element={<ResolvedIssues />} />
        <Route path="/admin/requests" element={<ContactRequests />} />
        <Route path="/insights" element={<InsightsPanel />} />
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
