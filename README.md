# TigerType

<p align="center">
  <img src="client/src/assets/logos/tigertype-logo.png" alt="TigerType logo" width="220" />
</p>

<p align="center">
  Princeton-themed typing practice and real-time race competitions.
</p>

TigerType is a full-stack typing platform built for Princeton users. It combines solo practice, multiplayer races, private lobbies, and progress tracking with campus authentication and a PostgreSQL-backed backend.

## What It Includes

- Solo practice with real-time WPM and accuracy feedback
- Quick match queue for live head-to-head races
- Private race lobbies for invited groups
- CAS-based authentication and persistent user stats
- Achievements, badges, and progression systems

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express + Socket.IO
- Database: PostgreSQL
- Auth: Princeton CAS
- Testing: Jest + client test suite

## Quick Start

### Prerequisites

- Node.js `20.11.1`
- npm
- PostgreSQL

### Setup

```bash
cp .env.example .env
npm run install:all
npm run migrate
npm run dev
```

### Local URLs

- Client: `http://localhost:5174`
- Server/API: `http://localhost:3000`

## Environment Configuration

Start from `.env.example`. The most important values for local setup are:

- `PORT`
- `SESSION_SECRET`
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
- `CAS_HOST`, `CAS_PATH`, `SERVICE_URL`

Optional integrations (email, S3, changelog publishing, APIs) are also documented in `.env.example`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run install:all` | Install root and client dependencies |
| `npm run dev` | Run backend and frontend together in development |
| `npm start` | Start backend in production mode |
| `npm run server` | Run backend only with nodemon |
| `npm run client` | Run frontend only |
| `npm run build` | Build frontend assets |
| `npm run migrate` | Initialize/migrate database schema |
| `npm test` | Run server test suite |
| `npm run test:all` | Run server and client tests |

## Documentation
- Database design: [`docs/DatabaseSchema.md`](docs/DatabaseSchema.md)
- Product overview (COS333): [`ProjectOverview.md`](ProjectOverview.md)
- Full project report (COS333): [`TigerType.pdf`](TigerType.pdf)
- Legacy roadmap/spec README (COS333): [`project-roadmap.md`](project-roadmap.md)

## Branding Assets

- Primary logo: [`client/src/assets/logos/tigertype-logo.png`](client/src/assets/logos/tigertype-logo.png)
- Navbar logo: [`client/src/assets/logos/navbar-logo.png`](client/src/assets/logos/navbar-logo.png)
- Favicon: [`client/src/assets/logos/favicon.png`](client/src/assets/logos/favicon.png)

## Contributing

1. Create a branch from `main`.
2. Keep changes scoped and include tests for behavior changes.
3. Run `npm test` (and relevant client tests) before opening a PR.
4. Open a pull request with clear context and verification steps.

## License

TigerType is licensed under the MIT License. See [`LICENSE`](LICENSE).
