const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  exposedHeaders: ['X-Total-Count', 'X-Server-Timestamp']
}));
app.use(express.json());

// Request logger for benchmarking monitoring
let totalApiRequests = 0;
app.use((req, res, next) => {
  totalApiRequests++;
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[REQ #${totalApiRequests}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Routes
app.use('/api', productRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    framework: 'Empirical Predictive Data-Fetching Research API',
    uptime: process.uptime(),
    totalRequestsServed: totalApiRequests,
    timestamp: new Date().toISOString()
  });
});

// Root info
app.get('/', (req, res) => {
  res.json({
    title: 'An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications',
    researcher: 'Jarin Tasnim',
    supervisor: 'Fati Tahiru',
    endpoints: [
      'GET /api/products',
      'GET /api/products/:id',
      'GET /api/categories',
      'GET /api/health',
      'POST /api/telemetry',
      'GET /api/telemetry'
    ]
  });
});

app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Empirical Benchmark API Server running on port: ${PORT}`);
  console.log(`   Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`   Catalog endpoint: http://localhost:${PORT}/api/products`);
  console.log('================================================================');
});
