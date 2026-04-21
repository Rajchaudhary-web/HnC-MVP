import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div>
      <Navbar />
      <main>
        {children}
      </main>
      
      {/* Toast Notification Placeholder */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div className="glass-card" style={{
          padding: '15px 25px',
          background: 'var(--sage)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.5s ease-out'
        }}>
          <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} />
          <span>Truck arriving in 10 minutes</span>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Layout;
