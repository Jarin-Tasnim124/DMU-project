// Server-side catalog logic for the built-in Next.js API routes.
// Mirrors backend/src/controllers/productController.js so the deployed demo
// returns the same responses as the Express backend.

export function listProducts(products, params) {
  const page = parseInt(params.get('page'), 10) || 1;
  const limit = parseInt(params.get('limit'), 10) || 24;
  const category = params.get('category');
  const search = params.get('search') ? params.get('search').toLowerCase() : null;
  const sortBy = params.get('sortBy') || 'id_asc';
  const minPrice = parseFloat(params.get('minPrice'));
  const maxPrice = parseFloat(params.get('maxPrice'));

  let filtered = [...products];

  if (category && category !== 'All') {
    filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.brand.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search)
    );
  }
  if (!isNaN(minPrice)) filtered = filtered.filter(p => p.price >= minPrice);
  if (!isNaN(maxPrice)) filtered = filtered.filter(p => p.price <= maxPrice);

  switch (sortBy) {
    case 'price_asc': filtered.sort((a, b) => a.price - b.price); break;
    case 'price_desc': filtered.sort((a, b) => b.price - a.price); break;
    case 'rating_desc': filtered.sort((a, b) => b.rating - a.rating); break;
    case 'name_asc': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
    default: filtered.sort((a, b) => a.id - b.id);
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;

  return {
    status: 'success',
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      category: category || 'All',
      sortBy
    },
    data: filtered.slice(startIndex, startIndex + limit)
  };
}

export function getProduct(products, rawId) {
  const id = parseInt(rawId, 10);
  const product = products.find(p => p.id === id);
  if (!product) return null;
  const related = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  return { status: 'success', data: product, related };
}

export function listCategories(products) {
  const counts = {};
  products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
  return {
    status: 'success',
    data: Object.keys(counts).map(name => ({ name, count: counts[name] }))
  };
}
