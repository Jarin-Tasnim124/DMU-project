'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import FlashDropCountdown from '../components/FlashDropCountdown';
import CategoryCircles from '../components/CategoryCircles';
import ProductCard from '../components/ProductCard';
import CartDrawer from '../components/CartDrawer';
import { getProducts, getCategories } from '../lib/api/client';
import { 
  Filter, RefreshCw, ChevronLeft, ChevronRight, 
  CheckCircle2, ArrowRight, X
} from 'lucide-react';

const CATEGORY_TABS = [
  { label: '🔥 All Sneakers', value: 'All' },
  { label: 'Air Jordan Retro', value: 'Air Jordan Retro' },
  { label: 'Off-White Collabs', value: 'Off-White Collaborations' },
  { label: 'High-Top Basketball', value: 'High-Top Basketball' },
  { label: 'Performance & Running', value: 'Performance & Running' },
  { label: 'Streetwear Low-Tops', value: 'Streetwear Low-Tops' },
  { label: '⚡ Flash Drops', value: 'Limited Grails & Drops' }
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [sortBy, setSortBy] = useState('id_asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(5000);
  const [loading, setLoading] = useState(true);

  // Curated category showcases
  const [jordanPreview, setJordanPreview] = useState([]);
  const [offWhitePreview, setOffWhitePreview] = useState([]);

  // Cart Drawer State
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Air Jordan 1 High OG 'Yellow Ochre'",
      price: 189.99,
      image: "/images/products/shoe-1.jpg",
      quantity: 1
    }
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const catalogSectionRef = useRef(null);

  // Load Categories & Curated Previews
  useEffect(() => {
    async function initCatalogData() {
      try {
        const catRes = await getCategories();
        if (catRes.data && catRes.data.data) {
          setCategories(catRes.data.data);
        }

        // Fetch curated showcase products for different categories
        const [jordanRes, owRes] = await Promise.all([
          getProducts({ category: 'Air Jordan Retro', limit: 4 }),
          getProducts({ category: 'Off-White Collaborations', limit: 4 })
        ]);

        if (jordanRes.data?.data) setJordanPreview(jordanRes.data.data);
        if (owRes.data?.data) setOffWhitePreview(owRes.data.data);
      } catch (err) {
        console.error('Failed to load initial catalog data', err);
      }
    }
    initCatalogData();
  }, []);

  // Load Main Filtered Products (Supports category, brand, and working search query!)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 12,
          sortBy
        };
        if (selectedCategory !== 'All') {
          params.category = selectedCategory;
        }
        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const res = await getProducts(params);
        if (res.data && res.data.data) {
          let list = res.data.data;
          if (selectedBrand !== 'All') {
            list = list.filter(p => p.brand === selectedBrand);
          }
          setProducts(list);
          setTotalProducts(res.data.meta?.total || list.length);
          setTotalPages(res.data.meta?.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [page, selectedCategory, selectedBrand, sortBy, searchQuery]);

  // Read URL query params (?search=... or ?category=...) on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      const cat = params.get('category');
      if (q) {
        setSearchQuery(q);
        setTimeout(() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
      }
      if (cat) {
        setSelectedCategory(cat);
      }
    }
  }, []);

  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setToastMessage(`Added "${product.name}" to Bag!`);
    setIsCartOpen(true);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveCartItem = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCategorySwitch = (catVal) => {
    setSelectedCategory(catVal);
    setPage(1);
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearchChange = (query, shouldScroll = false) => {
    setSearchQuery(query);
    setPage(1);
    if (shouldScroll && query) {
      catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ background: 'var(--bg-canvas)', minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* 1. Header with Fully Functional Search & In-Page Category Filtering */}
      <Navbar 
        cartCount={cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
        onOpenCart={() => setIsCartOpen(true)}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySwitch}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Toast Notification */}
      {toastMessage && (
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
          fontWeight: 800,
          animation: 'revealFadeUp 0.3s ease'
        }}>
          <CheckCircle2 size={18} color="var(--accent-green)" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="container" style={{ paddingBottom: '4rem' }}>
        {/* 2. Hero Banner with 3D Shoe Tilt Parallax Animation */}
        <HeroBanner onShopClick={() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} />

        {/* 3. Flash Drops with Live Countdown Timer */}
        <FlashDropCountdown onAddToCart={handleAddToCart} />

        {/* 4. Circular Category Avatars (Instant filter right on this page!) */}
        <CategoryCircles 
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySwitch}
        />

        {/* 5. Main Dynamic Catalog Section (Filter without leaving page!) */}
        <div ref={catalogSectionRef} className="catalog-layout scroll-reveal" style={{ marginTop: '2rem' }}>
          
          {/* Left Filtering Sidebar (30% Black / White Structure) */}
          <aside className="catalog-sidebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <Filter size={16} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: '#0A0A0A' }}>
                Filter Releases
              </h3>
            </div>

            {/* Categories Filter List */}
            <div style={{ marginBottom: '1.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                Categories
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {CATEGORY_TABS.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => handleCategorySwitch(tab.value)}
                    style={{
                      textAlign: 'left',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: selectedCategory === tab.value ? '#000000' : 'transparent',
                      color: selectedCategory === tab.value ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: selectedCategory === tab.value ? 800 : 600,
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            <div style={{ marginBottom: '1.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                Brand
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {['All', 'Nike', 'Air Jordan', 'Off-White', 'Nike Dunk', 'Nike Sportswear'].map(brand => (
                  <button
                    key={brand}
                    onClick={() => { setSelectedBrand(brand); setPage(1); }}
                    style={{
                      textAlign: 'left',
                      padding: '0.4rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: selectedBrand === brand ? '#000000' : 'transparent',
                      color: selectedBrand === brand ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: selectedBrand === brand ? 800 : 500
                    }}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

          </aside>

          {/* Right Product Grid Column */}
          <section>
            {/* Catalog Top Controls Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingBottom: '1.25rem',
              marginBottom: '1.75rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#0A0A0A' }}>
                    {searchQuery ? `SEARCH: "${searchQuery}"` : selectedCategory === 'All' ? 'ALL SNEAKERS' : selectedCategory.toUpperCase()}
                  </h2>
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: '#000000',
                        color: '#FFFFFF',
                        fontFamily: 'var(--font-sport)',
                        fontStyle: 'italic',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="Clear search filter"
                    >
                      <X size={12} />
                      <span>Clear search</span>
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing <strong>{products.length}</strong> of <strong>{totalProducts}</strong> verified pairs
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-medium)',
                    color: '#0A0A0A',
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="id_asc">Featured Releases</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating_desc">Highest Member Rating</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>
                <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#0A0A0A' }} />
                <p>Retrieving authenticated footwear catalog...</p>
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1.05rem', color: '#0A0A0A', fontWeight: 700 }}>No sneakers found matching &quot;{searchQuery || selectedCategory}&quot;.</p>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.4rem' }}>Try searching for &quot;Jordan&quot;, &quot;Off-White&quot;, &quot;Dunk&quot;, or &quot;Air Max&quot;.</p>
                <button
                  onClick={() => { setSelectedCategory('All'); setSelectedBrand('All'); setSearchQuery(''); setPage(1); }}
                  className="btn-primary"
                  style={{ marginTop: '1.25rem' }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="product-grid-wrap">
                {products.map((p) => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                marginTop: '3.5rem'
              }}>
                <button
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => { setPage((prev) => Math.max(1, prev - 1)); catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{ opacity: page <= 1 ? 0.3 : 1, padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Page <strong style={{ color: '#0A0A0A' }}>{page}</strong> of {totalPages}
                </span>

                <button
                  className="btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => { setPage((prev) => Math.min(totalPages, prev + 1)); catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{ opacity: page >= totalPages ? 0.3 : 1, padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>
        </div>

        {/* 6. Curated Category Showcase: Air Jordan Retro Spotlight */}
        {selectedCategory === 'All' && !searchQuery && jordanPreview.length > 0 && (
          <section style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, fontFamily: 'var(--font-sport)', fontStyle: 'italic', color: 'var(--accent-yellow)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  CURATED SILHOUETTES
                </span>
                <h2 style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#0A0A0A' }}>
                  Air Jordan Retro Highlights
                </h2>
              </div>
              <button
                onClick={() => handleCategorySwitch('Air Jordan Retro')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-sport)',
                  fontStyle: 'italic',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: '#0A0A0A',
                  cursor: 'pointer'
                }}
              >
                <span>View All 834 Jordans</span>
                <ArrowRight size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {jordanPreview.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </div>
          </section>
        )}

        {/* 7. Curated Category Showcase: Off-White Collaborations Vault */}
        {selectedCategory === 'All' && !searchQuery && offWhitePreview.length > 0 && (
          <section style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, fontFamily: 'var(--font-sport)', fontStyle: 'italic', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  LIMITED GRAILS
                </span>
                <h2 style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#0A0A0A' }}>
                  Off-White Collaborations Vault
                </h2>
              </div>
              <button
                onClick={() => handleCategorySwitch('Off-White Collaborations')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#0A0A0A',
                  cursor: 'pointer'
                }}
              >
                <span>View All 834 Collabs</span>
                <ArrowRight size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {offWhitePreview.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveCartItem}
      />

      {/* Production E-Commerce Footer (30% Black Luxury Finish) */}
      <footer className="store-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.85rem', color: '#FFFFFF' }}>
                <span>SNEAKER</span><span style={{ color: 'var(--accent-yellow)' }}>PULSE</span> <span style={{ fontSize: '0.75rem', background: '#FFFFFF', color: '#000000', padding: '2px 6px', borderRadius: '3px' }}>VAULT</span>
              </div>
              <p style={{ color: '#9CA3AF', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Global verified marketplace for authenticated high-heat sneakers, Air Jordans, Off-White grails, and performance icons.
              </p>
              <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                Research Evaluation Platform by Jarin Tasnim (Supervised by Fati Tahiru).
              </div>
            </div>

            <div>
              <div className="footer-col-title">CATEGORIES</div>
              <ul className="footer-links">
                <li><a onClick={() => handleCategorySwitch('Air Jordan Retro')} style={{ cursor: 'pointer' }}>Air Jordan Retro</a></li>
                <li><a onClick={() => handleCategorySwitch('Off-White Collaborations')} style={{ cursor: 'pointer' }}>Off-White Collaborations</a></li>
                <li><a onClick={() => handleCategorySwitch('High-Top Basketball')} style={{ cursor: 'pointer' }}>High-Top Basketball</a></li>
                <li><a onClick={() => handleCategorySwitch('Performance & Running')} style={{ cursor: 'pointer' }}>Performance &amp; Running</a></li>
                <li><a onClick={() => handleCategorySwitch('Streetwear Low-Tops')} style={{ cursor: 'pointer' }}>Streetwear Low-Tops</a></li>
              </ul>
            </div>
          </div>

          <div style={{
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            color: '#6B7280',
            fontSize: '0.78rem'
          }}>
            <div>© 2026 SNEAKERPULSE VAULT INC. ALL RIGHTS RESERVED.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
