# TextLens Frontend

Next.js + TypeScript + Tailwind UI for TextLens.

## Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Visit `http://localhost:3000`. Make sure the backend is running at the URL
set in `.env.local` (defaults to `http://localhost:8000`).

## Deploy

Deploy to Vercel and set `NEXT_PUBLIC_API_URL` to your deployed backend URL
(e.g. on Render).
