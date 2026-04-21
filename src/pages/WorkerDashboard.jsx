import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Clock, MapPin, ChevronLeft, Activity, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, updateReportStatus } from '../lib/supabaseClient';

const WorkerDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [transitioningIds, setTransitioningIds] = useState(new Set());
  const navigate = useNavigate();

  const currentWorkerId = "80088469-b24f-4d94-bf03-a2c9d6cc346b"; // Raj Worker UUID

  const fetchAssignedReports = async () => {
    try {
      if (reports.length === 0) setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('assigned_to', currentWorkerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Teletransmission Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedReports();

    // Real-time synchronization
    const channel = supabase
      .channel('worker-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports', filter: `assigned_to=eq.${currentWorkerId}` }, (payload) => {
        fetchAssignedReports();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleStatusTransition = async (id, nextStatus) => {
    try {
      setActionId(id);
      await updateReportStatus(id, nextStatus);
      
      if (nextStatus === 'resolved') {
        // Initiate temporal transition delay for resolved missions
        setTransitioningIds(prev => new Set(prev).add(id));
        
        await fetchAssignedReports();

        setTimeout(() => {
          setTransitioningIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 2500);
      } else {
        await fetchAssignedReports();
      }

    } catch (err) {
      console.error('Workflow Transition failure:', err);
    } finally {
      setActionId(null);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return { color: 'var(--coral-red)', bg: 'rgba(255, 82, 82, 0.1)' };
      case 'medium': return { color: 'var(--vibrant-orange)', bg: 'rgba(255, 109, 0, 0.1)' };
      default: return { color: 'var(--neon-green)', bg: 'rgba(0, 200, 83, 0.1)' };
    }
  };

  // Group reports for high-fidelity mission tracking
  const activeMissions = reports.filter(r => r.status !== 'resolved' || transitioningIds.has(r.id));
  const completedMissions = reports.filter(r => r.status === 'resolved' && !transitioningIds.has(r.id));

  /* --- SUBCOMPONENT: MISSION CARD --- */
  const MissionCardRow = ({ report, isResolved }) => {
    const severity = getSeverityStyle(report.severity);
    const isUpdating = actionId === report.id;
    const currentStatus = report.status || 'reported';

    return (
      <div className="glass-card mission-transition" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        {/* Status Indicator */}
        <div style={{ 
          position: 'absolute', top: 0, right: 0, padding: '12px 24px', 
          background: isResolved ? 'rgba(0, 200, 83, 0.1)' : severity.bg,
          color: isResolved ? 'var(--neon-green)' : (currentStatus === 'in_progress' ? 'var(--electric-blue)' : severity.color),
          fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase',
          borderBottomLeftRadius: '16px', borderLeft: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          {isResolved ? 'Mission Neutralized' : (currentStatus === 'in_progress' ? 'Recovery in Progress' : `${report.severity} Priority`)}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: isResolved ? '#94A3B8' : 'white' }}>{report.title || 'Mission Record'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            <MapPin size={16} /> {report.location_name || 'Grid Coordinates Locked'}
          </div>
        </div>

        <div style={{ 
          background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', fontSize: '14px', 
          color: '#CBD5E1', marginBottom: '24px', borderLeft: `2px solid ${isResolved ? 'var(--text-muted)' : (currentStatus === 'in_progress' ? 'var(--electric-blue)' : severity.color)}`
        }}>
          {report.description || 'No additional mission intelligence provided.'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
              <Clock size={14} /> {new Date(report.created_at).toLocaleTimeString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              ID: #{report.id.slice(0, 8)} | <span style={{ color: 'var(--electric-blue)' }}>{currentStatus.toUpperCase()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ 
              padding: '4px 10px', background: 'rgba(41, 121, 255, 0.1)', border: '1px solid rgba(41, 121, 255, 0.2)', 
              borderRadius: '6px', fontSize: '10px', color: 'var(--electric-blue)', fontWeight: 800, letterSpacing: '0.5px' 
            }}>
              ASSIGNED TO YOU
            </div>
            
            {isResolved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)', fontWeight: 800, fontSize: '14px' }}>
                ✔ Completed
              </div>
            ) : currentStatus === 'assigned' ? (
              <button 
                onClick={() => handleStatusTransition(report.id, 'in_progress')}
                disabled={isUpdating}
                className="btn-neon btn-blue"
                style={{ padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isUpdating ? 'Synchronizing...' : <><Play size={14} /> Start Mission</>}
              </button>
            ) : (
              <button 
                onClick={() => handleStatusTransition(report.id, 'resolved')}
                disabled={isUpdating}
                className="btn-neon btn-sage"
                style={{ padding: '10px 24px', fontSize: '13px', background: 'rgba(0, 200, 83, 0.2)', color: 'var(--neon-green)', border: '1px solid var(--neon-green)' }}
              >
                {isUpdating ? 'Neutralizing...' : 'Mark Resolved'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--deep-void)',
      color: 'white',
      padding: '160px 40px 80px',
      backgroundImage: `radial-gradient(circle at 10% 10%, rgba(41, 121, 255, 0.1), transparent 45%)`
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <button 
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', color: 'var(--electric-blue)', fontWeight: 700, cursor: 'pointer', marginBottom: '16px', padding: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ChevronLeft size={18} /> Exit Terminal
            </button>
            <h1 className="gradient-text" style={{ fontSize: '42px', fontWeight: 900, marginBottom: '12px' }}>Responder Console</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>Active missions for <span style={{ color: 'white', fontWeight: 700 }}>Raj Worker</span> (Unit: Alpha-1)</p>
          </div>
          <div className="glass-card" style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Activity size={20} color="var(--neon-green)" />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--neon-green)', borderRadius: '50%', boxShadow: '0 0 10px var(--neon-green)' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '2px', color: 'var(--neon-green)' }}>SYNC ACTIVE</span>
          </div>
        </div>

        {/* Missions View */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Establishing secure link to mission database...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
            
            {/* Active Missions Section */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                <div style={{ padding: '10px', background: 'rgba(41, 121, 255, 0.1)', borderRadius: '12px', color: 'var(--electric-blue)' }}><Activity size={20} /></div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>Active Missions <span style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 500, marginLeft: '10px' }}>({activeMissions.length})</span></h2>
              </div>
              
              {activeMissions.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Standing by for dispatcher mobilization.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '24px' }}>
                  {activeMissions.map(report => (
                    <MissionCardRow key={report.id} report={report} isResolved={report.status === 'resolved'} />
                  ))}
                </div>
              )}
            </section>

            {/* Completed Operations Section */}
            {completedMissions.length > 0 && (
              <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '60px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                  <div style={{ padding: '10px', background: 'rgba(0, 200, 83, 0.1)', borderRadius: '12px', color: 'var(--neon-green)' }}><CheckCircle size={20} /></div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>Completed Operations <span style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 500, marginLeft: '10px' }}>({completedMissions.length})</span></h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '24px', opacity: 0.7 }}>
                  {completedMissions.map(report => (
                    <MissionCardRow key={report.id} report={report} isResolved={true} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <style>{`
        .mission-transition {
          transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default WorkerDashboard;
