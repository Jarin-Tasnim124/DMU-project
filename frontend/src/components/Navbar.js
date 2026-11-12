'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, X, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { formatPriceDKK } from '../lib/formatCurrency';

const CATEGORY_ITEMS = [
  { label: '🔥 All Sneakers', value: 'All' },
  { label: 'Air Jordan Retro', value: 'Air Jordan Retro' },
  { label: 'Off-White Collabs', value: 'Off-White Collaborations' },
  { label: 'High-Top Basketball', value: 'High-Top Basketball' },
  { label: 'Performance & Running', value: 'Performance & Running' },
  { label: 'Streetwear Low-Tops', value: 'Streetwear Low-Tops' },
  { label: '⚡ Flash Drops', value: 'Limited Grails & Drops' }
];

export default function Navbar({ 
  cartCount = 0, 
  onOpenCart, 
  selectedCategory = 'All', 
  onCategorySelect,
  searchQuery = '',
  onSearchChange
}) {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);

  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync internal search state when parent prop changes
  useEffect(() => {
    setSearchVal(searchQuery);
  }, [searchQuery]);

  // Click outside to dismiss suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live autocomplete debounced fetch as user types
  useEffect(() => {
    const trimmed = searchVal.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setTotalMatches(0);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams({ search: trimmed, limit: '5' });
        if (selectedCategory && selectedCategory !== 'All') {
          queryParams.append('category', selectedCategory);
        }
        const res = await fetch(`http://localhost:5001/api/products?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setSuggestions(json.data || []);
          setTotalMatches(json.meta?.total || 0);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Failed to fetch search suggestions', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 220);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchVal, selectedCategory]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    const query = searchVal.trim();
    if (onSearchChange) {
      onSearchChange(query, true); // true = shouldScrollToCatalog
    } else {
      router.push(`/?search=${encodeURIComponent(query)}`);
    }
  };

  const handleClearSearch = () => {
    setSearchVal('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSearchChange) {
      onSearchChange('', false);
    }
  };

  const handleCategoryClick = (catVal) => {
    if (onCategorySelect) {
      onCategorySelect(catVal);
    } else {
      router.push(`/?category=${encodeURIComponent(catVal)}`);
    }
  };

  const handleSuggestionClick = (product) => {
    setShowSuggestions(false);
    router.push(`/products/${product.id}`);
  };

  return (
    <>
      {/* Main E-Commerce Header (30% Black Luxury Bar) */}
      <header className="store-header" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
        <div className="container store-header-inner">
          {/* Brand Logo */}
          <Link href="/" className="store-brand" style={{ textDecoration: 'none' }}>
            <span>SNEAKER</span>
            <span style={{ color: 'var(--accent-yellow)' }}>PULSE</span>
            <span className="brand-badge">VAULT</span>
          </Link>

          {/* Omnipresent Working Search Bar with Live Instant Autocomplete Dropdown */}
          <div ref={searchContainerRef} style={{ position: 'relative', flex: 1, maxWidth: '600px' }}>
            <form className="header-search" onSubmit={handleSearchSubmit}>
              <select 
                className="search-category-select"
                value={selectedCategory}
                onChange={(e) => handleCategoryClick(e.target.value)}
                aria-label="Filter by Category"
              >
                <option value="All">All Categories</option>
                <option value="Air Jordan Retro">Air Jordan Retro</option>
                <option value="Off-White Collaborations">Off-White Collabs</option>
                <option value="High-Top Basketball">High-Top Basketball</option>
                <option value="Performance & Running">Performance & Running</option>
                <option value="Streetwear Low-Tops">Streetwear Low-Tops</option>
                <option value="Limited Grails & Drops">Flash Drops</option>
              </select>
              
              <input
                type="text"
                className="search-input-field"
                placeholder="Search 5,000+ sneakers (e.g. Jordan 1, Dunk, Off-White, Air Max)..."
                value={searchVal}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onChange={(e) => setSearchVal(e.target.value)}
                autoComplete="off"
              />

              {isLoadingSuggestions && (
                <div style={{ padding: '0 0.5rem', display: 'flex', alignItems: 'center', color: '#9CA3AF' }}>
                  <Loader2 size={15} className="animate-spin" />
                </div>
              )}

              {searchVal && (
                <button 
                  type="button" 
                  onClick={handleClearSearch}
                  style={{ 
                    color: '#9CA3AF', 
                    background: 'none', 
                    border: 'none', 
                    padding: '0.4rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center' 
                  }}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}

              <button type="submit" className="search-btn" aria-label="Submit Search">
                <Search size={16} />
              </button>
            </form>

            {/* Instant Live Search Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.2)',
                zIndex: 2000,
                overflow: 'hidden',
                color: '#0A0A0A'
              }}>
                <div style={{
                  padding: '0.65rem 1rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid #F3F4F6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F9FAFB'
                }}>
                  <span>Instant Sneaker Matches ({totalMatches} found)</span>
                  <span style={{ color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Zap size={11} /> SWR Predictive
                  </span>
                </div>

                <div style={{ maxHeight: '330px', overflowY: 'auto' }}>
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSuggestionClick(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        padding: '0.65rem 1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background 0.12s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '6px',
                        background: '#F3F4F6',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <img 
                          src={item.image || '/images/products/shoe-1.jpg'} 
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.src = '/images/products/shoe-1.jpg'; }}
                        />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: '#0A0A0A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', display: 'flex', gap: '0.5rem', marginTop: 2 }}>
                          <span style={{ fontWeight: 600 }}>{item.brand}</span>
                          <span>•</span>
                          <span>{item.category}</span>
                        </div>
                      </div>

                      {/* Price & Action */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0A0A0A' }}>
                          {formatPriceDKK(item.price)}
                        </span>
                        <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                          Verified Deadstock
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* View all in catalog footer CTA */}
                <div 
                  onClick={handleSearchSubmit}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#000000',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A1A'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#000000'}
                >
                  <span>Filter entire catalog for &quot;{searchVal}&quot; ({totalMatches} sneakers)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-yellow)' }}>
                    <span>View All</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Icons */}
          <div className="header-actions">
            <button className="header-action-btn" onClick={onOpenCart} title="View Shopping Bag">
              <ShoppingBag size={18} />
              <span className="cart-count-badge">{cartCount}</span>
              <span style={{ marginLeft: 4 }}>Bag</span>
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Horizontal Category Bar (Instant In-Page Filter - No Separate Page Redirects!) */}
      <nav className="category-subnav">
        <div className="container">
          <div className="category-subnav-list">
            {CATEGORY_ITEMS.map((item) => {
              const isSelected = selectedCategory === item.value;
              return (
                <button
                  key={item.value}
                  className={`category-subnav-item ${isSelected ? 'highlight' : ''}`}
                  onClick={() => handleCategoryClick(item.value)}
                  style={{
                    color: isSelected ? '#FFFFFF' : item.value === 'Limited Grails & Drops' ? '#D97706' : undefined
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
