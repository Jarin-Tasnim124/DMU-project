'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getProductById } from '../../../lib/api/client';
import globalTracker from '../../../lib/metrics/performanceTracker';
import ProductCard from '../../../components/ProductCard';
import Navbar from '../../../components/Navbar';
import CartDrawer from '../../../components/CartDrawer';
import { 
  ArrowLeft, Star, ShieldCheck, ShoppingBag, Zap, 
  Truck, RotateCcw, Heart, CheckCircle2 
} from 'lucide-react';
import { formatPriceDKK } from '../../../lib/formatCurrency';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navTelemetry, setNavTelemetry] = useState(null);
  const [selectedSize, setSelectedSize] = useState("US 9.5");
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    async function loadProduct() {
      const startTime = performance.now();
      try {
        const res = await getProductById(id);
        const elapsed = performance.now() - startTime;

        if (res.data && res.data.data) {
          setProduct(res.data.data);
          setRelated(res.data.related || []);
        }

        const record = globalTracker.endNavigation(`/products/${id}`, {
          cacheHit: res.fromCache,
          prefetched: res.prefetched,
          ttfb: res.ttfb,
          latencyMs: elapsed,
          payloadBytes: 3200
        });

        setNavTelemetry({
          latencyMs: record ? record.latencyMs : parseFloat(elapsed.toFixed(2)),
          fromCache: res.data?.fromCache || res.fromCache,
          prefetched: res.data?.prefetched || res.prefetched,
          ttfb: res.data?.ttfb || res.ttfb
        });
      } catch (err) {
        console.error('Failed to load sneaker detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    setCartItems(prev => [...prev, { ...product, size: selectedSize, quantity: 1 }]);
    setToastMsg(`Added "${product.name}" (${selectedSize}) to Bag!`);
    setIsCartOpen(true);
    setTimeout(() => setToastMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '8rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>RETRIEVING AUTHENTICATED SNEAKER SPECIFICATION...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '8rem 0', textAlign: 'center' }}>
        <h2>Sneaker Not Found</h2>
        <Link href="/" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Return to Store
        </Link>
      </div>
    );
  }

  const sizes = product.sizes || ["US 7.5", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 10.5", "US 11", "US 12"];

  return (
    <div style={{ background: 'var(--bg-canvas)', minHeight: '100vh', color: '#0A0A0A' }}>
      <Navbar 
        cartCount={cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '5rem',
          right: '2rem',
          background: '#000000',
          color: '#FFFFFF',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.85rem',
          fontWeight: 800
        }}>
          <CheckCircle2 size={18} color="var(--accent-green)" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="container" style={{ padding: '2.5rem 1.5rem 6rem' }}>
        {/* Top Breadcrumbs & Diagnostic Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2.5rem'
        }}>
          <Link href="/" className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
            <ArrowLeft size={14} />
            <span>Back to All Sneakers</span>
          </Link>

          {/* Research Route Diagnostic Badge */}
          {navTelemetry && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.4rem 0.85rem',
              background: navTelemetry.fromCache ? 'var(--accent-green-subtle)' : '#F3F4F6',
              border: `1px solid ${navTelemetry.fromCache ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              color: navTelemetry.fromCache ? '#059669' : '#4B5563',
              fontWeight: 700
            }}>
              <Zap size={14} color={navTelemetry.fromCache ? 'var(--accent-green)' : '#4B5563'} />
              <span>
                Resolved in <strong style={{ color: '#0A0A0A' }}>{navTelemetry.latencyMs}ms</strong> via{' '}
                <strong>
                  {navTelemetry.fromCache ? (navTelemetry.prefetched ? 'Prefetched SWR Cache' : 'In-Memory Cache') : 'Direct Network API Fetch'}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Sneaker Showcase Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '3.5rem',
          alignItems: 'start',
          marginBottom: '5rem'
        }}>
          {/* Left: High-Res Interactive Image Showcase */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '2.5rem',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{
                background: 'var(--accent-green-subtle)',
                border: '1px solid var(--accent-green)',
                color: '#059669',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <ShieldCheck size={12} color="var(--accent-green)" /> VERIFIED AUTHENTIC
              </span>
            </div>

            <div style={{ width: '100%', maxWidth: '440px', margin: '2rem 0' }}>
              <img
                src={product.image || '/images/products/shoe-1.jpg'}
                alt={product.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                  transform: 'rotate(-2deg)'
                }}
              />
            </div>

            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <span>SKU: {product.slug?.toUpperCase() || `SKU-${product.id}`}</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>CONDITION: DEADSTOCK / BRAND NEW</span>
            </div>
          </div>

          {/* Right: Sneaker Specs, Size Selector & Checkout */}
          <div>
            <div style={{ fontSize: '0.8rem', color: '#D97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              {product.brand} • {product.category}
            </div>

            <h1 style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: '0.85rem', color: '#0A0A0A' }}>
              {product.name}
            </h1>

            {/* Ratings Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#D97706' }}>
                <Star size={15} fill="#F59E0B" color="#F59E0B" />
                <strong style={{ color: '#0A0A0A' }}>{product.rating}</strong>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: 'var(--text-secondary)' }}>{product.reviewsCount} customer reviews</span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>Verified Deadstock</span>
            </div>

            {/* Price Box in Danish Krone (kr.) */}
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '1rem',
              padding: '1.25rem 0',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '1.75rem'
            }}>
              <span style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#0A0A0A' }}>
                {formatPriceDKK(product.price)}
              </span>
            </div>

            {/* Description */}
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '2rem' }}>
              {product.description}
            </p>

            {/* Size Selector */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#0A0A0A' }}>Select Size (US Men)</span>
                <span style={{ fontSize: '0.78rem', color: '#0A0A0A', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>Size Guide</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '0.5rem' }}>
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    style={{
                      padding: '0.65rem 0.5rem',
                      background: selectedSize === size ? '#000000' : '#FFFFFF',
                      border: `1.5px solid ${selectedSize === size ? '#000000' : 'var(--border-subtle)'}`,
                      color: selectedSize === size ? '#FFFFFF' : '#0A0A0A',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      fontWeight: selectedSize === size ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <button
                className="btn-primary"
                onClick={handleAddToCart}
                style={{ flex: 1, padding: '1rem' }}
                id="btn-add-detail"
              >
                <ShoppingBag size={18} />
                <span>Add to Shopping Bag</span>
              </button>

              <button
                className="btn-secondary"
                style={{ padding: '1rem' }}
                title="Save to Wishlist"
              >
                <Heart size={18} />
              </button>
            </div>

            {/* Guarantees */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-card)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Truck size={16} color="#0A0A0A" />
                <span>Double-Boxed Express Delivery in 2-4 Business Days</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={16} color="var(--accent-green)" />
                <span style={{ color: '#059669', fontWeight: 700 }}>Every pair verified authentic by footwear specialists</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <RotateCcw size={16} color="#0A0A0A" />
                <span>14-day hassle-free return guarantee on unworn pairs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Verified Silhouettes */}
        {related.length > 0 && (
          <section style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1.5rem', textTransform: 'uppercase', color: '#0A0A0A' }}>
              Similar Verified Silhouettes
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.5rem'
            }}>
              {related.map(item => (
                <ProductCard 
                  key={item.id} 
                  product={item} 
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={(itemId) => setCartItems(p => p.filter(x => x.id !== itemId))}
      />

      <footer className="store-footer">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6B7280', fontSize: '0.78rem' }}>
            <div>© 2026 SNEAKERPULSE VAULT INC. ALL RIGHTS RESERVED.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
