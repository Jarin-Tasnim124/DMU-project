const fs = require('fs');
const path = require('path');

const SHOE_CATEGORIES = [
  'Air Jordan Retro',
  'Off-White Collaborations',
  'High-Top Basketball',
  'Performance & Running',
  'Streetwear Low-Tops',
  'Limited Grails & Drops'
];

const SHOE_BRANDS = [
  'Nike', 'Jordan', 'Off-White', 'Adidas Originals', 
  'New Balance', 'Travis Scott', 'Yeezy', 'Asics', 'Salomon'
];

const CURATED_HERO_SHOES = [
  {
    name: "Air Jordan 1 High OG 'Yellow Ochre'",
    brand: "Jordan",
    category: "Air Jordan Retro",
    price: 189.99,
    originalPrice: 240.00,
    discountPercent: 21,
    image: "/images/products/shoe-1.jpg",
    colorway: "Yellow Ochre / Summit White / Black",
    releaseYear: 2024,
    description: "The iconic Air Jordan 1 High silhouette reimagined in rich yellow nubuck and premium tumbled white leather, featuring encapsulated Nike Air cushioning and the legendary Jordan wings emblem."
  },
  {
    name: "Off-White x Nike Air Jordan 1 'Canary Yellow' Exhibition Sample",
    brand: "Off-White",
    category: "Off-White Collaborations",
    price: 850.00,
    originalPrice: 1100.00,
    discountPercent: 23,
    image: "/images/products/shoe-2.jpg",
    colorway: "Canary Yellow / White / Signature 'AIR'",
    releaseYear: 2023,
    description: "Virgil Abloh's revered deconstructed design language showcasing exposed foam, contrast orange stitching, signature zip-tie, and lateral 'AIR' typography."
  },
  {
    name: "Off-White x Nike Blazer Mid 'All Hallows Eve'",
    brand: "Off-White",
    category: "Off-White Collaborations",
    price: 620.00,
    originalPrice: 780.00,
    discountPercent: 20,
    image: "/images/products/shoe-3.jpg",
    colorway: "Canvas Vanilla / Total Orange / Pale Blue",
    releaseYear: 2022,
    description: "An archival masterpiece blending vintage basketball heritage with contemporary high-fashion deconstruction, featuring oversized total-orange swoosh and vibrant cyan lace accents."
  },
  {
    name: "Nike Air Monarch IV 'Hardwood Classic Edition'",
    brand: "Nike",
    category: "High-Top Basketball",
    price: 125.00,
    originalPrice: 160.00,
    discountPercent: 22,
    image: "/images/products/shoe-4.jpg",
    colorway: "Pure White / Team Orange / Midnight Black",
    releaseYear: 2024,
    description: "The ultimate blend of heritage comfort and rugged basketball court durability, engineered with lightweight Phylon midsole and full-length Air-Sole unit."
  },
  {
    name: "Nike Air Max Flyknit Dynamic 'Deep Navy Volt'",
    brand: "Nike",
    category: "Performance & Running",
    price: 175.00,
    originalPrice: 220.00,
    discountPercent: 20,
    image: "/images/products/shoe-5.jpg",
    colorway: "Obsidian Navy / Electric Volt / White",
    releaseYear: 2024,
    description: "State-of-the-art running engineering with 360-degree visible pressurized Air cushioning, breathable engineered Flyknit upper, and responsive kinetic energy return."
  },
  {
    name: "Air Jordan 1 Retro High OG 'Chicago Lost & Found'",
    brand: "Jordan",
    category: "Air Jordan Retro",
    price: 340.00,
    originalPrice: 420.00,
    discountPercent: 19,
    image: "/images/products/shoe-6.jpg",
    colorway: "Varsity Red / Black / Muslin / White",
    releaseYear: 2023,
    description: "A tribute to the 1985 classic that sparked global sneaker culture, designed with vintage pre-aged cracked leather collars, original 85 cut, and retro receipts packaging."
  },
  {
    name: "Cyber-Chunky Streetwear Runner 'Tokyo Nightfall Edition'",
    brand: "Adidas Originals",
    category: "Streetwear Low-Tops",
    price: 210.00,
    originalPrice: 280.00,
    discountPercent: 25,
    image: "/images/products/shoe-7.jpg",
    colorway: "Chalk White / Signal Blue / Infrared / Yellow",
    releaseYear: 2024,
    description: "Aggressive multi-layered chunky silhouette tailored for progressive streetwear styling, featuring responsive adiprene cushioning and high-traction rubber lug outsole."
  }
];

