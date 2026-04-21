import React, { Suspense, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Activity, BellRing, Database, ChevronDown, ShieldCheck, Globe, Radio } from 'lucide-react';
import Reveal from '../components/Reveal';

// Lazy load Spline to prevent blocking the main thread during initial paint
const Spline = React.lazy(() => import('@splinetool/react-spline'));

// Use memo for static components to prevent unnecessary re-renders
const FeatureCard = memo(({ icon: Icon, title, description, color }) => (
  <div className="glass-card premium-hover" style={{ 
    padding: '30px', 
    flex: '1', 
    display: 'flex', 
    flexDirection: 'column',
    borderTop: `1px solid rgba(${color}, 0.3)`,
    background: `linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(${color}, 0.05) 100%)`,
    willChange: 'transform',
    transition: 'all 0.3s cubic-bezier(0.2, 0, 0.2, 1)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)'
  }}>
    <div style={{ 
      width: '64px', 
      height: '64px', 
      borderRadius: '20px', 
      background: `rgba(${color}, 0.1)`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginBottom: '24px',
      color: `rgb(${color})`,
      boxShadow: `0 0 20px rgba(${color}, 0.4)`
    }}>
      <Icon size={32} />
    </div>
    <h3 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 700, color: 'white' }}>{title}</h3>
    <p style={{ color: '#94A3B8', fontSize: '16px', lineHeight: '1.7' }}>{description}</p>
  </div>
));

