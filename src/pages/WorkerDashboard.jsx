import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, Clock, MapPin, ChevronLeft, Activity, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, updateReportStatus, assignAllUnassignedReports } from '../lib/supabaseClient';

const WorkerDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [transitioningIds, setTransitioningIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'all'
  const [selectedWorkerId, setSelectedWorkerId] = useState("80088469-b24f-4d94-bf03-a2c9d6cc346b");
  const [allWorkers, setAllWorkers] = useState([]);
  const [workerStats, setWorkerStats] = useState([]);
  const [assigningIds, setAssigningIds] = useState(new Set());
  const [proofImage, setProofImage] = useState(null);
  const fetchTimeoutRef = useRef(null);
  const navigate = useNavigate();


  const fetchAssignedReports = async () => {
    try {
      if (reports.length === 0) setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('assigned_to', selectedWorkerId)
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
      .channel(`worker-assignments-${selectedWorkerId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports', 
        filter: `assigned_to=eq.${selectedWorkerId}` 
      }, (payload) => {
        // If a new report is inserted, show a subtle "Assigning..." state
        if (payload.eventType === 'INSERT') {
          const reportId = payload.new.id;
          setAssigningIds(prev => new Set(prev).add(reportId));
          
          // Clear after a realistic orchestration delay
          setTimeout(() => {
            setAssigningIds(prev => {
              const next = new Set(prev);
              next.delete(reportId);
              return next;
            });
          }, 800);
        }

        // Debounce frequent database triggers to prevent HUD flickering
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => {
          fetchAssignedReports();
          fetchAllWorkersWithStats();
        }, 400); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [selectedWorkerId]);

  const uploadProofImage = async (file) => {
    try {
      const fileName = `proof_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('reports')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    } catch (err) {
      console.error("Storage Upload Failure:", err);
      return null;
    }
  };

  const handleStatusTransition = async (id, nextStatus) => {
    try {
      console.log("Updating Mission:", id, "->", nextStatus);
      setActionId(id);
      
      let imageUrl = null;
      if (nextStatus === 'resolved') {
        if (proofImage) {
          imageUrl = await uploadProofImage(proofImage);
        }

        const { error } = await supabase
          .from('reports')
          .update({
            status: 'resolved',
            proof_image_url: imageUrl
          })
          .eq('id', id);
        
        if (error) throw error;
        setProofImage(null);
        await assignAllUnassignedReports();
      } else {
        await updateReportStatus(id, nextStatus);
      }
      
      // Ensure UI reflects latest ground-truth immediately after update
      await fetchAssignedReports();

      if (nextStatus === 'resolved') {
        // Initiate temporal transition delay for resolved missions
        setTransitioningIds(prev => new Set(prev).add(id));
        
        setTimeout(() => {
          setTransitioningIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 2500);
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
  const getTimeLeft = (report) => {
    const { eta, created_at } = report;
    if (!eta || !created_at) return null;

    const startTime = new Date(created_at).getTime();
    const deadlineTime = startTime + (eta * 60 * 1000);
    const now = Date.now();
    const diff = deadlineTime - now;

    if (diff <= 0) return "OVERDUE";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m left`;
  };

  /* --- SUBCOMPONENT: MISSION CARD --- */
  const MissionCardRow = ({ report, isResolved, isAssigning }) => {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isResolved ? 'var(--text-muted)' : 'var(--neon-green)', fontWeight: 700, fontSize: '15px' }}>
            <MapPin size={18} /> {report.location_name || 'Grid Coordinates Locked'}
          </div>
        </div>

        {report.image_url && (
          <img 
            src={report.image_url} 
            alt="Operational Intelligence" 
            style={{ width: '100%', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} 
          />
        )}

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
                color: isOverdue
                  ? 'var(--coral-red)'
                  : (report.eta ? 'var(--electric-blue)' : 'inherit'),
                fontWeight: report.eta ? 800 : 600
              }}>
                {getTimeLeft(report) || new Date(report.created_at).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              ID: #{report.id.slice(0, 8)} | <span style={{ color: 'var(--electric-blue)' }}>{currentStatus.toUpperCase()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {isResolved ? (
              <div style={{ fontSize: '10px', color: 'var(--neon-green)', background: 'rgba(0, 200, 83, 0.1)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>COMPLETED</div>
            ) : isAssigning ? (
              <div style={{ fontSize: '12px', color: 'var(--electric-blue)', fontWeight: 800, animation: 'pulse 1s infinite' }}>Assigning...</div>
            ) : (
              <div style={{ fontSize: '10px', color: 'var(--electric-blue)', background: 'rgba(41, 121, 255, 0.1)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>ASSIGNED</div>
            )}
            
            {isResolved ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '4px', textAlign: 'right' }}>
                <div style={{ color: 'var(--neon-green)', fontWeight: 800, fontSize: '14px', width: '100%' }}>✔ Completed</div>
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
            ) : currentStatus === 'in_progress' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evidence Capture (Required for neutralization)</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setProofImage(e.target.files[0])}
                    style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      width: '200px'
                    }}
                  />
                  {proofImage && <div style={{ fontSize: '10px', color: 'var(--neon-green)', fontWeight: 800 }}>⚡ Evidence Locked: {proofImage.name}</div>}
                </div>
                <button 
                  onClick={() => handleStatusTransition(report.id, 'resolved')}
                  disabled={isUpdating}
                  className="btn-neon btn-sage"
                  style={{ padding: '10px 24px', fontSize: '13px', background: 'rgba(0, 200, 83, 0.2)', color: 'var(--neon-green)', border: '1px solid var(--neon-green)' }}
                >
                  {isUpdating ? 'Neutralizing...' : 'Mark Resolved'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: 'var(--electric-blue)', background: 'rgba(41, 121, 255, 0.1)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>ASSIGNED</div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>Active missions for </p>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(41, 121, 255, 0.3)',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  color: 'var(--electric-blue)',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                {allWorkers.map(w => (
                  <option key={w.id} value={w.id} style={{ background: '#0F172A', color: 'white' }}>
                    {w.name} {w.id === "80088469-b24f-4d94-bf03-a2c9d6cc346b" ? "(Primary Unit)" : ""}
                  </option>
                ))}
              </select>
            </div>
            
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
            {reports.filter(r => r.eta && (new Date(r.created_at).getTime() + (r.eta * 60 * 1000)) < Date.now() && r.status !== 'resolved').length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                  <div style={{ padding: '10px', background: 'rgba(255, 82, 82, 0.1)', borderRadius: '12px', color: 'var(--coral-red)' }}><AlertTriangle size={20} /></div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--coral-red)' }}>⚠️ Critical Alerts <span style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 500, marginLeft: '10px' }}>({reports.filter(r => r.eta && (new Date(r.created_at).getTime() + (r.eta * 60 * 1000)) < Date.now() && r.status !== 'resolved').length})</span></h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '24px' }}>
                  {reports.filter(r => r.eta && (new Date(r.created_at).getTime() + (r.eta * 60 * 1000)) < Date.now() && r.status !== 'resolved').map(report => (
                    <MissionCardRow 
                      key={report.id} 
                      report={report} 
                      isResolved={false} 
                      isAssigning={assigningIds.has(report.id)} 
                    />
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
                    <MissionCardRow 
                      key={report.id} 
                      report={report} 
                      isResolved={report.status === 'resolved'} 
                      isAssigning={assigningIds.has(report.id)} 
                    />
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
                    <MissionCardRow 
                      key={report.id} 
                      report={report} 
                      isResolved={true} 
                      isAssigning={assigningIds.has(report.id)} 
                    />
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
