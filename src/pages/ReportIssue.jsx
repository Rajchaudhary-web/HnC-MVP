import React, { useState, useEffect } from 'react';
import { Upload, MapPin, Send, CheckCircle, Navigation, X, AlertTriangle } from 'lucide-react';
import { createReport } from '../lib/supabaseClient';
import { getCurrentPosition, getHumanReadableAddress } from '../lib/locationUtils';

const SECTORS = ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Central Node', 'North Sector', 'South Hub'];
const PIPELINES = {
  'Sector 1': ['Line A-102', 'Line A-105', 'Main Outlet Alpha'],
  'Sector 2': ['Line B-201', 'Line B-205', 'Secondary Node Beta'],
  'Sector 3': ['Line C-301', 'Line C-303'],
  'Sector 4': ['Line D-401', 'Main Outlet Delta'],
  'Central Node': ['Main Core 01', 'Main Core 02', 'Central Relief'],
  'North Sector': ['North Feed 01', 'North Relief'],
  'South Hub': ['South Feed 01', 'South Collector']
};

const ReportIssue = () => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [pipeline, setPipeline] = useState('');
  const [image, setImage] = useState(null);
  const [severity, setSeverity] = useState('low');
  const [coords, setCoords] = useState({ lat: 0, lon: 0 });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    handleAutoLocate();
  }, []);

  const handleAutoLocate = async () => {
    if (isLocating) return;
    try {
      setIsLocating(true);
      const pos = await getCurrentPosition();
      setCoords(pos);
      const details = await getHumanReadableAddress(pos.lat, pos.lon);
      setAddress(details.location_name);
      const detectedZone = SECTORS.find(s => details.area?.includes(s)) || SECTORS[0];
      setArea(detectedZone);
    } catch (err) {
      setError('Auto-location failed. Please enter manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Helper to extract primary area node (before first comma)
  const extractArea = (locName) => {
    if (!locName) return 'General Node';
    return locName.split(',')[0].trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        title: title,
        description: notes, // mapped notes to description for schema
        latitude: coords.lat || 0,
        longitude: coords.lon || 0,
        severity: severity,
        status: 'reported',
        location_name: address,
        area: extractArea(address), // Dynamic area extraction for Zone Intelligence
        zone_id: null, // Using null for UUID field as per schema update requirements
        pipeline_id: null
      };

      console.log('Dispatching Payload:', payload);
      await createReport(payload);
      
      // Reset form fields for high-frequency reporting
      setTitle('');
      setNotes('');
      setAddress('');
      setArea(SECTORS[0] || '');
      setPipeline('');
      setImage(null);
      setSeverity('low');
      setCoords({ lat: 0, lon: 0 });
      
      setSubmitted(true);
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);

    } catch (err) {
      console.error('Supabase insert error details:', err);
      setError('System transmission failure. Please check network telemetry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--deep-void)', padding: '140px 20px 80px', position: 'relative' }}>
      {/* Background Glows */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(41, 121, 255, 0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(255, 109, 0, 0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '12px' }} className="gradient-text">Incident Reporting Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>Autonomous Zone Intelligence is operational.</p>
          
          {submitted && (
            <div style={{ 
              marginTop: '20px', 
              padding: '12px 24px', 
              background: 'rgba(0, 255, 120, 0.1)', 
              border: '1px solid rgba(0, 255, 120, 0.2)',
              borderRadius: '12px',
              color: 'var(--neon-green)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <CheckCircle size={18} /> Issue reported successfully
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '32px' }}>
          {/* Main Form */}
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Incident Overview</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input 
                  type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Problem Heading..."
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', color: 'white', fontSize: '16px', outline: 'none' }}
                />
                <textarea 
                  required rows="5" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Technical description of the anomaly..."
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', color: 'white', fontSize: '16px', outline: 'none', resize: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Location Intelligence</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px 48px 16px 16px', color: 'white', fontSize: '14px', outline: 'none' }}
                  />
                  <MapPin size={18} color="var(--electric-blue)" style={{ position: 'absolute', right: '16px', top: '16px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <select value={area} onChange={(e) => setArea(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', color: 'white', outline: 'none' }}>
                    {SECTORS.map(s => <option key={s} value={s} style={{ background: '#0F172A' }}>{s}</option>)}
                  </select>
                  <select value={pipeline} onChange={(e) => setPipeline(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', color: 'white', outline: 'none' }}>
                    <option value="" style={{ background: '#0F172A' }}>Target Pipeline...</option>
                    {(PIPELINES[area] || []).map(p => <option key={p} value={p} style={{ background: '#0F172A' }}>{p}</option>)}
                  </select>
                </div>
                <button type="button" onClick={handleAutoLocate} style={{ background: 'none', border: 'none', color: 'var(--electric-blue)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Navigation size={14}/> {isLocating ? 'Synchronizing Satellites...' : 'Force GPS Sync'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Priority Level</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { id: 'low', color: 'var(--neon-green)', bg: 'rgba(0, 200, 83, 0.1)' },
                  { id: 'medium', color: 'var(--vibrant-orange)', bg: 'rgba(255, 109, 0, 0.1)' },
                  { id: 'high', color: 'var(--coral-red)', bg: 'rgba(255, 82, 82, 0.1)' }
                ].map(s => (
                  <button 
                    key={s.id} type="button" onClick={() => setSeverity(s.id)}
                    style={{ 
                      padding: '14px', textAlign: 'left', borderRadius: '12px', border: '1px solid', 
                      borderColor: severity === s.id ? s.color : 'transparent',
                      background: severity === s.id ? s.bg : 'rgba(255,255,255,0.03)',
                      color: severity === s.id ? s.color : 'var(--text-secondary)',
                      fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    {s.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Visual Evidence</label>
              <div style={{ width: '100%', height: '140px', border: '2px dashed var(--glass-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', overflow: 'hidden' }}>
                {image ? (
                  <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Upload size={24} color="var(--text-muted)" />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Upload Media</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>

            <button 
              type="submit" disabled={isSubmitting || isLocating}
              className="btn-neon btn-orange"
              style={{ width: '100%', height: '60px', justifyContent: 'center', opacity: (isSubmitting || isLocating) ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Transmitting...' : 'Dispatch Report'} <Send size={18}/>
            </button>
            {error && <div style={{ color: 'var(--coral-red)', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>{error}</div>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportIssue;
