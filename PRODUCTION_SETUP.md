# Kalman Estate OS Production Setup

This repo now has the production foundation for a multi-tenant builder SaaS:

- Next.js app and `/api/v1` API layer.
- PostgreSQL schema and migration through Prisma.
- Redis-backed queue definitions for CAD, documents, and AI reports.
- S3-compatible object storage adapter for CAD, documents, photos, videos, and invoices.
- Tenant-aware services for CAD, ownership, documents, development, marketing, finance, AI, audit, and notifications.

## Local Boot

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
npm run worker:cad
npm run worker:documents
npm run test:smoke
```

Seed login:

```text
owner@saldhaland.example
Kalman@12345
```

## Auth And Sessions

The browser app uses the `kalman_session` HTTP-only cookie issued by `POST /api/v1/auth/login`.
API routes resolve tenant, user, and role from that signed session before applying RBAC checks.

## Implemented `/api/v1` Surface

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/platform/overview`
- `POST /api/v1/cad/upload`
- `GET /api/v1/cad/:id/status`
- `GET /api/v1/cad/:id/scene`
- `POST /api/v1/cad/:id/review`
- `POST /api/v1/cad/:id/publish`
- `GET /api/v1/cad/:id/versions`
- `POST /api/v1/cad/:id/process/retry`
- `POST /api/v1/ownership/owners`
- `POST /api/v1/ownership/plots/:id/allot`
- `POST /api/v1/ownership/plots/:id/transfer`
- `POST /api/v1/ownership/plots/:id/registry`
- `GET /api/v1/ownership/plots/:id/audit`
- `POST /api/v1/documents/generate`
- `POST /api/v1/documents/:id/approve`
- `POST /api/v1/documents/:id/reject`
- `GET /api/v1/documents/:id/download`
- `POST /api/v1/development/site-assets/:id/progress`
- `POST /api/v1/development/plot-checklists/:id/progress`
- `POST /api/v1/development/issues`
- `POST /api/v1/development/progress/:id/photos`
- `POST /api/v1/marketing/tasks`
- `POST /api/v1/marketing/tasks/:id/media`
- `POST /api/v1/marketing/tasks/:id/comments`
- `POST /api/v1/marketing/tasks/:id/approve`
- `POST /api/v1/marketing/tasks/:id/reject`
- `POST /api/v1/finance/boq`
- `POST /api/v1/finance/vendors`
- `POST /api/v1/finance/contractors`
- `POST /api/v1/finance/purchase-orders`
- `POST /api/v1/finance/invoices`
- `POST /api/v1/finance/invoices/:id/payments`
- `GET /api/v1/finance/variance`
- `POST /api/v1/ai/insights`
- `POST /api/v1/ai/reports/weekly`
- `POST /api/v1/ai/reports/owner-progress`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/:id/read`

## What The CAD Publish Does

CAD upload creates a persisted `CadFile`, returns a presigned upload URL, and queues CAD processing. Reviewed `CadEntity` records are published into real business records:

- `PLOT` entities create/update `Plot` inventory.
- Non-plot entities create `SiteAsset` records.
- `SpatialLink` connects every published business record back to the CAD entity.
- `CadVersion` and `AuditEvent` preserve version and publish history.

The CAD worker entrypoint is `npm run worker:cad`. It uses the production Python extraction script when available:

- DWG: set `ODA_CONVERTER_BIN` to the ODA File Converter binary.
- DXF: install Python package `ezdxf`.
- Vector PDF: install Python package `PyMuPDF`.

DXF also has a JS fallback through `dxf-parser`.

## Production Deployment Notes

Use managed Postgres, managed Redis, and S3/R2/MinIO-compatible storage. Set the environment variables from `.env.example`, run migrations in CI/CD, and run separate worker processes for CAD parsing, document generation, AI reports, and notifications.
