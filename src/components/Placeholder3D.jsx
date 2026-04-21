import React from 'react';

const Placeholder3D = ({ label, height = '400px', className = '' }) => {
  return (
    <div 
      className={`placeholder-container ${className}`} 
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-3 z-10" style={{ zIndex: 10 }}>
        <div style={{
          padding: '20px 40px',
          background: 'rgba(15, 23, 42, 0.7)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(41, 121, 255, 0.4)',
          boxShadow: '0 0 30px rgba(41, 121, 255, 0.2)',
          color: 'var(--electric-blue)',
          fontSize: '16px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {label}
        </div>
        <div style={{ 
          marginTop: '15px', 
          width: '50px', 
          height: '2px', 
          background: 'var(--electric-blue)',
          boxShadow: 'var(--glow-blue)'
        }} />
      </div>
    </div>
  );
};

export default Placeholder3D;
