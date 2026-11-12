'use client';

import React from 'react';

const CATEGORIES = [
  { name: 'Air Jordan Retro', categoryVal: 'Air Jordan Retro', count: '834 pairs', image: '/images/products/shoe-1.jpg' },
  { name: 'Off-White Collabs', categoryVal: 'Off-White Collaborations', count: '834 pairs', image: '/images/products/shoe-3.jpg' },
  { name: 'High-Top Basketball', categoryVal: 'High-Top Basketball', count: '834 pairs', image: '/images/products/shoe-4.jpg' },
  { name: 'Performance & Running', categoryVal: 'Performance & Running', count: '833 pairs', image: '/images/products/shoe-5.jpg' },
  { name: 'Streetwear Low-Tops', categoryVal: 'Streetwear Low-Tops', count: '833 pairs', image: '/images/products/shoe-7.jpg' },
  { name: 'Flash Drops', categoryVal: 'Limited Grails & Drops', count: '832 pairs', image: '/images/products/shoe-6.jpg' }
];

export default function CategoryCircles({ selectedCategory, onSelectCategory }) {
  return (
    <section style={{ marginBottom: '3.5rem' }} className="scroll-reveal">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#0A0A0A' }}>
          SHOP BY SILHOUETTE
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Click to filter 5,000+ verified pairs instantly
        </span>
      </div>

      <div className="category-avatars-row">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.categoryVal;
          return (
            <div
              key={cat.name}
              className="category-avatar-card"
              onClick={() => onSelectCategory && onSelectCategory(cat.categoryVal)}
              style={{ cursor: 'pointer' }}
            >
              <div 
                className="avatar-circle"
                style={{
                  borderColor: isSelected ? '#000000' : 'var(--border-subtle)',
                  borderWidth: isSelected ? '2.5px' : '1.5px',
                  boxShadow: isSelected ? '0 8px 25px rgba(0,0,0,0.15)' : undefined
                }}
              >
                <img src={cat.image} alt={cat.name} className="avatar-img" />
              </div>
              <div className="avatar-name" style={{ color: isSelected ? '#000000' : '#4B5563', fontWeight: isSelected ? 800 : 700 }}>
                {cat.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {cat.count}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
