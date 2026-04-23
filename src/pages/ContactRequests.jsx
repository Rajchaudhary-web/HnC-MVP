import React, { useEffect, useState } from 'react';
import { getContactRequests, updateContactStatus } from '../lib/supabaseClient';
import { Mail, User, Clock, CheckCircle, XCircle, ChevronLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContactRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getContactRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id, status) => {
    try {
      console.log("Updating contact request status:", id, status);
      await updateContactStatus(id, status);
      setRequests(prev =>
        prev.map(r =>
          r.id === id ? { ...r, status } : r
        )
      );
    } catch (err) {
      console.error('Status update failed:', err);
      alert('Action failed. Check console for details.');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved': return { color: 'var(--neon-green)', bg: 'rgba(0, 200, 83, 0.1)', icon: CheckCircle };
      case 'rejected': return { color: 'var(--bright-coral)', bg: 'rgba(255, 82, 82, 0.1)', icon: XCircle };
      default: return { color: 'var(--electric-blue)', bg: 'rgba(41, 121, 255, 0.1)', icon: Clock };
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg-primary)', 
      color: 'var(--text-primary)', 
      padding: '40px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <button 
            onClick={() => navigate('/admin')}
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border-color)', 
              padding: '10px', 
              borderRadius: '12px', 
              color: 'var(--text-primary)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '4px' }}>Contact Requests</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Manage community inquiries and neural access dispatches.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '100px' }}>Syncing with ground-truth registry...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {requests?.length > 0 ? (
              requests.map(req => {
                const status = getStatusStyle(req?.status || 'pending');
                const StatusIcon = status.icon;

                return (
                  <div key={req.id} className="glass-card premium-hover" style={{ 
                    padding: '30px', 
                    borderRadius: '24px', 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '12px', 
                          background: 'rgba(255,255,255,0.03)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'var(--electric-blue)'
                        }}>
                          <User size={24} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>{req.full_name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            <Mail size={12} /> {req.email}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '8px 16px', 
                        borderRadius: '50px', 
                        background: status.bg, 
                        color: status.color,
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        <StatusIcon size={14} /> {req.status}
                      </div>
                    </div>

                    <div style={{ 
                      background: 'rgba(15, 23, 42, 0.08)', 
                      padding: '20px', 
                      borderRadius: '16px', 
                      marginBottom: '24px',
                      border: '1px solid rgba(255,255,255,0.03)',
                      color: 'var(--text-primary)',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      display: 'flex',
                      gap: '12px'
                    }}>
                      <MessageSquare size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '4px' }} />
                      {req.message}
                    </div>

                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          onClick={() => handleAction(req.id, 'approved')}
                          className="btn-neon btn-blue"
                          style={{ padding: '12px 32px', fontSize: '14px', flex: 1 }}
                        >
                          Approve Neural Access
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, 'rejected')}
                          style={{ 
                            padding: '12px 32px', 
                            fontSize: '14px', 
                            flex: 1, 
                            background: 'rgba(255, 82, 82, 0.1)', 
                            color: 'var(--bright-coral)', 
                            border: '1px solid rgba(255, 82, 82, 0.2)',
                            borderRadius: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Reject Request
                        </button>
                      </div>
                    )}
                    
                    <div style={{ position: 'absolute', bottom: '15px', right: '30px', fontSize: '10px', color: '#475569', fontWeight: 600 }}>
                      TRANSMITTED: {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                <Mail size={48} style={{ marginBottom: '20px', opacity: 0.2 }} />
                <p>No active inquiries in the mission grid.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactRequests;
