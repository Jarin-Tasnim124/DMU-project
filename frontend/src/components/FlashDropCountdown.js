'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, Clock, ShoppingCart } from 'lucide-react';
import { formatPriceDKK } from '../lib/formatCurrency';

export default function FlashDropCountdown({ onAddToCart }) {
  // Live ticking countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const flashItems = [
    {
      id: 3,
      name: "Off-White x Nike Blazer Mid 'All Hallows Eve'",
      price: 620.00,
      image: "/images/products/shoe-3.jpg"
    },
    {
      id: 6,
      name: "Air Jordan 1 Retro High OG 'Chicago Lost & Found'",
      price: 340.00,
      image: "/images/products/shoe-6.jpg"
    },
    {
      id: 5,
      name: "Nike Air Max Flyknit Dynamic 'Deep Navy Volt'",
      price: 175.00,
      image: "/images/products/shoe-5.jpg"
    },
    {
      id: 7,
      name: "Cyber-Chunky Runner 'Tokyo Nightfall Edition'",
      price: 210.00,
      image: "/images/products/shoe-7.jpg"
    }
  ];

  return (
    <section className="flash-drops-section scroll-reveal">
      <div className="flash-header">
        <div className="flash-title-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#D97706' }}>
            <Flame size={24} color="#D97706" />
            <h2 className="flash-title">FLASH DROPS</h2>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Limited allocation reserved for verified members
          </span>
        </div>

        {/* Live Countdown Display: Black Box with Yellow Digits */}
        <div className="countdown-box" suppressHydrationWarning>
          <span style={{ color: '#9CA3AF', fontSize: '0.75rem', marginRight: 4 }}>ENDS IN:</span>
          <span className="countdown-digit" suppressHydrationWarning>{String(timeLeft.hours).padStart(2, '0')}h</span>
          <span style={{ color: 'var(--accent-yellow)', fontWeight: 800 }}>:</span>
          <span className="countdown-digit" suppressHydrationWarning>{String(timeLeft.minutes).padStart(2, '0')}m</span>
          <span style={{ color: 'var(--accent-yellow)', fontWeight: 800 }}>:</span>
          <span className="countdown-digit" suppressHydrationWarning>{String(timeLeft.seconds).padStart(2, '0')}s</span>
        </div>
      </div>

      {/* 4 Flash Cards Grid (60% White / 30% Black / 5% Green / 5% Yellow) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {flashItems.map((item) => (
          <div key={item.id} className="sneaker-card" style={{ padding: '0.85rem' }}>
            <div style={{ position: 'relative', height: '170px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.85rem', background: '#F3F4F6' }}>
              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.5rem' }} />
            </div>

            <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem', height: '38px', overflow: 'hidden', color: '#0A0A0A' }}>
              {item.name}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#0A0A0A' }}>
                {formatPriceDKK(item.price)}
              </span>
            </div>

            <button
              className="btn-add-cart"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onAddToCart && onAddToCart(item)}
            >
              <ShoppingCart size={14} />
              <span>Claim Pair</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
