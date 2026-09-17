# kalman-real-estate
kalman-real-estate

cd /opt/kalman-real-estate
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

## SEO launch

The public marketing site exposes canonical metadata, JSON-LD structured data, a generated social preview, `robots.txt`, and `sitemap.xml`. Authenticated workspaces, login, owner portal, and shared-file pages are marked `noindex`.

Set the production values in `.env.production` before building:

```env
NEXT_PUBLIC_SITE_URL="https://widestateos.com"
GOOGLE_SITE_VERIFICATION="value-from-google-search-console"
BING_SITE_VERIFICATION="value-from-bing-webmaster-tools"
```

After deployment:

1. Verify `https://widestateos.com/robots.txt` and `https://widestateos.com/sitemap.xml`.
2. Add `https://widestateos.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
3. Request indexing for the home, solutions, portfolio, engagements, and approved case-study pages.
4. Keep the Punjab, Bathinda, Barnala, and Hyderabad claims aligned with actual service coverage. Add genuine regional case studies and customer evidence as they become publishable.
5. Maintain a real Google Business Profile only for verified staffed locations; do not create location listings for service areas without an eligible business presence.
