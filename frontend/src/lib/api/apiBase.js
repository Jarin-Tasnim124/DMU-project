// Single source of truth for where the frontend sends API requests.
//
// 1. If NEXT_PUBLIC_API_URL is set (e.g. Docker Compose), use it.
// 2. During local development (`npm run dev`), use the Express backend on port 5001.
// 3. In a production build (e.g. the Vercel deployment), use the built-in
//    Next.js API routes at /api, which serve the same dataset so the live demo
//    works without a separately hosted backend.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5001/api' : '/api');
