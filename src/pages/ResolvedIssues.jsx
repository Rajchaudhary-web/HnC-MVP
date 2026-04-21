import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, MapPin, AlertTriangle, Calendar, ChevronLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ResolvedIssues = () => {
  const [resolved, setResolved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchResolved = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'resolved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResolved(data || []);
    } catch (err) {
      console.error('Error fetching resolved mission logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResolved();
  }, []);

  const filteredItems = resolved.filter(item => 
    item.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      backgroundImage: `
        radial-gradient(circle at 10% 10%, rgba(20, 190, 160, 0.1), transparent 45%),
        radial-gradient(circle at 90% 90%, rgba(0, 210, 255, 0.1), transparent 45%)
      `,
      color: 'white',
      padding: '160px 40px 80px'
    }}>
      <style>{`
        .history-card {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        .history-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(0, 255, 200, 0.2);
        }
        .search-bar {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 20px 12px 45px;
          color: white;
          width: 300px;
          outline: none;
          transition: all 0.3s ease;
        }
        .search-bar:focus {
          border-color: var(--teal);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 15px rgba(0, 255, 200, 0.1);
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <button
              onClick={() => navigate('/admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--teal)',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '15px',
                padding: 0
              }}
            >
              <ChevronLeft size={20} /> Back to Dashboard
            </button>
            <h1 style={{ fontSize: '32px', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>Resolved Issues History</h1>
            <p style={{ color: '#94A3B8', marginTop: '5px' }}>Historical log of all successfully neutralized urban anomalies</p>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={18} color="#64748B" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Filter by location or notes..." 
              className="search-bar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: '#94A3B8' }}>Executing historical data retrieval...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '20px',
            border: '1px dashed rgba(255,255,255,0.1)',
            color: '#94A3B8'
          }}>
            <CheckCircle size={48} style={{ marginBottom: '20px', opacity: 0.3 }} />
            <p>No matching resolved anomalies found in mission logs.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {filteredItems.map(item => (
              <div key={item.id} className="history-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sage)', fontWeight: 800, fontSize: '13px' }}>
                    <CheckCircle size={16} /> Operational
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    #{item.id.slice(0, 8)}
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '5px' }}>{item.area || item.location_name || 'General Node'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94A3B8', fontSize: '13px' }}>
                    <MapPin size={14} /> {item.location_name || 'Coordinate mapping active'}
                  </div>
                </div>

                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: '12px', 
                  fontSize: '13px', 
                  color: '#CBD5E1',
                  marginBottom: '18px',
                  borderLeft: '2px solid rgba(255,255,255,0.1)'
                }}>
                  {item.notes || 'No technical notes recorded for this mission.'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    fontSize: '11px', 
                    fontWeight: 700,
                    color: item.severity === 'high' ? 'var(--coral)' : '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <AlertTriangle size={12} /> {item.severity} Severity
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
                    <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResolvedIssues;
