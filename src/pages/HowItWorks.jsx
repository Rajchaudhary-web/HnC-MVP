import React, { useState } from 'react';
import { Smartphone, Radio, Truck, CheckCircle } from 'lucide-react';

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    { id: 1, icon: Smartphone, title: '1. Report Issue', desc: 'Citizen logs blockage via mobile app with GPS & photo.', color: 'var(--electric-blue)' },
    { id: 2, icon: Radio, title: '2. System Notifies Authority', desc: 'AI analyzes severity and pings nearest municipal hub.', color: 'var(--vibrant-orange)' },
    { id: 3, icon: Truck, title: '3. Team Responds', desc: 'Dispatched unit tracks location; user sees live ETA.', color: 'var(--bright-coral)' },
    { id: 4, icon: CheckCircle, title: '4. Issue Resolved', desc: 'System updates map to green and saves data log.', color: 'var(--neon-green)' }
  ];

  return (
    <div style={{ paddingTop: '150px', paddingBottom: '100px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 className="gradient-text" style={{ fontSize: '48px', marginBottom: '80px' }}>How UrbanFlux Works</h1>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', maxWidth: '1000px', padding: '0 20px' }}>
        
        {/* Connecting Line */}
        <div style={{ position: 'absolute', top: '40px', left: '10%', right: '10%', height: '4px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}>
          <div style={{ 
            width: `${(activeStep - 1) * 33.33}%`, 
            height: '100%', 
            background: 'var(--electric-blue)',
            boxShadow: '0 0 15px var(--electric-blue)',
            transition: 'width 0.5s ease-in-out'
          }} />
        </div>

        {steps.map((step) => {
          const isActive = activeStep >= step.id;
          const isCurrent = activeStep === step.id;
          
          return (
            <div 
              key={step.id} 
              onMouseEnter={() => setActiveStep(step.id)}
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                zIndex: 10,
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: isActive ? step.color : 'rgba(15,23,42,1)',
                border: isActive ? 'none' : '2px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: isActive ? `0 0 30px ${step.color}` : 'none',
                transition: 'all 0.3s',
                transform: isCurrent ? 'scale(1.2)' : 'scale(1)'
              }}>
                <step.icon size={32} color={isActive ? 'white' : '#94A3B8'} />
              </div>
              <h3 style={{ 
                color: isActive ? 'white' : '#94A3B8', 
                fontSize: '18px', 
                marginBottom: '10px',
                textShadow: isCurrent ? `0 0 10px ${step.color}` : 'none',
                transition: 'color 0.3s'
              }}>
                {step.title}
              </h3>
              <p style={{ 
                color: '#64748B', 
                fontSize: '14px', 
                textAlign: 'center', 
                maxWidth: '200px',
                opacity: isCurrent ? 1 : 0.6,
                transition: 'opacity 0.3s'
              }}>
                {step.desc}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default HowItWorks;
