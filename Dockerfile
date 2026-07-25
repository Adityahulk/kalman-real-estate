FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Don't download Puppeteer's bundled Chromium; the runner uses the system chromium package.
ENV PUPPETEER_SKIP_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# On the 1GB-RAM production droplet, Node 22 auto-caps V8's heap at ~1GB. `next build`'s
# type-checking pass exceeds that and dies with "Ineffective mark-compacts near heap limit"
# even though the host now has 4GB of swap — because V8 OOMs at its *own* heap ceiling
# regardless of available OS memory. Raise the ceiling explicitly so the build can grow into
# swap and complete. Keeps type/lint checking enabled (no correctness trade-off).
ENV NODE_OPTIONS=--max-old-space-size=2048
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl libreoffice-writer fonts-liberation fonts-dejavu-core chromium \
  && rm -rf /var/lib/apt/lists/*

# Puppeteer uses the system Chromium installed above (no bundled download).
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --home /tmp nextjs \
  && mkdir -p /app/storage \
  && chown -R nextjs:nodejs /app/storage

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# The letter PDF renderer reads src/styles/globals.css at runtime (loadLetterEditorCss in
# letter-pdf-puppeteer.ts) so the generated PDF shares the editor's exact styling. The Next
# standalone bundle does NOT include raw source files, so this stylesheet must be copied in
# explicitly — without it the renderer emits unstyled PDFs (no red text, signatory position,
# witness layout) for every tenant.
COPY --from=builder --chown=nextjs:nodejs /app/src/styles/globals.css ./src/styles/globals.css

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
