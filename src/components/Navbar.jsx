import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  // Hide nav on dashboard pages where we have a sidebar
  if (location.pathname === '/admin') return null;

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Contact', path: '/contact' }
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '1200px',
      height: '80px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      borderRadius: '24px',
      background: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.02)'
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
        <div style={{ 
          background: 'var(--electric-blue)', 
          padding: '10px', 
          borderRadius: '14px',
          color: 'white',
          boxShadow: 'var(--glow-blue)'
        }}>
          <Activity size={24} />
        </div>
        <span style={{ fontWeight: 800, fontSize: '22px', letterSpacing: '-1px', color: 'white' }}>
          Urban<span style={{ color: 'var(--electric-blue)' }}>Flux</span>
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '8px' }}>
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                padding: '12px 24px',
                borderRadius: '14px',
                textDecoration: 'none',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'rgba(41, 121, 255, 0.1)' : 'transparent',
                fontWeight: 700,
                fontSize: '14px',
                transition: 'var(--transition)',
                border: isActive ? '1px solid rgba(41, 121, 255, 0.2)' : '1px solid transparent'
              }}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      <Link to="/admin" className="btn-neon btn-blue" style={{ textDecoration: 'none', padding: '10px 24px' }}>
        Operator
      </Link>
    </nav>
  );
};

export default Navbar;
