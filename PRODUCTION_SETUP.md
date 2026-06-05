# Kalman Estate OS Production Setup

This repo now has the production foundation for a multi-tenant builder SaaS:

- Next.js app and `/api/v1` API layer.
- PostgreSQL schema and migration through Prisma.
- Redis-backed queue definitions for CAD, documents, and AI reports.
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

- DWG: install ODA File Converter and set `ODA_CONVERTER_BIN` to the converter binary path.
- DXF: install Python package `ezdxf`.
- Vector PDF: install Python package `PyMuPDF`.

DXF also has a JS fallback through `dxf-parser`.

Local CAD dependency setup:

```bash
python3 -m pip install --upgrade ezdxf PyMuPDF
```

Then point the app and workers at the same Python runtime:

```env
PYTHON_BIN="/absolute/path/to/python3"
ODA_CONVERTER_BIN="/absolute/path/to/ODAFileConverter"
```

On this Mac workspace, `ezdxf` and `PyMuPDF` are installed for:

```env
PYTHON_BIN="/opt/homebrew/Caskroom/miniforge/base/bin/python3"
```

ODA File Converter is still a host/vendor install because DWG support depends on the ODA binary. Leave `ODA_CONVERTER_BIN` empty until the converter is installed; DXF and vector PDF processing will still work.

Check the live CAD dependency status from the app:

```bash
GET /api/v1/cad/health
```

## Production Deployment Notes

Use managed Postgres, managed Redis, and S3/R2/MinIO-compatible storage where available. Keep `FILE_STORAGE_DRIVER=s3_with_local_fallback` and mount `/app/storage` so the app can continue generating PDFs and accepting uploads when S3 is missing or temporarily unavailable. Set the environment variables from `.env.example`, run migrations in CI/CD, and run separate worker processes for CAD parsing, document generation, AI reports, and notifications.

In fallback mode, S3 is only attempted when credentials are actually configured. Without `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`, uploads and generated files go directly to `/app/storage`, including CAD files. If deploying on AWS with an instance/task role instead of explicit keys, set `S3_ALLOW_IAM_ROLE="true"`.

The production compose file includes a `storage-init` container that fixes the shared Docker volume permissions before the web and worker containers start. This is required because the app runs as UID `1001` and must be able to write fallback CAD files, PDFs, photos, invoices, and registry documents under `/app/storage`.

If an existing server shows an error like `EACCES: permission denied, mkdir '/app/storage/...'`, rebuild and recreate the containers so `storage-init` runs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache web cad-worker document-worker ai-worker migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

To repair only the existing named storage volume without rebuilding, run:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm storage-init
docker compose -f docker-compose.prod.yml --env-file .env.production restart web cad-worker document-worker
```

## Containerized Production Deployment

The deployable production shape is split by workload:

- `web`: Next.js standalone server.
- `cad-worker`: dedicated CAD processing worker with Python, `ezdxf`, `PyMuPDF`, and optional ODA File Converter.
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

### ODA In Docker

ODA should be installed only in the `cad-worker` image or mounted into the `cad-worker` container. Do not install it in the web image.

Recommended build flow:

1. Download the official Linux ODA File Converter AppImage from Open Design Alliance.
2. Store it in a private artifact bucket or CI secret-accessible URL.
3. Build the CAD worker with:

```bash
ODA_APPIMAGE_URL="https://private-artifacts.example.com/ODAFileConverter.AppImage" \
docker compose -f docker-compose.prod.yml --env-file .env.production build cad-worker
```

4. Set this in `.env.production`:

```env
ODA_CONVERTER_BIN="/opt/oda/ODAFileConverter"
PYTHON_BIN="/usr/bin/python3"
```

If `ODA_APPIMAGE_URL` is empty, the CAD worker still supports DXF and vector PDF through Python, but DWG conversion remains disabled and `/api/v1/cad/health` will report `dwg: false`.

### AWS / DigitalOcean Shape

For AWS:

- Run `web`, `cad-worker`, `document-worker`, and `ai-worker` as separate ECS services.
- Use RDS Postgres, ElastiCache Redis, and S3, while keeping the local storage volume mounted as fallback.
- Scale `cad-worker` independently based on queue depth.

For DigitalOcean:

- Run these containers on App Platform workers or a Docker Droplet.
- Use Managed Postgres, Managed Redis, and Spaces.
- Scale `cad-worker` separately from `web`.
