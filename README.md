# FileFlow Monorepo

- **frontend/**: static site (Cloudflare Pages / Vercel)
- **api/**: converter backend (Fly.io container)

Deploy later:
- Frontend → Cloudflare Pages (points to /frontend)
- API → Fly.io (builds Dockerfile in /api)
