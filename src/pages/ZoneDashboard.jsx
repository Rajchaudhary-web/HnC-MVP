import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, LayoutGrid, Database, Users, Shield, Zap } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const SECTORS = ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Central Node', 'North Sector', 'South Hub'];

const ZoneCard = ({ name, reports }) => {
  const activeCount = reports.filter(r => r.area === name && r.status !== 'resolved').length;
  const resolvedCount = reports.filter(r => r.area === name && r.status === 'resolved').length;
  
  const getStatus = () => {
    if (activeCount > 3) return { label: 'CRITICAL', color: 'var(--coral-red)', glow: 'var(--glow-red)' };
    if (activeCount > 1) return { label: 'MODERATE', color: 'var(--vibrant-orange)', glow: 'var(--glow-orange)' };
    return { label: 'STABLE', color: 'var(--neon-green)', glow: 'var(--glow-green)' };
  };

  const status = getStatus();

  return (
    <div className="glass-card" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: `radial-gradient(circle at top right, ${status.color}10, transparent 70%)` }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>{name}</h3>
        <div style={{ 
          padding: '6px 12px', 
          borderRadius: '8px', 
          fontSize: '11px', 
          fontWeight: 800, 
          background: `${status.color}15`, 
          color: status.color,
          border: `1px solid ${status.color}30`,
          boxShadow: status.glow,
          letterSpacing: '1px'
        }}>
          {status.label}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{activeCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Anomalies</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>{resolvedCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Resolved</div>
        </div>
      </div>

      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={{ 
          width: `${Math.min((activeCount / 8) * 100, 100)}%`, 
          height: '100%', 
          background: status.color,
          boxShadow: `0 0 15px ${status.color}`
        }} />
      </div>
    </div>
  );
};

const ZoneDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('reports').select('*');
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Data Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--deep-void)', position: 'relative' }}>
      {/* SIDEBAR */}
      <aside style={{ 
        width: '280px', 
        background: 'rgba(15, 23, 42, 0.8)', 
        backdropFilter: 'blur(30px)',
        padding: '40px 24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        color: 'white',
        position: 'fixed',
        height: '100vh',
        borderRight: '1px solid var(--glass-border)',
        zIndex: 100
      }}>
        <div style={{ fontSize: '24px', fontWeight: 850, padding: '0 10px 40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--electric-blue)', padding: '8px', borderRadius: '12px', boxShadow: 'var(--glow-blue)' }}>
            <Activity size={24} color="white"/>
          </div>
          <span className="gradient-text">UrbanFlux</span>
        </div>
        {[
          { label: 'Intelligence Grid', icon: LayoutGrid, active: true },
          { label: 'Secure Pipelines', icon: Shield, active: false },
          { label: 'Neural Activity', icon: Zap, active: false },
          { label: 'Field Units', icon: Users, active: false },
        ].map(item => (
          <div key={item.label} style={{ 
            display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderRadius: '14px',
            background: item.active ? 'rgba(41, 121, 255, 0.1)' : 'transparent',
            color: item.active ? 'var(--electric-blue)' : 'var(--text-secondary)',
            fontWeight: item.active ? 700 : 500,
            cursor: 'pointer',
            border: item.active ? '1px solid rgba(41, 121, 255, 0.2)' : '1px solid transparent',
            transition: 'all 0.2s ease'
          }} className="sidebar-link">
            <item.icon size={20} /> {item.label}
          </div>
        ))}
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '60px', marginLeft: '280px', position: 'relative', zIndex: 1 }}>
        <header style={{ marginBottom: '56px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
             <div style={{ color: 'var(--electric-blue)', fontSize: '12px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Operational Overview</div>
             <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '8px' }} className="gradient-text">Zone Intelligence Grid</h1>
             <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>Real-time sector density and infrastructure health.</p>
          </div>
          <button onClick={fetchReports} className="btn-neon btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={16}/> Refresh Telemetry
          </button>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Synchronizing neural grid telemetry...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
            {SECTORS.map(zone => (
              <ZoneCard key={zone} name={zone} reports={reports} />
            ))}
          </div>
        )}

        <section style={{ marginTop: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 800 }}>Neural Activity Feed</h3>
            <div style={{ padding: '6px 12px', borderRadius: '100px', background: 'rgba(0, 200, 83, 0.1)', color: 'var(--neon-green)', fontSize: '12px', fontWeight: 800 }}>LIVE SYNCING</div>
          </div>
          
          <div className="glass-panel" style={{ padding: '8px' }}>
            {reports.slice(0, 5).map((r, i) => (
              <div key={i} style={{ 
                padding: '24px', borderBottom: i === 4 ? 'none' : '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.2s ease', cursor: 'pointer'
              }} className="feed-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--glass-border)'
                  }}>
                    <AlertTriangle size={20} color={r.severity === 'high' ? 'var(--coral-red)' : 'var(--text-muted)'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{r.title || 'System Alert: Pipeline Deviation'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Zone: {r.area} • Sensor Read: {new Date(r.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
                <div style={{ 
                  padding: '6px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--glass-border)', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)'
                }}>
                  View Analysis
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <style>{`
        .sidebar-link:hover:not(.active) {
          background: rgba(255, 255, 255, 0.03) !important;
          color: white !important;
          transform: translateX(5px);
        }
        .feed-item:hover {
          background: rgba(255, 255, 255, 0.03) !important;
          padding-left: 32px !important;
        }
      `}</style>
    </div>
  );
};

export default ZoneDashboard;
