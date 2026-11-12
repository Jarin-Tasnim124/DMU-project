'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function HeroBanner({ onShopClick }) {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  // Interactive 3D tilt tracking on mouse movement
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const rotateY = (x / (rect.width / 2)) * 12;
    const rotateX = -(y / (rect.height / 2)) * 12;

    setTilt({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <div 
      className="hero-banner scroll-reveal" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Left Info Column */}
      <div>
        <div className="hero-tag">
          <Flame size={14} color="#D97706" />
          <span>Limited Release • 2026 Vault Drop</span>
        </div>

        <h1 className="hero-heading">
          Air Jordan 1 High <br />
          <span>'Yellow Ochre'</span>
        </h1>

        <p className="hero-description">
          The iconic 1985 basketball legend reimagined with luxury yellow nubuck, 
          encapsulated Nike Air cushioning, and dual-layer verified authentication.
        </p>

        {/* Price in Danish Krone (kr.) */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#0A0A0A' }}>
            1.399 kr.
          </span>
        </div>

        {/* CTA Buttons (30% Black Primary Button) */}
        <div className="hero-cta-group">
          <Link href="/products/1" className="btn-primary" id="btn-hero-shop">
            <span>Inspect Release</span>
            <ArrowRight size={16} />
          </Link>
          <button className="btn-secondary" onClick={onShopClick}>
            <span>Browse 5,000 Catalog</span>
          </button>
        </div>

        {/* Trust Badges: 5% Green Accents */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontWeight: 700 }}>
            <ShieldCheck size={16} color="var(--accent-green)" />
            100% Verified Authentic
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontWeight: 700 }}>
            <Zap size={16} color="var(--accent-green)" />
            Sub-2ms SWR Prefetch
          </span>
        </div>
      </div>

      {/* Right Column: 3D Floating Interactive Shoe Art */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          className="hero-3d-shoe"
          style={{
            transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(1.05)`,
            width: '100%',
            maxWidth: '440px'
          }}
        >
          <img
            src="/images/products/shoe-1.jpg"
            alt="Air Jordan 1 High OG Yellow Ochre"
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
          />
        </div>

        {/* Dynamic perspective ground shadow disc */}
        <div className="hero-shadow-disc" />
      </div>
    </div>
  );
}
