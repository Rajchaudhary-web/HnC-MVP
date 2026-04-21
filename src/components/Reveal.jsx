import React, { useRef, useEffect, useState } from 'react';

/**
 * Reusable reveal component that animates elements into view as the user scrolls.
 * Uses IntersectionObserver for high performance and lightweight integration.
 */
const Reveal = ({ children, width = "100%" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        willChange: 'transform, opacity'
      }}
    >
      {children}
    </div>
  );
};

export default Reveal;
