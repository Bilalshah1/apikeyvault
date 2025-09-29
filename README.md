### API Key Vault

Store and manage your API keys securely.

## Stack
- **Backend**: Express (Node.js)
- **Frontend**: React (Next.js)
- **Database**: Supabase (PostgreSQL via psql/CLI)
- **Auth**: Firebase Authentication (frontend)

## Features
- **Create, view, and delete** stored API keys
- **Secure auth flow** and protected routes
- **Bulk testing** of all API keys

## Development
```bash
# backend
cd backend && npm install && npm run dev

# frontend
cd frontend && npm install && npm run dev
```

## Deployment
- **Frontend**: Firebase Hosting (static export)
- **Backend**: Render

## Live
- [apikeyvault-b1ac8.web.app](https://apikeyvault-b1ac8.web.app)

## Auth (JWT)
- Backend now uses JWT instead of Firebase for protected routes.
- Endpoints:
  - `POST /api/auth/register` { email, password } → `{ token, user }`
  - `POST /api/auth/login` { email, password } → `{ token, user }`
  - `GET /api/auth/me` with `Authorization: Bearer <token>` → `{ user }`

### Environment variables (backend/.env)
```env
DATABASE_URL=...            # existing
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=7d           # optional, default 7d
```

### Using the token from frontend
Include header `Authorization: Bearer <token>` when calling `/api/keys` endpoints.