const FloatingNode = memo(({ style, text, icon: Icon, color = 'var(--electric-blue)' }) => (
  <div className="glass-card" style={{ 
    position: 'absolute', 
    padding: '12px 20px', 
    borderRadius: '14px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    fontSize: '13px', 
    fontWeight: 700,
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(8px)',
    border: `1px solid rgba(255,255,255,0.1)`,
    borderLeft: `3px solid ${color}`,
    boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
    animation: 'floatNode 6s ease-in-out infinite',
    zIndex: 20,
    color: 'white',
    willChange: 'transform',
    ...style 
  }}>
    <div style={{ color: color }}><Icon size={18} /></div>
    {text}
  </div>
));

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{ 
      background: '#000000', 
      color: 'white', 
      position: 'relative', 
      overflowX: 'hidden',
      backgroundImage: `
        radial-gradient(circle at 20% 10%, rgba(41, 121, 255, 0.2), transparent 40%),
        radial-gradient(circle at 80% 60%, rgba(0, 200, 83, 0.15), transparent 40%),
        radial-gradient(circle at 50% 100%, rgba(255, 82, 82, 0.1), transparent 40%)
      `
    }}>
      
      {/* SECTION 1: HERO SECTION */}
      <section style={{ 
        paddingTop: '160px', 
        paddingBottom: '120px', 
        textAlign: 'center', 
        maxWidth: '1200px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 30,
        background: 'linear-gradient(to bottom, transparent 70%, #000000 100%)'
      }}>
        <Reveal>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            gap: '10px',
            padding: '10px 24px', 
            background: 'rgba(41, 121, 255, 0.12)', 
            borderRadius: '50px', 
            color: 'var(--electric-blue)', 
            fontWeight: 800, 
            marginBottom: '32px', 
            border: '1px solid rgba(41, 121, 255, 0.3)',
            fontSize: '11px',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            <Globe size={14} /> Autonomous Urban Systems
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 style={{ fontSize: 'clamp(48px, 8vw, 96px)', marginBottom: '24px', letterSpacing: '-4px', lineHeight: '0.9', fontWeight: 900 }}>
            Real-Time Urban <br />
            <span className="gradient-text">Intelligence Engine</span>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#CBD5E1', maxWidth: '800px', margin: '0 auto 48px', lineHeight: '1.5' }}>
            The world's most advanced AI orchestration for urban sanitation monitoring and crisis response.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Link to="/report" className="btn-neon btn-blue" style={{ padding: '18px 64px', fontSize: '18px', textDecoration: 'none' }}>
              Report Incident <Activity size={20} />
            </Link>
          </div>
        </Reveal>

        <div style={{ marginTop: '120px', opacity: 0.3 }}>
           <ChevronDown size={32} style={{ animation: 'bounceNode 2s infinite', color: 'var(--electric-blue)' }} />
        </div>
      </section>

      {/* SECTION 2: THE SPLINE 3D COMPONENT WITH HUD */}
      <section style={{ 
        position: 'relative', 
        height: '85vh', 
        width: '100%', 
        overflow: 'hidden',
        marginTop: '-120px',
        background: 'transparent',
        boxShadow: 'inset 0 -80px 120px #000000',
        zIndex: 5
      }}>
        {/* HUD OVERLAY */}
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          zIndex: 30, 
          textAlign: 'center',
          pointerEvents: 'none',
          width: '90%'
        }}>
           <h2 style={{ 
             fontSize: 'clamp(32px, 5vw, 64px)', 
             letterSpacing: '-3px', 
             fontWeight: 900, 
             marginBottom: '10px',
             textShadow: '0 10px 40px rgba(0,0,0,1)',
             textTransform: 'uppercase'
           }}>
             UrbanFlux AI Core
           </h2>
           <p style={{ 
             fontSize: 'clamp(14px, 1.5vw, 22px)', 
             color: '#F1F5F9', 
             fontWeight: 500,
             textShadow: '0 4px 10px rgba(0,0,0,0.8)',
             letterSpacing: '1px'
           }}>
             AUTONOMOUS GRID MONITORING ACTIVE
           </p>
        </div>

        {/* SECURE SPLINE LOAD */}
        <Suspense fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Loading Core visual...</div>}>
          <div style={{ height: '100%', width: '100%' }}>
            <Spline scene="https://prod.spline.design/5MNWfifB9iIGq9oM/scene.splinecode" />
          </div>
        </Suspense>

        <FloatingNode 
          style={{ top: '25%', left: '10%' }} 
          text="AI INTEGRITY: 100%" 
          icon={ShieldCheck} 
          color="var(--neon-green)"
        />
        <FloatingNode 
          style={{ bottom: '30%', left: '12%', animationDelay: '1.5s' }} 
          text="FLOW: OPTIMIZED" 
          icon={Activity} 
          color="var(--electric-blue)"
        />
        <FloatingNode 
          style={{ top: '30%', right: '12%', animationDelay: '0.7s' }} 
          text="LATENCY: 12MS" 
          icon={Zap} 
          color="var(--bright-coral)"
        />
        <FloatingNode 
          style={{ 
            bottom: '20px', 
            right: '25px', 
            padding: '16px 28px', 
            fontSize: '15px', 
            animationDelay: '2s',
            borderLeft: 'none',
            borderRight: '4px solid var(--neon-green)'
          }} 
          text="GRID: ACTIVE" 
          icon={Radio} 
          color="var(--neon-green)"
        />
      </section>

      {/* SECTION 3: COMPARISON */}
      <Reveal>
        <section style={{ 
          maxWidth: '1200px', 
          margin: '0 auto 100px', 
          padding: '80px 20px 0', 
          borderTop: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
          zIndex: 40
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            <div className="glass-card" style={{ padding: '40px', borderLeft: '4px solid var(--bright-coral)', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '24px' }}>
              <h2 style={{ fontSize: '28px', marginBottom: '15px', color: 'var(--bright-coral)' }}>The Problem</h2>
              <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: '1.6' }}>Legacy infrastructure leads to catastrophic delays in urban sanitation management and crisis response.</p>
            </div>
            <div className="glass-card" style={{ padding: '40px', borderLeft: '4px solid var(--neon-green)', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '24px' }}>
              <h2 style={{ fontSize: '28px', marginBottom: '15px', color: 'var(--neon-green)' }}>The Solution</h2>
              <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: '1.6' }}>A real-time neural network bridging incident reporting and responder orchestration with AI intelligence.</p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* SECTION 4: FEATURES */}
      <section style={{ maxWidth: '1300px', margin: '0 auto 100px', padding: '0 20px', position: 'relative', zIndex: 40 }}>
        <Reveal>
          <h3 style={{ 
            fontSize: '14px', 
            letterSpacing: '3px', 
            color: '#64748B', 
            textTransform: 'uppercase', 
            textAlign: 'center', 
            marginBottom: '40px',
            fontWeight: 800
          }}>
            Core System Capabilities
          </h3>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <Reveal delay={0.1}><FeatureCard icon={Zap} title="Neural Reporting" description="Instant routing to authorities." color="255, 109, 0" /></Reveal>
          <Reveal delay={0.2}><FeatureCard icon={Activity} title="Live Telemetry" description="Responder truck tracking." color="0, 200, 83" /></Reveal>
          <Reveal delay={0.3}><FeatureCard icon={BellRing} title="Smart Node" description="Preventative maintenance alerts." color="255, 82, 82" /></Reveal>
          <Reveal delay={0.4}><FeatureCard icon={Database} title="Master Console" description="Full urban data orchestration." color="41, 121, 255" /></Reveal>
        </div>
      </section>

      <style>{`
        @keyframes floatNode {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.02); }
        }
        @keyframes bounceNode {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .gradient-text {
          background: linear-gradient(to right, #2979FF, #00C853);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .premium-hover:hover {
          transform: translateY(-8px);
          background: rgba(41, 121, 255, 0.08) !important;
          border-color: rgba(41, 121, 255, 0.4) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
