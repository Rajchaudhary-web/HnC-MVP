import React, { useEffect, useState } from 'react';

const Loader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500); // give it a moment at 100%
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--deep-navy)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Background Flowing Lines effect */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.1,
        background: `linear-gradient(90deg, transparent 50%, var(--electric-blue) 50%)`,
        backgroundSize: '100px 100%',
        animation: 'slideLines 2s linear infinite'
      }} />

      <h1 className="gradient-text" style={{ fontSize: '32px', marginBottom: '40px', zIndex: 10, letterSpacing: '2px' }}>
        Initializing UrbanFlux AI System...
      </h1>

      <div style={{
        width: '300px',
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        position: 'relative',
        overflow: 'hidden',
        zIndex: 10
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'var(--neon-green)',
          boxShadow: '0 0 20px var(--neon-green)',
          transition: 'width 0.1s linear'
        }} />
      </div>
      
      <div style={{
        marginTop: '20px',
        fontSize: '14px',
        color: 'var(--electric-blue)',
        letterSpacing: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
        zIndex: 10
      }}>
        CONNECTION SECURE
      </div>

      <style>{`
        @keyframes slideLines {
          100% { background-position: 100px 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Loader;