const SIZES = ["US 7.5", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 10.5", "US 11", "US 12"];

function generateSneakerCatalog(count = 5000) {
  const products = [];
  
  // Seed first 7 curated hero sneakers directly
  CURATED_HERO_SHOES.forEach((hero, idx) => {
    products.push({
      id: idx + 1,
      slug: `sneaker-${idx + 1}-${hero.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: hero.name,
      brand: hero.brand,
      category: hero.category,
      price: hero.price,
      originalPrice: hero.originalPrice,
      discountPercent: hero.discountPercent,
      rating: 4.9,
      reviewsCount: 142 + idx * 37,
      stock: 14 + (idx * 5) % 30,
      isFlashDrop: true,
      isFeatured: true,
      image: hero.image,
      colorway: hero.colorway,
      sizes: SIZES,
      condition: "100% Deadstock / Authenticated by SneakerVault",
      description: hero.description,
      specs: {
        upperMaterial: "Full-Grain Tumbled Leather & Technical Mesh",
        midsole: "Air-Sole Encapsulated Cushioning",
        outsole: "High-Abrasion Solid Rubber Traction",
        weight: "420g (Men's US 9)",
        releaseYear: hero.releaseYear,
        latency: "1.2ms (SWR in-memory target)"
      }
    });
  });

  // Generate remainder up to 5,000 for empirical research scaling
  const sampleImages = [
    "/images/products/shoe-1.jpg",
    "/images/products/shoe-2.jpg",
    "/images/products/shoe-3.jpg",
    "/images/products/shoe-4.jpg",
    "/images/products/shoe-5.jpg",
    "/images/products/shoe-6.jpg",
    "/images/products/shoe-7.jpg"
  ];

  const MODEL_PREFIXES = [
    'Retro High OG', 'Dunk Low Retro', 'Air Max 90 Ultra', 'Forum 84 Low',
    '990v6 Made in USA', 'GEL-Kayano 14', 'XT-6 Advanced', 'Air Force 1 07',
    'Travis Scott Collab Low', 'Yeezy 350 Boost V2', 'Vomero 5 Athletic'
  ];

  const COLOR_EDITIONS = [
    'Dark Mocha', 'Panda Black & White', 'Pine Green', 'University Blue',
    'Midnight Navy Metallic', 'Hyper Royal', 'Smoke Grey', 'Silver Bullet',
    'Triple Black Reflective', 'Sail Cream Vintage', 'Laser Orange'
  ];

  for (let i = 8; i <= count; i++) {
    const brand = SHOE_BRANDS[i % SHOE_BRANDS.length];
    const category = SHOE_CATEGORIES[i % SHOE_CATEGORIES.length];
    const prefix = MODEL_PREFIXES[i % MODEL_PREFIXES.length];
    const color = COLOR_EDITIONS[i % COLOR_EDITIONS.length];
    const name = `${brand} ${prefix} '${color}' Edition`;

    const basePrice = (i * 13.7) % 260 + 95;
    const price = parseFloat(basePrice.toFixed(2));
    const originalPrice = parseFloat((price * 1.25).toFixed(2));
    const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);

    const rating = parseFloat(((i * 3.1) % 0.8 + 4.2).toFixed(1));
    const reviewsCount = (i * 17) % 650 + 12;
    const stock = (i * 7) % 45 + 3;
    const isFlashDrop = i % 11 === 0;

    products.push({
      id: i,
      slug: `sneaker-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      brand,
      category,
      price,
      originalPrice,
      discountPercent,
      rating,
      reviewsCount,
      stock,
      isFlashDrop,
      isFeatured: i % 19 === 0,
      image: sampleImages[i % sampleImages.length],
      colorway: color,
      sizes: SIZES,
      condition: "Verified Authentic / Brand New in Box",
      description: `${name}. Engineered with authentic materials, anatomical arch support, and impact absorption. Certified by our dual-stage authentication laboratory.`,
      specs: {
        upperMaterial: i % 2 === 0 ? "Premium Italian Leather" : "Engineered Breathable Ripstop Mesh",
        midsole: "Kinetic Cushioning Core",
        outsole: "Directional Pivot Traction Pattern",
        weight: `${((i * 13) % 120 + 380)}g`,
        releaseYear: 2020 + (i % 5),
        latency: `${((i % 3) + 1)}ms`
      }
    });
  }

  return products;
}

const targetPath = path.join(__dirname, 'products.json');
console.log(`Generating 5,000 real sneaker products...`);
const products = generateSneakerCatalog(5000);
fs.writeFileSync(targetPath, JSON.stringify(products, null, 2), 'utf-8');
console.log(`Successfully generated ${products.length} sneaker products to: ${targetPath}`);
console.log(`File size: ${(fs.statSync(targetPath).size / (1024 * 1024)).toFixed(2)} MB`);
