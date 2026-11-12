'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import ProductCard from '../../../components/ProductCard';
import CartDrawer from '../../../components/CartDrawer';
import { getProducts } from '../../../lib/api/client';
import { 
  ChevronRight, ChevronLeft, SlidersHorizontal, RefreshCw, 
  ArrowLeft, Tag, ShieldCheck 
} from 'lucide-react';

const CATEGORY_CONFIGS = {
  'all': {
    name: 'All Sneakers',
    apiCategory: 'All',
    title: 'ALL SNEAKERS // COMPLETE ARCHIVE',
    tagline: 'The complete verified index of 5,000+ deadstock footwear grails and performance releases.',
    badge: '5,000+ PAIRS'
  },
  'air-jordan-retro': {
    name: 'Air Jordan Retro',
    apiCategory: 'Air Jordan Retro',
    title: 'AIR JORDAN RETRO COLLECTION',
    tagline: 'Iconic 1985 heritage silhouettes, OG colorways, and timeless high-top Jordan classics.',
    badge: 'JORDAN VAULT'
  },
  'off-white-collabs': {
    name: 'Off-White Collabs',
    apiCategory: 'Off-White Collaborations',
    title: 'OFF-WHITE COLLABORATIONS',
    tagline: 'Virgil Abloh’s visionary deconstructed aesthetics, Helvetica typography, and collector grails.',
    badge: 'OFF-WHITE GRAILS'
  },
  'high-top-basketball': {
    name: 'High-Top Basketball',
    apiCategory: 'High-Top Basketball',
    title: 'HIGH-TOP BASKETBALL CLASSICS',
    tagline: 'Hardwood championship court legends, supportive high-collar silhouettes, and retro b-ball icons.',
    badge: 'HARDWOOD ICONS'
  },
  'performance-running': {
    name: 'Performance & Running',
    apiCategory: 'Performance & Running',
    title: 'PERFORMANCE & RUNNING',
    tagline: 'Engineered responsive cushioning, marathon road racers, and high-mileage daily runners.',
    badge: 'PRO ATHLETIC'
  },
  'streetwear-low-tops': {
    name: 'Streetwear Low-Tops',
    apiCategory: 'Streetwear Low-Tops',
    title: 'STREETWEAR LOW-TOPS',
    tagline: 'Clean minimal ankle profiles, casual street culture essentials, and everyday lifestyle staples.',
    badge: 'DAILY ESSENTIALS'
  },
  'flash-drops': {
    name: 'Flash Drops',
    apiCategory: 'Limited Grails & Drops',
    title: '⚡ FLASH DROPS // LIMITED VAULT',
    tagline: 'Urgent limited allocations, member-exclusive releases, and rare footwear vault.',
    badge: 'LIMITED VAULT'
  }
};

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug || 'all';

  const categoryConfig = CATEGORY_CONFIGS[slug] || {
    name: slug.replace(/-/g, ' ').toUpperCase(),
    apiCategory: 'All',
    title: `${slug.replace(/-/g, ' ').toUpperCase()} COLLECTION`,
    tagline: 'Authenticated verified sneakers from the global vault.',
    badge: 'CURATED'
  };

  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id_asc');
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  useEffect(() => {
    async function fetchCategoryProducts() {
      setLoading(true);
      try {
        const queryParams = {
          page,
          limit: 18,
          sortBy
        };

        if (categoryConfig.apiCategory && categoryConfig.apiCategory !== 'All') {
          queryParams.category = categoryConfig.apiCategory;
        }

        if (searchQuery.trim()) {
          queryParams.search = searchQuery.trim();
        }

        const res = await getProducts(queryParams);
        if (res.status === 'success') {
          setProducts(res.data);
          setTotalProducts(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      } catch (err) {
        console.error('Failed to load category products', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategoryProducts();
  }, [slug, page, sortBy, searchQuery]);

  const handleAddToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, selectedSize: 'US 10.5' }];
    });
    setIsCartOpen(true);
  };

  const handleRemoveCartItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div style={{ background: 'var(--bg-canvas)', minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* Header Navigation */}
      <Navbar 
        cartCount={cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Category Hero Banner */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '3rem 0 2.5rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div className="container">
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            <Link href="/" style={{ color: 'var(--text-secondary)' }}>Home</Link>
            <ChevronRight size={14} />
            <Link href="/" style={{ color: 'var(--text-secondary)' }}>Categories</Link>
            <ChevronRight size={14} />
            <span style={{ color: '#0A0A0A', fontWeight: 800 }}>{categoryConfig.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{
                display: 'inline-block',
                background: 'var(--accent-yellow)',
                color: '#000000',
                fontFamily: 'var(--font-sport)',
                fontStyle: 'italic',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '0.75rem',
                letterSpacing: '0.04em'
              }}>
                {categoryConfig.badge}
              </div>

              <h1 style={{
                fontFamily: 'var(--font-sport)',
                fontStyle: 'italic',
                fontSize: '2.8rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                color: '#0A0A0A'
              }}>
                {categoryConfig.title}
              </h1>

              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '650px', lineHeight: 1.5 }}>
                {categoryConfig.tagline}
              </p>
            </div>

            <div style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              padding: '1.25rem 1.75rem',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>AVAILABLE IN VAULT</span>
              <strong style={{ fontSize: '2rem', fontFamily: 'var(--font-sport)', fontStyle: 'italic', color: '#0A0A0A', fontWeight: 900 }}>
                {totalProducts}
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Verified Pairs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="container" style={{ padding: '2.5rem 1.5rem 6rem' }}>
        {/* Controls Bar: Sort, Count, Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/" className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
              <ArrowLeft size={14} />
              <span>All Drops</span>
            </Link>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Showing <strong>{products.length}</strong> of <strong>{totalProducts}</strong> verified sneakers
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sort by:</span>
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

        {/* Product Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--accent-yellow)' }} />
            <p style={{ fontSize: '0.95rem' }}>Loading {categoryConfig.name} inventory...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No sneakers found in this category.</p>
            <Link href="/category/all" className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
              Browse Complete Catalog
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {products.map((p) => (
              <ProductCard 
                key={p.id}
                product={p}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
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
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{ opacity: page <= 1 ? 0.3 : 1, padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page <strong style={{ color: '#FFFFFF' }}>{page}</strong> of {totalPages}
            </span>

            <button
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{ opacity: page >= totalPages ? 0.3 : 1, padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveCartItem}
      />

      {/* Footer */}
      <footer className="store-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div style={{ fontFamily: 'var(--font-sport)', fontStyle: 'italic', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
                <span>SNEAKER</span><span style={{ color: 'var(--accent-yellow)' }}>PULSE</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Global verified marketplace for authenticated high-heat sneakers, Air Jordans, Off-White grails, and performance icons.
              </p>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Research Evaluation Platform by Jarin Tasnim (Supervised by Fati Tahiru).
              </div>
            </div>

            <div>
              <div className="footer-col-title">CATEGORIES</div>
              <ul className="footer-links">
                <li><Link href="/category/air-jordan-retro">Air Jordan Retro</Link></li>
                <li><Link href="/category/off-white-collabs">Off-White Collabs</Link></li>
                <li><Link href="/category/high-top-basketball">High-Top Basketball</Link></li>
                <li><Link href="/category/performance-running">Performance &amp; Running</Link></li>
                <li><Link href="/category/streetwear-low-tops">Streetwear Low-Tops</Link></li>
                <li><Link href="/category/flash-drops">Flash Drops</Link></li>
              </ul>
            </div>
          </div>

          <div style={{
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--text-muted)',
            fontSize: '0.78rem'
          }}>
            <div>© 2026 SNEAKERPULSE VAULT INC. ALL RIGHTS RESERVED.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
