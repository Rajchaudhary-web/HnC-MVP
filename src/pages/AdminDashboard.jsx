import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Users, MessageSquare, Settings, TrendingUp, AlertTriangle, CheckCircle, Clock, Mail, User, Calendar, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, updateReportStatus } from '../lib/supabaseClient';

const StatCard = ({ icon: Icon, label, value, color }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const isNumeric = !isNaN(parseFloat(value)) && isFinite(value);

  useEffect(() => {
    if (!isNumeric) return;

    const end = parseFloat(value);
    const duration = 1000; // 1 second for smoother feel
    const incrementTime = 16;
    const steps = duration / incrementTime;
    const stepValue = end / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, isNumeric]);

  return (
    <div className="glass-card dashboard-card depth-card" style={{
      padding: '24px',
      flex: '1',
      background: 'linear-gradient(165deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.07)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* REFLECTIVE GLASS EFFECT */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.03) 50%, transparent 55%)',
        animation: 'shine 10s infinite linear',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '14px',
          background: `linear-gradient(135deg, ${color}33, ${color}11)`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 16px ${color}22, inset 0 2px 4px rgba(255,255,255,0.1)`,
          border: `1px solid ${color}44`
        }}>
          <Icon size={22} />
        </div>
        <div style={{
          padding: '4px 10px',
          borderRadius: '8px',
          background: 'rgba(0, 255, 200, 0.05)',
          color: 'var(--neon-green)',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.5px',
          textShadow: '0 0 10px rgba(0, 255, 200, 0.4)',
          border: '1px solid rgba(0, 255, 200, 0.1)'
        }}>+12.5%</div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
        <div style={{
          fontSize: '32px',
          fontWeight: 900,
          letterSpacing: '-1.5px',
          color: 'white',
          textShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px'
        }}>
          {isNumeric ? displayValue : value}
          {isNumeric && <span style={{ fontSize: '14px', opacity: 0.5 }}>.00</span>}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [workers, setWorkers] = useState([]);

  const fetchReports = async () => {
    try {
      if (reports.length === 0) setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(prev => {
        const newData = Array.isArray(data) ? data : [];
        // Stabilize UI by preventing redundant state updates if data is identical
        if (
          prev.length === newData.length &&
          prev.every((item, i) => item.id === newData[i]?.id)
        ) {
          return prev;
        }
        return newData;
      });
    } catch (err) {
      console.log('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLeads = async () => {
    try {
      setLeadsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*');

      if (error) {
        console.error('Worker fetch error:', error);
        return;
      }

      console.log('Workers fetched:', data);

      setWorkers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching workers:', err);
    }
  };

  useEffect(() => {
    // initial load
    fetchReports();
    getLeads();
    fetchWorkers();

    // realtime subscription for instant situational awareness
    const channel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // listens to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          console.log('Realtime event Manifested:', payload);
          fetchReports(); // refresh instantly on ground-truth mutation
        }
      )
      .subscribe();

    // cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    console.log("Workers FINAL state:", workers);
  }, [workers]);

  const markResolved = async (id) => {
    try {
      await updateReportStatus(id, 'resolved');
      fetchReports();
    } catch (err) {
      console.log('Update failed:', err);
    }
  };

  const assignWorker = async (reportId, workerId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          assigned_to: workerId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;
      fetchReports();
    } catch (err) {
      console.log('Assignment failed:', err);
    }
  };

  const startWork = async (id) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'in_progress' })
        .eq('id', id);
      if (error) throw error;
      fetchReports();
    } catch (err) {
      console.log('Start work failed:', err);
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffInMinutes = Math.floor((now - created) / 60000);

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return created.toLocaleDateString();
  };

  const getSeverityStyles = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return { text: 'Critical', color: 'var(--coral)' };
      case 'medium': return { text: 'Moderate', color: 'var(--orange)' };
      case 'low': return { text: 'Routine', color: 'var(--sage)' };
      default: return { text: 'Unknown', color: '#888' };
    }
  };



  const activeReports = useMemo(() => {
    return reports.filter(r => r.status !== 'resolved');
  }, [reports]);

  const reportsWithPriority = useMemo(() => {
    return activeReports.map(report => {
      let score = 0;

      // severity weight
      if (report.severity === 'high') score += 3;
      else if (report.severity === 'medium') score += 2;
      else score += 1;

      // time weight (older = higher priority)
      const created = new Date(report.created_at);
      const now = new Date();
      const diffHours = (now - created) / (1000 * 60 * 60);

      if (diffHours > 6) score += 2;

      return { ...report, priorityScore: score };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [activeReports]);

  const getPriorityLabel = (score) => {
    if (score >= 4) return { text: 'CRITICAL', color: 'var(--coral-red)', glow: '0 0 15px rgba(255, 82, 82, 0.4)' };
    if (score >= 3) return { text: 'URGENT', color: 'var(--vibrant-orange)', glow: '0 0 15px rgba(255, 109, 0, 0.4)' };
    return { text: 'ROUTINE', color: 'var(--sage)', glow: 'none' };
  };

  const workerLoad = useMemo(() => {
    return workers.map(worker => ({
      ...worker,
      activeTasks: reports.filter(r => r.assigned_to === worker.id && r.status !== 'resolved').length
    }));

  }, [workers, reports]);

  const bestWorker = useMemo(() => {
    if (!workerLoad || workerLoad.length === 0) return null;
    return workerLoad.reduce((prev, curr) =>
      curr.activeTasks < prev.activeTasks ? curr : prev
    );
  }, [workerLoad]);

  useEffect(() => {
    console.log("Worker Load Stable:", workerLoad);
    console.log("Best Worker:", bestWorker?.name);
  }, [workerLoad, bestWorker]);

  const getWorkerBadgeStyle = (status) => {
    switch (status) {
      case 'assigned': return { color: 'var(--electric-blue)', label: 'Assigned' };
      case 'in_progress': return { color: 'var(--orange)', label: 'In Progress' };
      case 'resolved': return { color: 'var(--neon-green)', label: 'Resolved' };
      default: return { color: '#94A3B8', label: 'Unassigned' };
    }
  };
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      overflowX: 'hidden',
      background: '#000000',
      backgroundImage: `
        radial-gradient(circle at 10% 10%, rgba(0, 210, 255, 0.15), transparent 45%),
        radial-gradient(circle at 90% 15%, rgba(140, 90, 255, 0.12), transparent 45%),
        radial-gradient(circle at 50% 100%, rgba(20, 190, 160, 0.1), transparent 50%),
        radial-gradient(circle at 85% 70%, rgba(240, 70, 150, 0.07), transparent 40%)
      `,
      animation: 'drift 20s infinite alternate ease-in-out',
      color: 'white',
      position: 'relative'
    }}>
      <style>{`
        .dashboard-main::-webkit-scrollbar {
          width: 6px;
        }
        .dashboard-main::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .dashboard-main::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .dashboard-main::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        @keyframes drift {
          0% { background-position: 0% 0%; }
          100% { background-position: 5% 5%; }
        }
        @keyframes shine {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .dashboard-card {
          backdrop-filter: blur(30px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.6),
            inset 0 1px 1px rgba(255, 255, 255, 0.1) !important;
          transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
        }
        .dashboard-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 30px 60px rgba(0, 0, 0, 0.8),
            inset 0 1px 2px rgba(255, 255, 255, 0.2) !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }

        .sidebar-item {
          transition: all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67);
          position: relative;
          padding: 14px 18px !important;
        }
        .sidebar-item:hover:not(.active) {
          background: rgba(255, 255, 255, 0.05) !important;
          box-shadow: inset 0 0 10px rgba(255,255,255,0.02);
          transform: translateX(8px);
        }
        .sidebar-item.active {
          background: linear-gradient(90deg, rgba(0, 255, 200, 0.15) 0%, transparent 100%) !important;
          box-shadow: inset 5px 0 15px rgba(0, 255, 200, 0.08);
        }
        .sidebar-item.active::after {
          height: 70% !important;
          width: 4px !important;
          box-shadow: 0 0 20px var(--teal), 0 0 40px var(--teal) !important;
        }

        .report-row {
          transition: all 0.3s ease;
          animation: fadeIn 0.5s ease forwards;
        }
        .report-row:hover {
          background: rgba(255, 255, 255, 0.07) !important;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-glow {
          0% { box-shadow: 0 0 5px rgba(0, 255, 200, 0.2); }
          50% { box-shadow: 0 0 20px rgba(0, 255, 200, 0.4); }
          100% { box-shadow: 0 0 5px rgba(0, 255, 200, 0.2); }
        }

        .pulse-active {
          animation: pulse-glow 2s infinite ease-in-out;
        }


        .lead-card {
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          background: linear-gradient(145deg, rgba(20, 20, 25, 0.8), rgba(10, 10, 15, 0.9)) !important;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.05) !important;
        }
        .lead-card:hover {
          transform: translateY(-6px) scale(1.02);
          border-color: rgba(0, 255, 200, 0.2) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255,255,255,0.1) !important;
        }

        .action-btn {
          padding: 10px 16px !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          cursor: pointer !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(8px) !important;
          transition: all 0.25s ease !important;
          outline: none !important;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .action-btn:hover {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .btn-blue-glow {
          color: var(--electric-blue) !important;
          box-shadow: 0 0 12px rgba(41, 121, 255, 0.2);
          background: rgba(41, 121, 255, 0.05) !important;
          border-color: rgba(41, 121, 255, 0.2) !important;
        }
        .btn-blue-glow:hover {
          box-shadow: 0 0 20px rgba(41, 121, 255, 0.4);
          border-color: var(--electric-blue) !important;
        }
        .btn-green-glow {
          color: var(--neon-green) !important;
          box-shadow: 0 0 12px rgba(0, 200, 83, 0.2);
          background: rgba(0, 200, 83, 0.05) !important;
          border-color: rgba(0, 200, 83, 0.2) !important;
        }
        .btn-green-glow:hover {
          box-shadow: 0 0 20px rgba(0, 200, 83, 0.4);
          border-color: var(--neon-green) !important;
        }
        .action-select {
          position: relative !important;
          z-index: 10 !important;
          pointer-events: auto !important;
          padding: 10px !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          background: rgba(0, 0, 0, 0.6) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          width: 140px !important;
          cursor: pointer !important;
          outline: none !important;
          transition: all 0.25s ease !important;
        }
        .action-select:hover {
          border-color: var(--electric-blue) !important;
          background: rgba(0, 0, 0, 0.8) !important;
          box-shadow: 0 0 15px rgba(41, 121, 255, 0.2);
        }

        @keyframes zone-critical-pulse {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 82, 82, 0.3); }
          50% { transform: scale(1.02); box-shadow: 0 0 40px rgba(255, 82, 82, 0.6); border-color: rgba(255, 82, 82, 0.6); }
          100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 82, 82, 0.3); }
        }

        .zone-critical {
          animation: zone-critical-pulse 2s infinite ease-in-out;
          border-color: rgba(255, 82, 82, 0.4) !important;
        }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: '240px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'rgba(2, 6, 23, 0.8)',
        backdropFilter: 'blur(40px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '10px 0 50px rgba(0,0,0,0.5)',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 50
      }}>
        {[
          { label: 'Dashboard', icon: LayoutDashboard, route: '/admin' },
          { label: 'Resolved Issues', icon: CheckCircle, route: '/resolved' },
          { label: 'Incoming Reports', icon: AlertTriangle, route: '#' },
          { label: 'Analytics', icon: TrendingUp, route: '#' },
          { label: 'Teams', icon: Users, route: '#' },
          { label: 'Messages', icon: MessageSquare, route: '#' },
          { label: 'Settings', icon: Settings, route: '#' },
        ].map((item) => (
          <div 
            key={item.label} 
            className={`sidebar-item ${location.pathname === item.route ? 'active' : ''}`} 
            onClick={() => item.route !== '#' && navigate(item.route)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 15px',
              borderRadius: '12px',
              cursor: item.route !== '#' ? 'pointer' : 'default',
              color: location.pathname === item.route ? 'var(--teal)' : '#94A3B8',
              fontWeight: location.pathname === item.route ? 600 : 400,
              opacity: item.route === '#' ? 0.6 : 1
            }}>
            <item.icon size={20} />
            {item.label}
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <main className="dashboard-main" style={{ flex: 1, padding: '30px', overflowY: 'auto', overflowX: 'hidden', height: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '10px' }}>
          <div>
            <button
              onClick={() => navigate('/')}
              style={{
                marginBottom: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'var(--teal)',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.03)'}
            >
              <ChevronLeft size={16} /> Back to Neural Grid
            </button>
            <h1 className="gradient-text" style={{ fontSize: '28px', fontWeight: 900, marginBottom: '5px', letterSpacing: '-1px' }}>Municipal Overview</h1>
            <p style={{ color: '#94A3B8', fontWeight: 600, fontSize: '14px' }}>Real-time sewage systems orchestration status</p>
          </div>
          <button className="btn btn-secondary" style={{ backdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}>Download OS Report</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <StatCard icon={AlertTriangle} label="Active Issues" value={activeReports.length} color="var(--coral)" />
          <StatCard icon={CheckCircle} label="Resolved Today" value={reports.filter(r => r.status === 'resolved').length} color="var(--sage)" />
          <StatCard icon={Clock} label="Avg Response Time" value="18.5m" color="var(--orange)" />
          <StatCard icon={TrendingUp} label="High-Risk Zones" value="3" color="var(--teal)" />
        </div>

        {/* Middle Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '40px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '40px', alignItems: 'start' }}>
          <div className="glass-card dashboard-card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ letterSpacing: '0.5px', margin: 0 }}>Recent Reports</h3>
              <div style={{
                fontSize: '12px',
                color: 'var(--teal)',
                fontWeight: 700,
                padding: '4px 10px',
                background: 'rgba(0, 255, 200, 0.05)',
                borderRadius: '6px',
                border: '1px solid rgba(0, 255, 200, 0.1)'
              }}>
                Workers Loaded: {workers.length}
                <span style={{ marginLeft: '10px', opacity: 0.5, fontSize: '10px' }}>SYSTEM: LOAD TRACKING ACTIVE</span>
              </div>
            </div>
            <div style={{ color: 'red', marginBottom: '10px', fontSize: '13px', fontWeight: 800 }}>
              Reports Count: {reports.length}
            </div>
            {console.log("Reports in State:", reports)}
            {loading ? (
              <div style={{ padding: '20px', color: '#94A3B8' }}>Loading reports...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#94A3B8', fontSize: '13px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <th style={{ padding: '0 15px 10px', fontWeight: 600 }}>Location</th>
                    <th style={{ padding: '0 15px 10px', fontWeight: 600 }}>Priority</th>
                    <th style={{ padding: '0 15px 10px', fontWeight: 600 }}>Severity</th>
                    <th style={{ padding: '0 15px 10px', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '0 15px 10px', fontWeight: 600 }}>Worker</th>
                    <th style={{ padding: '0 15px 10px', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsWithPriority.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontStyle: 'italic', fontSize: '15px' }}>
                        All urban systems are currently stable. No active issues 🚀
                      </td>
                    </tr>
                  ) : (
                    reportsWithPriority.map((report) => {
                      const sevStyle = getSeverityStyles(report.severity);
                      const prioStyle = getPriorityLabel(report.priorityScore);
                      const assignedWorker = workers.find(w => w.id === report.assigned_to);

                      return (
                        <tr key={report.id} className="report-row" style={{ 
                          background: 'rgba(15, 23, 42, 0.6)', 
                          borderRadius: '12px',
                          boxShadow: report.status !== 'resolved' ? prioStyle.glow : 'none',
                          border: report.status !== 'resolved' && report.priorityScore >= 4 ? '1px solid rgba(255, 82, 82, 0.2)' : 'none'
                        }}>
                          <td style={{ padding: '15px', fontWeight: 600, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                            {report.location_name || report.area || 'Unknown'}
                          </td>
                          <td style={{ padding: '15px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 900,
                              letterSpacing: '1px',
                              color: prioStyle.color,
                              background: `${prioStyle.color}15`,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${prioStyle.color}30`
                            }}>{prioStyle.text}</span>
                          </td>
                          <td style={{ padding: '15px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: `${sevStyle.color}1A`,
                              color: sevStyle.color,
                              border: `1px solid ${sevStyle.color}33`,
                              boxShadow: `0 0 10px ${sevStyle.color}22`
                            }}>{sevStyle.text}</span>
                          </td>
                          <td style={{ padding: '15px', color: '#94A3B8', fontSize: '13px' }}>{getTimeAgo(report.created_at)}</td>
                          <td style={{ padding: '15px' }}>
                            {assignedWorker ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{assignedWorker.name}</span>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  color: getWorkerBadgeStyle(report.status).color,
                                  background: `${getWorkerBadgeStyle(report.status).color}15`,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${getWorkerBadgeStyle(report.status).color}30`,
                                  width: 'fit-content'
                                }}>
                                  {getWorkerBadgeStyle(report.status).label}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#64748B', fontStyle: 'italic', fontSize: '13px' }}>Dispatcher Pending</span>
                            )}
                          </td>
                          <td style={{ padding: '15px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', position: 'relative', zIndex: 1 }}>
                            {report.status === 'reported' && (
                              <select
                                value=""
                                style={{
                                  padding: '12px 16px',
                                  borderRadius: '10px',
                                  fontSize: '13px',
                                  background: 'rgba(15, 23, 42, 0.9)',
                                  color: '#fff',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  width: '200px',
                                  cursor: 'pointer',
                                  opacity: workers.length === 0 ? 0.8 : 1,
                                  outline: 'none',

                                  // critical fixes
                                  appearance: 'auto',
                                  WebkitAppearance: 'auto',
                                  MozAppearance: 'auto',

                                  pointerEvents: 'auto',
                                  position: 'relative',
                                  zIndex: 100,
                                  userSelect: 'none',
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseOver={(e) => e.target.style.boxShadow = '0 0 15px rgba(0, 255, 200, 0.2)'}
                                onMouseOut={(e) => e.target.style.boxShadow = 'none'}
                                onChange={(e) => {
                                  const workerId = e.target.value;
                                  if (!workerId) return;
                                  console.log("Assigning Worker ID:", workerId, "to Report:", report.id);
                                  assignWorker(report.id, workerId);
                                }}
                              >
                                <option value="">
                                  {workers.length === 0 ? "No workers available" : "Assign Optimal Worker"}
                                </option>
                                {Array.isArray(workerLoad) && workerLoad.length > 0 ? (
                                  workerLoad.map(worker => (
                                    <option
                                      key={worker.id}
                                      value={worker.id}
                                      disabled={worker.activeTasks >= 3}
                                      style={{ background: '#0f172a' }}
                                    >
                                      {worker.name} ({worker.activeTasks} active) {bestWorker && worker.id === bestWorker.id ? " ⭐ Recommended" : ""} {worker.activeTasks >= 3 ? '— BUSY' : ''}
                                    </option>
                                  ))
                                ) : null}
                              </select>
                            )}

                            {report.status === 'assigned' && (
                              <button onClick={() => startWork(report.id)} className="action-btn btn-blue-glow">
                                Start Work
                              </button>
                            )}

                            {report.status === 'in_progress' && (
                              <button onClick={() => markResolved(report.id)} className="action-btn btn-green-glow">
                                Mark Resolved
                              </button>
                            )}

                            {report.status === 'resolved' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--sage)', fontWeight: 800, fontSize: '13px', opacity: 0.6, padding: '10px' }}>
                                <CheckCircle size={16} /> Operational
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="glass-card dashboard-card" style={{ padding: '30px' }}>
            <h3 style={{ marginBottom: '20px', letterSpacing: '0.5px' }}>Response Trends</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {[
                { label: 'Morning Peak', val: 85 },
                { label: 'Afternoon', val: 45 },
                { label: 'Evening', val: 65 }
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ color: '#94A3B8', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{item.val}% efficiency</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{
                      width: `${item.val}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--teal), var(--electric-blue))',
                      borderRadius: '4px',
                      boxShadow: '0 0 10px rgba(0, 255, 200, 0.3)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo Requests Section */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '40px', marginBottom: '40px' }}>
          <div className="glass-card dashboard-card" style={{ padding: '30px' }}>
            <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.5px' }}>
              <MessageSquare size={20} color="var(--teal)" /> Incoming Demo Requests
            </h3>

            {leadsLoading ? (
              <div style={{ padding: '20px', color: '#94A3B8' }}>Loading requests...</div>
            ) : leads.length === 0 ? (
              <div style={{ padding: '20px', color: '#94A3B8', textAlign: 'center' }}>No demo requests yet</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {leads.map((lead) => (
                  <div key={lead.id} className="lead-card" style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    padding: '25px',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--teal)', fontWeight: 700, fontSize: '15px' }}>
                        <User size={16} /> {lead.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Calendar size={12} /> {getTimeAgo(lead.created_at)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '13px' }}>
                      <Mail size={14} /> {lead.email}
                    </div>

                    <div style={{
                      padding: '15px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      color: '#CBD5E1',
                      lineHeight: '1.6',
                      fontStyle: 'italic',
                      borderLeft: '2px solid var(--teal)'
                    }}>
                      "{lead.message}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


      </main>
    </div>
  );
};

export default AdminDashboard;
