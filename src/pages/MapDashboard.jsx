import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Clock, AlertTriangle, CheckCircle, Activity, Settings, 
  Home, Filter, User
} from 'lucide-react';
import { supabase, getReports, updateReportStatus } from '../lib/supabaseClient';

/* --- UI COMPONENTS --- */

const StatCard = ({ label, value, color, icon: Icon }) => (
  <div className="glass-card" style={{ padding: '24px', flex: '1', borderLeft: `6px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-primary)' }}>{value}</div>
    </div>
    <div style={{ background: `rgba(${color === 'var(--bright-coral)' ? '255,82,82' : color === 'var(--neon-green)' ? '0,200,83' : '41,121,255'}, 0.1)`, padding: '15px', borderRadius: '16px', color: color }}>
      <Icon size={28} />
    </div>
  </div>
);

/* --- MAIN DASHBOARD --- */

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        console.log('Incremental Sync Event:', payload.eventType);
        setReports(prev => {
          if (payload.eventType === 'INSERT') {
            return [payload.new, ...prev];
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map(r => r.id === payload.new.id ? payload.new : r);
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter(r => r.id !== payload.old.id);
          }
          return prev;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Filter for ONLY non-resolved reports for all mission-critical logic
  const filteredReports = useMemo(() => {
    return reports.filter(r => r.status !== 'resolved');
  }, [reports]);



  const handleStatusUpdate = async (id, status) => {
    setActionId(id);
    await updateReportStatus(id, status);
    setActionId(null);
  };

  const handleAssign = async (reportId) => {
    const workerId = "demo-worker-1"; // temporary
    setActionId(reportId);
    try {
      await supabase
        .from('reports')
        .update({
          assigned_to: workerId,
          assigned_at: new Date().toISOString(),
          status: 'assigned'
        })
        .eq('id', reportId);
    } catch (err) {
      console.error('Assignment failure:', err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar (Existing consistent design) */}
      <aside style={{ width: '280px', background: 'rgba(15, 23, 42, 0.9)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '40px 30px' }}>
          <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1px' }}>UrbanFlux <span style={{ color: 'var(--electric-blue)' }}>AI</span></div>
        </div>
        <nav style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ marginBottom: '20px' }}><Link to="/" style={{ textDecoration: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px' }}><Home size={18} /> Home</Link></div>
          <div style={{ color: 'var(--electric-blue)', background: 'rgba(41, 121, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px', borderRadius: '14px', fontWeight: 700 }}><Activity size={20} /> Live Feed</div>
          <div style={{ marginBottom: '10px' }}><Link to="/worker" style={{ textDecoration: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px' }}><Activity size={20} /> Worker Panel</Link></div>
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px' }}><Settings size={20} /> Control Settings</div>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        


        {/* Global Statistics */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <StatCard label="Live Anomalies" value={filteredReports.length} color="var(--electric-blue)" icon={Activity} />
          <StatCard label="Critical Alerts" value={filteredReports.filter(r => r.severity === 'high').length} color="var(--bright-coral)" icon={AlertTriangle} />
          <StatCard label="Successful Resolves" value={reports.filter(r => r.status === 'resolved').length} color="var(--neon-green)" icon={CheckCircle} />
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Neural Incident Feed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900 }}>Live Incident Feed</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '6px 12px', background: 'rgba(0,200,83,0.1)', color: 'var(--neon-green)', borderRadius: '6px', fontSize: '10px', fontWeight: 800, letterSpacing: '1px' }}>neural-sync v2.0</div>
                <Filter size={20} color="var(--text-muted)" />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {filteredReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }} className="glass-card">No active reports found in this node.</div>
              ) : (
                filteredReports
                  .filter(r => r.status !== 'resolved')
                  .map(report => (
                  <div key={report.id} className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '10px', height: '10px', borderRadius: '50%', 
                          background: report.severity === 'high' ? 'var(--bright-coral)' : report.severity === 'medium' ? 'var(--vibrant-orange)' : 'var(--neon-green)',
                          boxShadow: `0 0 10px ${report.severity === 'high' ? 'var(--bright-coral)' : 'var(--neon-green)'}`
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{report.severity} Priority</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(report.created_at).toLocaleTimeString()}</span>
                    </div>
                    
                    <h5 style={{ color: 'var(--text-primary)', marginBottom: '5px', fontSize: '15px' }}>{report.area || 'Unknown Zone'} Node</h5>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px', lineHeight: '1.5' }}>{report.location_name || report.description}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--electric-blue)', fontSize: '11px', fontWeight: 700 }}>
                          <Clock size={12} /> {report.eta || '--'}m ETA
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }}>
                          <User size={10} /> {report.assigned_to ? `Assigned: ${report.assigned_to}` : 'Unassigned'}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {report.status === 'reported' && (
                          <button 
                            onClick={() => handleAssign(report.id)}
                            disabled={actionId === report.id}
                            style={{ background: 'rgba(41,121,255,0.1)', border: '1px solid var(--electric-blue)', color: 'var(--electric-blue)', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {actionId === report.id ? 'Assigning...' : 'Assign'}
                          </button>
                        )}
                        <button 
                          onClick={() => handleStatusUpdate(report.id, 'resolved')}
                          disabled={actionId === report.id}
                          style={{ background: 'rgba(0,200,83,0.1)', border: '1px solid var(--neon-green)', color: 'var(--neon-green)', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {actionId === report.id ? 'Syncing...' : 'Mark Resolved'}
                        </button>
                      </div>
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
