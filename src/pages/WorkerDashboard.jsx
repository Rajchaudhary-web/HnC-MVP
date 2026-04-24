import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Clock, MapPin, ChevronLeft, Activity, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, updateReportStatus } from '../lib/supabaseClient';

const WorkerDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [transitioningIds, setTransitioningIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'all'
  const [allWorkers, setAllWorkers] = useState([]);
  const [workerStats, setWorkerStats] = useState([]);
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

  const fetchAllWorkersWithStats = async () => {
    try {
      const { data: workers, error } = await supabase
        .from('workers')
        .select('*');

      if (error) throw error;

      const workerData = await Promise.all(
        workers.map(async (worker) => {
          const { data: tasks } = await supabase
            .from('reports')
            .select('id, status')
            .eq('assigned_to', worker.id)
            .in('status', ['assigned', 'in_progress']);

          const taskCount = tasks?.length || 0;

          let workloadStatus = 'available';
          if (taskCount >= 3) workloadStatus = 'busy';
          else if (taskCount > 0) workloadStatus = 'working';

          return {
            ...worker,
            taskCount,
            workloadStatus
          };
        })
      );

      setAllWorkers(workerData);
      setWorkerStats(workerData);
    } catch (err) {
      console.error('Worker stats fetch error:', err);
    }
  };

  useEffect(() => {
    fetchAssignedReports();
    fetchAllWorkersWithStats();

    // Real-time synchronization
    const channel = supabase
      .channel('worker-assignments')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports', 
        filter: `assigned_to=eq.${currentWorkerId}` 
      }, (payload) => {
        fetchAssignedReports();
        fetchAllWorkersWithStats(); // Also refresh stats on changes
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

  // --- HELPER: SLA COUNTDOWN ---
  const getTimeLeft = (eta) => {
    if (!eta) return null;

    const now = Date.now();
    const diff = eta - now;

    if (diff <= 0) return "OVERDUE";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m left`;
  };

  /* --- SUBCOMPONENT: MISSION CARD --- */
  const MissionCardRow = ({ report, isResolved }) => {
    const severity = getSeverityStyle(report.severity);
    const isUpdating = actionId === report.id;
    const currentStatus = report.status || 'reported';
    const isOverdue = report.eta && report.eta < Date.now() && !isResolved;

    return (
      <div 
        className="glass-card mission-transition" 
        style={{ 
          padding: '32px', 
          position: 'relative', 
          overflow: 'hidden',
          boxShadow: isOverdue ? '0 0 20px rgba(255, 82, 82, 0.25)' : undefined,
          border: isOverdue ? '1px solid rgba(255, 82, 82, 0.4)' : '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* Severity Accent Strip */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background:
            report.severity === 'high'
              ? 'var(--coral-red)'
              : report.severity === 'medium'
              ? 'var(--vibrant-orange)'
              : 'var(--neon-green)',
          opacity: isResolved ? 0.3 : 1
        }} />

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
          <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: isResolved ? 'var(--text-muted)' : 'var(--text-primary)' }}>{report.title || 'Mission Record'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
            <MapPin size={16} /> {report.location_name || 'Grid Coordinates Locked'}
          </div>
        </div>

        <div style={{ 
          background: 'rgba(15, 23, 42, 0.08)', padding: '16px', borderRadius: '12px', fontSize: '14px', 
          color: 'var(--text-primary)', marginBottom: '24px', borderLeft: `2px solid ${isResolved ? 'var(--text-muted)' : (currentStatus === 'in_progress' ? 'var(--electric-blue)' : severity.color)}`
        }}>
          {report.description || 'No additional mission intelligence provided.'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
              <Clock size={14} /> 
              <span style={{
                color: report.eta && report.eta < Date.now()
                  ? 'var(--coral-red)'
                  : (report.eta ? 'var(--electric-blue)' : 'inherit'),
                fontWeight: report.eta ? 800 : 600
              }}>
                {getTimeLeft(report.eta) || new Date(report.created_at).toLocaleTimeString()}
              </span>
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

  if (viewMode === 'all') {
    const total = workerStats.length;
    const available = workerStats.filter(w => w.workloadStatus === 'available').length;
    const working = workerStats.filter(w => w.workloadStatus === 'working').length;
    const busy = workerStats.filter(w => w.workloadStatus === 'busy').length;

    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--bg-primary)', 
        padding: '160px 40px', 
        color: 'var(--text-primary)',
        backgroundImage: `radial-gradient(circle at 10% 10%, rgba(41, 121, 255, 0.1), transparent 45%)`
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button 
            onClick={() => setViewMode('single')}
            style={{ background: 'none', border: 'none', color: 'var(--electric-blue)', fontWeight: 700, cursor: 'pointer', marginBottom: '16px', padding: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ChevronLeft size={18} /> Back to Terminal
          </button>
          
          <h1 className="gradient-text" style={{ fontSize: '48px', fontWeight: 900, marginBottom: '10px' }}>
            Workforce Control Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '18px', marginBottom: '40px' }}>Real-time coordination of autonomous urban responders</p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
            <button 
              onClick={() => setViewMode('single')}
              className="btn-neon"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}
            >
              Single Worker
            </button>
            <button 
              onClick={() => setViewMode('all')}
              className="btn-neon"
              style={{ background: 'rgba(41, 121, 255, 0.2)', border: '1px solid var(--electric-blue)' }}
            >
              All Workers
            </button>
          </div>

          {/* Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '60px' }}>
            <div className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 800, letterSpacing: '2px', marginBottom: '10px' }}>TOTAL UNITS</div>
              <div style={{ fontSize: '36px', fontWeight: 900 }}>{total}</div>
            </div>
            <div className="glass-card" style={{ padding: '30px', textAlign: 'center', borderBottom: '4px solid var(--neon-green)' }}>
              <div style={{ color: 'var(--neon-green)', fontSize: '13px', fontWeight: 800, letterSpacing: '2px', marginBottom: '10px' }}>AVAILABLE</div>
              <div style={{ fontSize: '36px', fontWeight: 900 }}>{available}</div>
            </div>
            <div className="glass-card" style={{ padding: '30px', textAlign: 'center', borderBottom: '4px solid var(--electric-blue)' }}>
              <div style={{ color: 'var(--electric-blue)', fontSize: '13px', fontWeight: 800, letterSpacing: '2px', marginBottom: '10px' }}>WORKING</div>
              <div style={{ fontSize: '36px', fontWeight: 900 }}>{working}</div>
            </div>
            <div className="glass-card" style={{ padding: '30px', textAlign: 'center', borderBottom: '4px solid var(--coral-red)' }}>
              <div style={{ color: 'var(--coral-red)', fontSize: '13px', fontWeight: 800, letterSpacing: '2px', marginBottom: '10px' }}>BUSY</div>
              <div style={{ fontSize: '36px', fontWeight: 900 }}>{busy}</div>
            </div>
          </div>

          {/* Worker Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {workerStats.map(worker => (
              <div key={worker.id} className="glass-card premium-hover" style={{ padding: '30px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{worker.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '1px' }}>UNIT ID: {worker.id.slice(0, 8)}</p>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '1px',
                    background: worker.workloadStatus === 'available' ? 'rgba(0, 200, 83, 0.1)' : worker.workloadStatus === 'working' ? 'rgba(41, 121, 255, 0.1)' : 'rgba(255, 82, 82, 0.1)',
                    color: worker.workloadStatus === 'available' ? 'var(--neon-green)' : worker.workloadStatus === 'working' ? 'var(--electric-blue)' : 'var(--coral-red)',
                    border: `1px solid ${worker.workloadStatus === 'available' ? 'rgba(0,200,83,0.3)' : worker.workloadStatus === 'working' ? 'rgba(41,121,255,0.3)' : 'rgba(255,82,82,0.3)'}`
                  }}>
                    {worker.workloadStatus.toUpperCase()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Load Balance</span>
                      <span style={{ fontWeight: 800 }}>{worker.taskCount} / 3 Tasks</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${Math.min((worker.taskCount / 3) * 100, 100)}%`, 
                        height: '100%', 
                        background: worker.workloadStatus === 'available' ? 'var(--neon-green)' : worker.workloadStatus === 'working' ? 'var(--electric-blue)' : 'var(--coral-red)',
                        transition: 'width 1s ease'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
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
            <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>Active missions for <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Raj Worker</span> (Unit: Alpha-1)</p>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button 
                onClick={() => setViewMode('single')}
                className="btn-neon"
                style={{ 
                  background: viewMode === 'single' ? 'rgba(41, 121, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: viewMode === 'single' ? '1px solid var(--electric-blue)' : '1px solid var(--border-color)'
                }}
              >
                Single Worker
              </button>

              <button 
                onClick={() => setViewMode('all')}
                className="btn-neon"
                style={{ 
                  background: viewMode === 'all' ? 'rgba(41, 121, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: viewMode === 'all' ? '1px solid var(--electric-blue)' : '1px solid var(--border-color)'
                }}
              >
                All Workers
              </button>
            </div>
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
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Establishing secure link to mission database...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
            
            {/* Critical Issues Section */}
            {reports.filter(r => r.eta && r.eta < Date.now() && r.status !== 'resolved').length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                  <div style={{ padding: '10px', background: 'rgba(255, 82, 82, 0.1)', borderRadius: '12px', color: 'var(--coral-red)' }}><AlertTriangle size={20} /></div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--coral-red)' }}>⚠️ Critical Alerts <span style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 500, marginLeft: '10px' }}>({reports.filter(r => r.eta && r.eta < Date.now() && r.status !== 'resolved').length})</span></h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '24px' }}>
                  {reports.filter(r => r.eta && r.eta < Date.now() && r.status !== 'resolved').map(report => (
                    <MissionCardRow key={report.id} report={report} isResolved={false} />
                  ))}
                </div>
              </section>
            )}

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
