@echo off
REM ==============================================================================
REM One-Click Windows Launch Script (Double-Click to Run)
REM Thesis: An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching
REM Proposer: Jarin Tasnim | Supervisor: Fati Tahiru
REM ==============================================================================

echo ==================================================================
echo Starting Empirical Web Performance Framework Environment (Windows)
echo ==================================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js (v18+) from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed.

if not exist node_modules (
    echo Installing root dependencies...
    call npm install
)

if not exist backend\node_modules (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist frontend\node_modules (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

if not exist backend\src\data\products.json (
    echo Generating 5,000 synthetic product dataset...
    node backend\src\data\generate_dataset.js
)

echo.
echo ==================================================================
echo Launching Full-Stack Application...
echo Open your browser at: http://localhost:3000
echo Benchmark Dashboard:  http://localhost:3000/benchmark-dashboard
echo Backend API Endpoint: http://localhost:5001/api/health
echo ==================================================================
echo.

call npm run dev
pause
