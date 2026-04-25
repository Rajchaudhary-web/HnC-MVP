import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ChevronLeft, BarChart2, Activity, PieChart, Users, AlertTriangle, Zap, Shield } from 'lucide-react';

const InsightsPanel = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reportsRes, workersRes] = await Promise.all([
          supabase.from('reports').select('*'),
          supabase.from('workers').select('*')
        ]);

        if (reportsRes.error) throw reportsRes.error;
        if (workersRes.error) throw workersRes.error;

        setReports(reportsRes.data || []);
        setWorkers(workersRes.data || []);
      } catch (err) {
        console.error('Insight fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const metrics = useMemo(() => {
    const high = reports.filter(r => r.severity === 'high').length;
    const medium = reports.filter(r => r.severity === 'medium').length;
    const low = reports.filter(r => r.severity === 'low').length;

    const active = reports.filter(r => r.status !== 'resolved').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;

    const total = reports.length || 1;
    const highPercent = (high / total) * 100;
    const midPercent = (medium / total) * 100;
    const lowPercent = (low / total) * 100;

    const workerStats = workers.map(w => ({
      ...w,
      tasks: reports.filter(r => r.assigned_to === w.id && r.status !== 'resolved').length
    })).sort((a, b) => b.tasks - a.tasks);

    return { high, medium, low, active, resolved, highPercent, midPercent, lowPercent, workerStats, total: reports.length };
  }, [reports, workers]);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        background: 'var(--bg-primary)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: 'var(--teal)',
        fontSize: '1.2rem',
        fontWeight: 800,
        letterSpacing: '2px'
      }}>
        INITIALIZING NEURAL DATA STREAM...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      backgroundImage: `
        radial-gradient(circle at 5% 5%, rgba(0, 210, 255, 0.1), transparent 40%),
        radial-gradient(circle at 95% 95%, rgba(140, 90, 255, 0.1), transparent 40%)
      `,
      color: 'var(--text-primary)',
      padding: '40px'
    }}>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .metric-card {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .metric-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '10px 20px',
              borderRadius: '12px',
              color: 'var(--teal)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            <ChevronLeft size={18} /> Admin Console
          </button>
          <h1 className="gradient-text" style={{ fontSize: '36px', fontWeight: 900, marginTop: '15px' }}>System Insights Console</h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Heuristic assessment of municipal operational integrity</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--teal)', fontWeight: 800, fontSize: '12px', letterSpacing: '2px' }}>TELEMETRY STATUS</div>
          <div style={{ 
            marginTop: '5px', 
            background: 'rgba(0, 255, 200, 0.1)', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '11px', 
            color: 'var(--neon-green)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid rgba(0, 255, 200, 0.2)'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-green)', boxShadow: '0 0 10px var(--neon-green)' }} />
            LIVE FEED ACTIVE
          </div>
        </div>
      </header>

      {/* Primary Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '25px', marginBottom: '30px' }}>
        
        {/* Severity Distribution */}
        <div className="glass-card metric-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '25px', width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PieChart size={20} color="var(--teal)" /> Severity Distribution
          </h3>
          <div style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: `conic-gradient(
              var(--coral) 0% ${metrics.highPercent}%, 
              var(--orange) ${metrics.highPercent}% ${metrics.highPercent + metrics.midPercent}%, 
              var(--neon-green) ${metrics.highPercent + metrics.midPercent}% 100%
            )`,
            position: 'relative',
            boxShadow: '0 0 40px rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              background: 'var(--bg-primary)',
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
            }}>
              <span style={{ fontSize: '24px', fontWeight: 900 }}>{metrics.total}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>REPORTS</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', width: '100%', marginTop: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--coral)', fontSize: '18px', fontWeight: 900 }}>{metrics.high}</div>
              <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.6 }}>CRITICAL</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--orange)', fontSize: '18px', fontWeight: 900 }}>{metrics.medium}</div>
              <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.6 }}>URGENT</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--neon-green)', fontSize: '18px', fontWeight: 900 }}>{metrics.low}</div>
              <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.6 }}>ROUTINE</div>
            </div>
          </div>
        </div>

        {/* Active Issues Pulse */}
        <div className="glass-card metric-card" style={{ padding: '30px', position: 'relative', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="var(--coral)" /> Active Issues
          </h3>
          <div style={{ 
            height: '180px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: 'rgba(255, 82, 82, 0.05)',
              border: '2px solid rgba(255, 82, 82, 0.2)',
              animation: 'pulse-ring 2s infinite'
            }} />
            <div style={{ fontSize: '80px', fontWeight: 950, color: 'var(--coral)', textShadow: '0 0 30px rgba(255, 82, 82, 0.5)' }}>
              {metrics.active}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '3px', color: 'rgba(255, 82, 82, 0.7)' }}>
              PENDING RESOLUTION
            </div>
          </div>
        </div>

        {/* System Shield */}
        <div className="glass-card metric-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Shield size={60} color="var(--neon-green)" style={{ filter: 'drop-shadow(0 0 15px rgba(0, 255, 200, 0.3))', marginBottom: '20px' }} />
          <h3 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '5px' }}>System Integrity</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>Operational efficiency rating based on resolution velocity</p>
          <div style={{ fontSize: '42px', fontWeight: 950, color: 'var(--neon-green)' }}>
            {metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 100}%
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.5, marginTop: '5px' }}>RELIABILITY SCORE</div>
        </div>
      </div>

      {/* Responder Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        <div className="glass-card" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="var(--electric-blue)" /> Responder Resource Optimization
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {metrics.workerStats.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No responders currently online in this zone.
              </div>
            ) : metrics.workerStats.map((worker) => (
              <div key={worker.id} style={{
                background: 'rgba(41, 121, 255, 0.03)',
                border: '1px solid rgba(41, 121, 255, 0.1)',
                padding: '20px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{worker.name}</div>
                  <Zap size={14} color={worker.tasks > 2 ? "var(--orange)" : "var(--neon-green)"} />
                </div>
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Active Load</span>
                    <span style={{ color: worker.tasks > 2 ? "var(--orange)" : "var(--electric-blue)", fontWeight: 900 }}>{worker.tasks} Tasks</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                    <div style={{ 
                      width: `${Math.min((worker.tasks / 3) * 100, 100)}%`, 
                      height: '100%', 
                      background: worker.tasks > 2 ? 'var(--orange)' : 'var(--electric-blue)',
                      borderRadius: '3px',
                      boxShadow: `0 0 10px ${worker.tasks > 2 ? 'var(--orange)' : 'var(--electric-blue)'}44`
                    }} />
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Deployment: Sector {Math.floor(Math.random() * 4) + 1}
                </div>

                {/* Decorative circuit pattern */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '60px',
                  height: '60px',
                  opacity: 0.1,
                  backgroundImage: 'radial-gradient(var(--electric-blue) 1px, transparent 1px)',
                  backgroundSize: '10px 10px'
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;
