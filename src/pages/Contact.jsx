import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('leads')
        .insert([{ name, email, message }]);

      if (insertError) throw insertError;
      
      setSubmitted(true);
    } catch (err) {
      console.error('Lead Submission Error:', err);
      setError(err.message || 'Failed to transmit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--deep-navy)' }}>
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,200,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px' }}>
            <CheckCircle size={48} color="var(--neon-green)" />
          </div>
          <h2 style={{ marginBottom: '15px' }}>Transmission Received</h2>
          <p style={{ color: '#94A3B8', marginBottom: '30px' }}>Request received. Our team will contact you shortly.</p>
          <button onClick={() => setSubmitted(false)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '100px', paddingBottom: '50px', position: 'relative' }}>
      
      {/* Floating Background Shapes */}
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', background: 'var(--electric-blue)', filter: 'blur(150px)', opacity: 0.2, zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'var(--neon-green)', filter: 'blur(200px)', opacity: 0.1, zIndex: 0 }} />

      <div style={{ maxWidth: '600px', width: '100%', padding: '0 20px', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '42px', marginBottom: '15px' }}>
            Let's build cleaner, smarter cities <span className="gradient-text">together</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '18px' }}>
            Deploy UrbanFlux AI in your municipality and reduce response times by up to 60%.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{ padding: '15px', borderRadius: '12px', background: 'rgba(255,82,82,0.1)', border: '1px solid var(--bright-coral)', color: 'var(--bright-coral)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94A3B8', fontSize: '14px' }}>Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe" 
                style={{ 
                  width: '100%', padding: '15px', borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', 
                  color: 'white', outlineColor: 'var(--electric-blue)' 
                }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94A3B8', fontSize: '14px' }}>Government/Company Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@citydomain.gov" 
                style={{ 
                  width: '100%', padding: '15px', borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', 
                  color: 'white', outlineColor: 'var(--electric-blue)' 
                }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94A3B8', fontSize: '14px' }}>Message</label>
              <textarea 
                rows="4" 
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your city's infrastructure needs..."
                style={{ 
                  width: '100%', padding: '15px', borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', 
                  color: 'white', outlineColor: 'var(--electric-blue)', resize: 'none'
                }} 
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '18px', marginTop: '10px', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Transmitting...' : 'Request Demo'} <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
