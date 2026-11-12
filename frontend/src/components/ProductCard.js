'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import globalPrefetcher from '../lib/prefetch/hoverIntent';
import globalSWRCache from '../lib/cache/swrCache';
import globalTracker from '../lib/metrics/performanceTracker';
import { getProductById } from '../lib/api/client';
import { Star, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatPriceDKK } from '../lib/formatCurrency';

export default function ProductCard({ product, onAddToCart }) {
  const router = useRouter();
  const cardRef = useRef(null);
  const [cardTilt, setCardTilt] = useState({ rotateX: 0, rotateY: 0 });

  const cacheKey = `API:/products/${product.id}`;

  // Tactile 3D Tilt on Mouse Move
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setCardTilt({
      rotateX: -(y / (rect.height / 2)) * 6,
      rotateY: (x / (rect.width / 2)) * 6
    });
  };

  // Pointer Enter - Prefetches silently in the background after 100ms dwell (no visual badges)
  const handlePointerEnter = () => {
    if (globalSWRCache.has(cacheKey)) return;

    globalPrefetcher.onPointerEnter(
      cacheKey,
      async () => {
        const res = await getProductById(product.id);
        return res.data;
      }
    );
  };

  // Pointer Leave - Cancels prefetch if moved away before 100ms
  const handlePointerLeave = () => {
    setCardTilt({ rotateX: 0, rotateY: 0 });
    globalPrefetcher.onPointerLeave(cacheKey);
  };

  const handleInspect = (e) => {
    e.preventDefault();
    globalTracker.startNavigation(`/products/${product.id}`);
    router.push(`/products/${product.id}`);
  };

  return (
    <div
      ref={cardRef}
      className="sneaker-card"
      onMouseMove={handleMouseMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: `perspective(800px) rotateX(${cardTilt.rotateX}deg) rotateY(${cardTilt.rotateY}deg)`
      }}
      id={`sneaker-card-${product.id}`}
    >
      {/* Sneaker Image Box */}
      <div className="card-img-box" onClick={handleInspect} style={{ cursor: 'pointer' }}>
        <img
          src={product.image || '/images/products/shoe-1.jpg'}
          alt={product.name}
          className="card-img"
          loading="lazy"
        />
      </div>

      {/* Product Information */}
      <div className="card-info">
        <div className="card-brand">{product.brand} • {product.category}</div>
        <h3 className="card-title" onClick={handleInspect} style={{ cursor: 'pointer' }}>
          {product.name}
        </h3>

        {/* Rating (Yellow) and Stock status (Green) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.65rem' }}>
          {/* 5% Yellow Rating Stars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#D97706' }}>
            <Star size={13} fill="#F59E0B" color="#F59E0B" />
            <span style={{ fontWeight: 800, color: '#0A0A0A' }}>{product.rating}</span>
            <span style={{ color: 'var(--text-muted)' }}>({product.reviewsCount})</span>
          </div>
          {/* 5% Green In-Stock Status */}
          <span style={{
            color: '#059669',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'var(--accent-green-subtle)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {product.stock} in stock
          </span>
        </div>

        {/* Pricing Row (30% Black Text in Danish Krone kr.) */}
        <div className="card-price-row">
          <span className="current-price">{formatPriceDKK(product.price)}</span>
        </div>

        {/* Action Buttons (30% Black Primary CTA) */}
        <div className="card-actions-row">
          <button
            className="btn-add-cart"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart && onAddToCart(product);
            }}
            id={`btn-cart-${product.id}`}
          >
            <ShoppingBag size={14} />
            <span>Add to Bag</span>
          </button>

          <button
            className="btn-view-spec"
            onClick={handleInspect}
            title="Inspect Sneaker Specifications"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
