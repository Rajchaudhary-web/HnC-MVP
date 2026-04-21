import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, MapPin, Clock, Truck, Navigation, AlertTriangle, 
  CheckCircle, Activity, LayoutDashboard, FileText, Settings, 
  Search, Bell, Home, Radio, Plus, Minus, Info, ClipboardCheck, 
  Play, Building2, ShieldAlert, Filter, ChevronRight, ShieldCheck
} from 'lucide-react';
import { supabase, getReports, updateReportStatus } from '../lib/supabaseClient';

/* --- UI COMPONENTS --- */

const StatCard = ({ label, value, color, icon: Icon }) => (
  <div className="glass-card" style={{ padding: '24px', flex: '1', borderLeft: `6px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '36px', fontWeight: 900, color: 'white' }}>{value}</div>
    </div>
    <div style={{ background: `rgba(${color === 'var(--bright-coral)' ? '255,82,82' : color === 'var(--neon-green)' ? '0,200,83' : '41,121,255'}, 0.1)`, padding: '15px', borderRadius: '16px', color: color }}>
      <Icon size={28} />
    </div>
  </div>
);

const ZoneCard = ({ zone, active, onClick }) => {
  const isCritical = zone.critical > 0;
  return (
    <div 
      onClick={onClick}
      className="glass-card" 
      style={{ 
        padding: '24px', 
        cursor: 'pointer',
        border: active ? '1px solid var(--electric-blue)' : '1px solid rgba(255,255,255,0.05)',
        background: active ? 'rgba(41, 121, 255, 0.08)' : 'rgba(30, 41, 59, 0.4)',
        transition: 'var(--transition)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {isCritical && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--bright-coral)', boxShadow: '0 0 10px var(--bright-coral)' }} />}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: isCritical ? 'var(--bright-coral)' : '#94A3B8' }}>
          <Building2 size={20} />
        </div>
        <div>
          <h4 style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>{zone.name}</h4>
          <span style={{ fontSize: '11px', color: '#64748B' }}>Zone Intelligence</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{zone.total}</div>
          <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Reports</div>
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: isCritical ? 'var(--bright-coral)' : 'var(--neon-green)' }}>{zone.critical}</div>
          <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Critical</div>
        </div>
      </div>
      
      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--neon-green)' }}>{zone.resolved} Resolved</span>
        <ChevronRight size={14} color="#64748B" />
      </div>
    </div>
  );
};

/* --- MAIN DASHBOARD --- */

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState('All Zones');
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const data = await getReports();
        setReports(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();

    // Real-time updates
    const channel = supabase
      .channel('reports_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        getReports().then(setReports);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Zone Grouping Logic
  const zones = useMemo(() => {
    const groups = {};
    reports.forEach(r => {
      const area = r.area || 'General Zone';
      if (!groups[area]) {
        groups[area] = { name: area, total: 0, critical: 0, resolved: 0, reports: [] };
      }
      groups[area].total += 1;
      if (r.severity === 'high' && r.status !== 'resolved') groups[area].critical += 1;
      if (r.status === 'resolved') groups[area].resolved += 1;
      groups[area].reports.push(r);
    });
    return Object.values(groups).sort((a, b) => b.critical - a.critical);
  }, [reports]);

  const highPriorityZone = zones.find(z => z.critical > 0);

  const filteredReports = useMemo(() => {
    if (selectedZone === 'All Zones') return reports;
    return reports.filter(r => (r.area || 'General Zone') === selectedZone);
  }, [reports, selectedZone]);

  const handleStatusUpdate = async (id, status) => {
    setActionId(id);
    await updateReportStatus(id, status);
    setActionId(null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--deep-navy)' }}>
      {/* Sidebar (Existing consistent design) */}
      <aside style={{ width: '280px', background: 'rgba(15, 23, 42, 0.9)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '40px 30px' }}>
          <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1px' }}>UrbanFlux <span style={{ color: 'var(--electric-blue)' }}>AI</span></div>
        </div>
        <nav style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ marginBottom: '20px' }}><Link to="/" style={{ textDecoration: 'none', color: '#64748B', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px' }}><Home size={18} /> Home</Link></div>
          <div style={{ color: 'var(--electric-blue)', background: 'rgba(41, 121, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px', borderRadius: '14px', fontWeight: 700 }}><LayoutDashboard size={20} /> Zone Intelligence</div>
          <div style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px' }}><FileText size={20} /> Field Reports</div>
          <div style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px' }}><Activity size={20} /> Live Telemetry</div>
          <div style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px' }}><Settings size={20} /> Control Settings</div>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        
        {/* Priority Banner */}
        {highPriorityZone && (
          <div className="glass-card" style={{ marginBottom: '30px', background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.3)', padding: '20px 30px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--bright-coral)', padding: '12px', borderRadius: '12px', color: 'white', animation: 'pulse 2s infinite' }}>
              <ShieldAlert size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 800 }}>Critical Zone Detected: {highPriorityZone.name}</h3>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>{highPriorityZone.critical} active sewage overflows require immediate neural routing.</p>
            </div>
            <button onClick={() => setSelectedZone(highPriorityZone.name)} className="btn btn-primary" style={{ background: 'var(--bright-coral)', padding: '10px 24px', fontSize: '13px' }}>Deploy Crew</button>
          </div>
        )}

        {/* Global Statistics */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <StatCard label="Total Intelligence" value={reports.length} color="var(--electric-blue)" icon={Activity} />
          <StatCard label="Critical Alerts" value={reports.filter(r => r.severity === 'high' && r.status !== 'resolved').length} color="var(--bright-coral)" icon={AlertTriangle} />
          <StatCard label="Successful Resolves" value={reports.filter(r => r.status === 'resolved').length} color="var(--neon-green)" icon={CheckCircle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
          
          {/* Zone Intelligence Grid & System Metrics */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900 }}>Zone Intelligence</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ padding: '6px 12px', background: 'rgba(0,200,83,0.1)', color: 'var(--neon-green)', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>LIVE SYNC</div>
                <button 
                  onClick={() => setSelectedZone('All Zones')}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', padding: '6px 16px', borderRadius: '30px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Clear Node
                </button>
              </div>
            </div>

            {/* LIVE SYSTEM METRICS (THE NEW CARDS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
               <div className="glass-card" style={{ padding: '15px', borderLeft: '3px solid var(--electric-blue)' }}>
                 <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', marginBottom: '5px' }}>Neural Latency</div>
                 <div style={{ fontSize: '18px', fontWeight: 800 }}>14ms <span style={{ fontSize: '10px', color: 'var(--neon-green)', marginLeft: '5px' }}>-2%</span></div>
               </div>
               <div className="glass-card" style={{ padding: '15px', borderLeft: '3px solid var(--neon-green)' }}>
                 <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', marginBottom: '5px' }}>AI Integrity</div>
                 <div style={{ fontSize: '18px', fontWeight: 800 }}>99.8% <ShieldCheck size={14} style={{ marginLeft: '5px', verticalAlign: 'middle' }} /></div>
               </div>
               <div className="glass-card" style={{ padding: '15px', borderLeft: '3px solid var(--vibrant-orange)' }}>
                 <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', marginBottom: '5px' }}>Active Nodes</div>
                 <div style={{ fontSize: '18px', fontWeight: 800 }}>1,240 <Radio size={14} style={{ marginLeft: '5px', verticalAlign: 'middle' }} /></div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
              {zones.map(zone => (
                <ZoneCard 
                  key={zone.name} 
                  zone={zone} 
                  active={selectedZone === zone.name} 
                  onClick={() => setSelectedZone(zone.name)} 
                />
              ))}
            </div>
          </div>

          {/* Neural Incident Feed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900 }}>Incident Feed: <span style={{ color: 'var(--electric-blue)' }}>{selectedZone}</span></h2>
              <Filter size={18} color="#64748B" />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {filteredReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }} className="glass-card">No reports found in this node.</div>
              ) : (
                filteredReports.map(report => (
                  <div key={report.id} className="glass-card" style={{ padding: '20px', opacity: report.status === 'resolved' ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '10px', height: '10px', borderRadius: '50%', 
                          background: report.severity === 'high' ? 'var(--bright-coral)' : report.severity === 'medium' ? 'var(--vibrant-orange)' : 'var(--neon-green)',
                          boxShadow: `0 0 10px ${report.severity === 'high' ? 'var(--bright-coral)' : 'var(--neon-green)'}`
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8' }}>{report.severity} Priority</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>{new Date(report.created_at).toLocaleTimeString()}</span>
                    </div>
                    
                    <h5 style={{ color: 'white', marginBottom: '5px', fontSize: '15px' }}>{report.area || 'Unknown Zone'} Node</h5>
                    <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '15px', lineHeight: '1.5' }}>{report.location_name || report.description}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--electric-blue)', fontSize: '11px', fontWeight: 700 }}>
                        <Clock size={12} /> {report.eta || '--'}m ETA
                      </div>
                      
                      {report.status !== 'resolved' && (
                         <button 
                            onClick={() => handleStatusUpdate(report.id, 'resolved')}
                            disabled={actionId === report.id}
                            style={{ background: 'rgba(0,200,83,0.1)', border: '1px solid var(--neon-green)', color: 'var(--neon-green)', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {actionId === report.id ? 'Syncing...' : 'Mark Resolved'}
                         </button>
                      )}
                      
                      {report.status === 'resolved' && (
                        <div style={{ color: 'var(--neon-green)', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} /> Synced & Resolved
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
