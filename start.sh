#!/bin/bash
# ==============================================================================
# One-Click Launch Script for Mac / Linux
# Thesis: An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching
# Proposer: Jarin Tasnim | Supervisor: Fati Tahiru
# ==============================================================================

set -e

echo "=================================================================="
echo "🚀 Initializing Empirical Web Performance Framework Environment"
echo "=================================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo "✓ npm version: $(npm -v)"

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Ensure dataset exists
if [ ! -f "backend/src/data/products.json" ]; then
    echo "⚙️ Generating 5,000 synthetic product dataset..."
    node backend/src/data/generate_dataset.js
fi

echo ""
echo "=================================================================="
echo "✨ Starting Backend REST API (Port 5001) & Next.js Frontend (Port 3000)..."
echo "   Access Application: http://localhost:3000"
echo "   Access Benchmark:   http://localhost:3000/benchmark-dashboard"
echo "   Access Backend API: http://localhost:5001/api/health"
echo "=================================================================="
echo ""

npm run dev
