'use client';

import React from 'react';
import { X, Trash2, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { formatPriceDKK } from '../lib/formatCurrency';

export default function CartDrawer({ isOpen, onClose, cartItems, onRemoveItem }) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, curr) => acc + curr.price * (curr.quantity || curr.qty || 1), 0);

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={20} color="#0A0A0A" />
            <h2 style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#0A0A0A' }}>
              YOUR BAG ({cartItems.length})
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.95rem', color: '#4B5563' }}>Your shopping bag is empty.</p>
              <button 
                className="btn-primary" 
                style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}
                onClick={onClose}
              >
                Explore Sneakers
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {cartItems.map((item, index) => (
                <div key={`${item.id}-${index}`} style={{
                  display: 'flex',
                  gap: '1rem',
                  background: '#F9FAFB',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  alignItems: 'center'
                }}>
                  <img
                    src={item.image || '/images/products/shoe-1.jpg'}
                    alt={item.name}
                    style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '4px', background: '#FFFFFF', padding: '4px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.2rem', color: '#0A0A0A' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Size: {item.size || 'US 9.5'} • Qty: {item.quantity || 1}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0A0A0A', marginTop: '0.25rem' }}>
                      {formatPriceDKK(item.price)}
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemoveItem && onRemoveItem(item.id || index)}
                    style={{ color: '#9CA3AF', cursor: 'pointer', padding: '0.35rem' }}
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Checkout Summary */}
        {cartItems.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              <span>Subtotal:</span>
              <strong style={{ color: '#0A0A0A' }}>{formatPriceDKK(subtotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              <span>Shipping:</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>FREE (Express)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: '#0A0A0A' }}>
              <span>Total:</span>
              <span style={{ color: '#0A0A0A' }}>{formatPriceDKK(subtotal)}</span>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '0.95rem' }}
              onClick={() => alert(`Simulated Checkout for ${formatPriceDKK(subtotal)} via Verified Vault Payment!`)}
            >
              <span>Checkout Order</span>
              <ArrowRight size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={14} color="var(--accent-green)" />
              <span style={{ color: '#059669', fontWeight: 600 }}>256-bit Encrypted Authenticated Checkout</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
