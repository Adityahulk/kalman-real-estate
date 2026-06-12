# Kalman Estate OS Production Setup

This repo now has the production foundation for a multi-tenant builder SaaS:

- Next.js app and `/api/v1` API layer.
- PostgreSQL schema and migration through Prisma.
- Redis-backed queue definitions for documents and AI reports.
- Resilient object storage adapter for CAD, documents, photos, videos, and invoices: S3-compatible storage is preferred, with Docker volume local storage as automatic fallback.
- Tenant-aware services for CAD, ownership, documents, development, marketing, finance, AI, audit, and notifications.

## Local Boot

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
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
- `GET /api/v1/cad/:id/analysis`
- `GET /api/v1/cad/:id/candidates`
- `GET /api/v1/cad/:id/preview`
- `GET /api/v1/cad/:id/scene`
- `POST /api/v1/cad/:id/extract`
- `POST /api/v1/cad/:id/calibration`
- `POST /api/v1/cad/:id/review`
- `POST /api/v1/cad/:id/review/batch`
- `POST /api/v1/cad/:id/publish`
- `POST /api/v1/cad/:id/publish/rollback`
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

## Production CAD Intelligence

CAD upload stores the original file, runs inspection, and then moves through a mandatory guided workflow:

1. `ANALYZING`: inspect pages, embedded raster images, vector paths, text, and PDF optional layers.
2. `SETUP_REQUIRED`: confirm the real site-layout region, excluded schedules/title blocks, drawing discipline, and stated plot counts.
3. `EXTRACTING`: extract safe plot and site-asset candidates from the confirmed region.
4. `CALIBRATION_REQUIRED`: confirm a known length before PDF drawing-space measurements can become square feet.
5. `REVIEW_REQUIRED`: confirm or correct strict business candidates.
6. `PUBLISHED`: transactionally create plots, site assets, checklist zones, spatial links, a publish batch, and audit history.

Raw PDF paths and DXF primitives never become ownership records directly. Plot publish is blocked when labels are invalid or duplicated, geometry is open, scale is unknown, blocking review issues remain, or the stated plot count does not reconcile without an administrator reason.

Two processing pipelines are active:

- **DXF / DWG**: parsed and extracted entirely in the authorized admin browser with MLightCAD (`@mlightcad/cad-simple-viewer`). No server-side DXF worker is required.
- **PDF**: rendered with Node (`pdfjs-dist`, `@napi-rs/canvas`, `sharp`) and analyzed with Gemini vision inside the web application. `GEMINI_API_KEY` is required for PDF maps.

Published records retain their `CadPublishBatch` and `SpatialLink` provenance. Rollback archives untouched malformed plots/assets and protects records that already have ownership, registry, documents, development, or progress activity.

Required CAD environment:

```env
GEMINI_API_KEY="your-gemini-api-key"
MAX_CAD_UPLOAD_MB="100"
CAD_SYNC_TIMEOUT_MS="25000"
```

Check the live CAD dependency status from the app:

```bash
GET /api/v1/cad/health
```

## Production Deployment Notes

Use managed Postgres, managed Redis, and S3/R2/MinIO-compatible storage where available. Keep `FILE_STORAGE_DRIVER=s3_with_local_fallback` and mount `/app/storage` so the app can continue generating PDFs and accepting uploads when S3 is missing or temporarily unavailable. Set the environment variables from `.env.example`, run migrations in CI/CD, and run separate worker processes for document generation and AI reports.

The production Compose file publishes the web application using:

```env
WEB_BIND_ADDRESS="0.0.0.0"
WEB_PORT="3000"
```

This makes it directly reachable at `http://SERVER_IP:3000`. Set
`WEB_BIND_ADDRESS="127.0.0.1"` when the application should be reachable only
through Nginx.

Configure the public sales landing page and demo-request delivery:

```env
NEXT_PUBLIC_SALES_WHATSAPP="918292098293"
NEXT_PUBLIC_SALES_EMAIL="company@kalman-labs.com"
DEMO_LEAD_WEBHOOK_URL="https://crm.example.com/webhooks/widestate"
DEMO_LEAD_WEBHOOK_TOKEN=""
DEMO_LEAD_NOTIFY_EMAIL="sales@example.com"
DEMO_LEAD_FROM_EMAIL="WIDESTATE OS <leads@example.com>"
RESEND_API_KEY=""
```

Every demo enquiry is saved in PostgreSQL. CRM webhook and Resend email
delivery are optional and do not block the visitor’s confirmation when an
external service is temporarily unavailable.

In fallback mode, S3 is only attempted when credentials are actually configured. Without `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`, uploads and generated files go directly to `/app/storage`, including CAD files. If deploying on AWS with an instance/task role instead of explicit keys, set `S3_ALLOW_IAM_ROLE="true"`.

The production compose file includes a `storage-init` container that fixes the shared Docker volume permissions before the web and worker containers start. This is required because the app runs as UID `1001` and must be able to write fallback CAD files, PDFs, photos, invoices, and registry documents under `/app/storage`.

If an existing server shows an error like `EACCES: permission denied, mkdir '/app/storage/...'`, rebuild and recreate the containers so `storage-init` runs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache web document-worker ai-worker migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

To repair only the existing named storage volume without rebuilding, run:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm storage-init
docker compose -f docker-compose.prod.yml --env-file .env.production restart web document-worker
```

## Containerized Production Deployment

The deployable production shape is split by workload:

- `web`: Next.js standalone server, including browser CAD runtime assets and in-process Gemini PDF map processing.
- `document-worker`: PDF/document generation worker.
- `ai-worker`: AI/report queue worker.
- `postgres` and `redis`: included for single-VM production or staging. On AWS/DigitalOcean managed services, point the same env vars at managed Postgres/Redis instead.

Create a production env file:

```bash
cp .env.production.example .env.production
```

Build and run:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Health checks:

```bash
curl http://localhost:3000/api/v1/health
```

CAD dependency health requires login because it exposes internal processing capability:

```bash
GET /api/v1/cad/health
```

### AWS / DigitalOcean Shape

For AWS:

- Run `web`, `document-worker`, and `ai-worker` as separate ECS services.
- Use RDS Postgres, ElastiCache Redis, and S3, while keeping the local storage volume mounted as fallback.
- Scale `web` if PDF map processing load grows; Gemini calls and PDF rendering run inside the web process.

For DigitalOcean:

- Run these containers on App Platform workers or a Docker Droplet.
- Use Managed Postgres, Managed Redis, and Spaces.
- Ensure `GEMINI_API_KEY` is configured on the web service for PDF map uploads.
