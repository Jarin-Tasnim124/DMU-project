const express = require('express');
const router = express.Router();
const controller = require('../controllers/productController');

// Catalog & Details
router.get('/products', controller.getProducts);
router.get('/products/:id', controller.getProductById);
router.get('/categories', controller.getCategories);

// Empirical Experiment Telemetry
router.post('/telemetry', controller.recordTelemetry);
router.get('/telemetry', controller.getTelemetry);

// Objective 4 (O4) 180-Run Benchmark Data API
router.get('/benchmark/results', controller.getBenchmarkResults);
router.post('/benchmark/results', controller.saveBenchmarkResults);

module.exports = router;
