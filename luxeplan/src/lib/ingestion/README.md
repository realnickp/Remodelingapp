# Product Ingestion System

Production-grade pipeline for populating the LUXEPLAN product catalog from official retailer sources.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Scheduler   │────▶│  Job Queue   │────▶│   Worker     │
│  (cron)      │     │  (Supabase)  │     │  (Node.js)   │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                    ┌────────────────────────────┼────────────────────┐
                    │                            │                    │
              ┌─────▼─────┐  ┌──────────▼────────┐  ┌──────▼──────┐
              │ Home Depot │  │  Lowes Catalog     │  │  Pinterest  │
              │ Feed       │  │  API               │  │  API        │
              └─────┬──────┘  └──────────┬─────────┘  └──────┬──────┘
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                                  ┌──────▼──────┐
                                  │  Asset Prep  │
                                  │  Service     │
                                  └──────┬──────┘
                                         │
                                  ┌──────▼──────┐
                                  │  Supabase   │
                                  │  Database   │
                                  └─────────────┘
```

## Quick Start

### 1. Set Environment Variables

Add these to `luxeplan/.env.local`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Pinterest (for inspiration + catalog builder)
PINTEREST_ACCESS_TOKEN=your-pinterest-token

# Home Depot (placeholder — fill when available)
HOME_DEPOT_FEED_URL=
HOME_DEPOT_API_KEY=

# Lowes (placeholder — fill when available)
LOWES_API_KEY=
LOWES_API_SECRET=
```

### 2. Run Database Migration

Apply the ingestion schema to your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL in Supabase Dashboard → SQL Editor:
# supabase/migrations/002_ingestion_system.sql
```

### 3. Create Supabase Storage Bucket

In the Supabase Dashboard:
1. Go to **Storage** → **New Bucket**
2. Name: `product-assets`
3. Set to **Public** (assets need to be served to the browser)

### 4. Build Initial Catalog from Pinterest

```bash
cd luxeplan
npx tsx src/lib/ingestion/pinterest-catalog-builder.ts
```

This searches Pinterest for home-remodeling products and populates the `products` and `product_images` tables with real data.

### 5. Run the Worker

```bash
npx tsx scripts/worker.ts
```

The worker polls the `job_queue` table every 2 seconds and processes:
- `INGEST_SOURCE` — run an adapter to fetch products
- `PREP_ASSETS_FOR_PRODUCT` — generate cutout, texture, thumbnail
- `REFRESH_PRICE` — update pricing data
- `REFRESH_INVENTORY` — update availability

### 6. Run the Scheduler

```bash
# Continuous mode (every 30 minutes)
npx tsx scripts/scheduler.ts

# Single run (for cron jobs)
npx tsx scripts/scheduler.ts --once
```

The scheduler enqueues `INGEST_SOURCE` jobs for all active sources and `PREP_ASSETS_FOR_PRODUCT` jobs for products missing assets.

## Getting Pinterest OAuth Keys

1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Create a new app
3. Request access to the **Pins** and **Search** APIs
4. Generate an access token with `pins:read` and `search:read` scopes
5. Add the token to `.env.local` as `PINTEREST_ACCESS_TOKEN`

## Plugging in Retailer Feeds

### Home Depot

The `HomeDepotFeedAdapter` is designed for daily CSV/XML feed files from Home Depot's merchant program:

1. Apply for the [Home Depot Affiliate Program](https://www.homedepot.com/c/SF_MS_Affiliate_Program)
2. Once approved, you'll receive a feed URL and API key
3. Set `HOME_DEPOT_FEED_URL` and `HOME_DEPOT_API_KEY` in `.env.local`
4. Implement the feed parsing in `src/lib/ingestion/home-depot-feed.ts` (marked with TODO comments)

### Lowes

The `LowesCatalogAdapter` is designed for the Lowes B2B catalog API:

1. Apply for access at [Lowes Developer Portal](https://developer.lowes.com/)
2. Get your API key and secret
3. Set `LOWES_API_KEY` and `LOWES_API_SECRET` in `.env.local`
4. Implement the API calls in `src/lib/ingestion/lowes-catalog.ts` (marked with TODO comments)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List products with filtering |
| `/api/products/:id` | GET | Single product detail |
| `/api/inspiration` | GET | Pinterest inspiration items |

### Query Parameters

**GET /api/products**
- `category` — filter by category (e.g., `faucets`, `countertops`)
- `tags` — comma-separated tags (e.g., `modern,luxury`)
- `is_live_eligible` — `true` to only return products with prepared assets
- `search` — text search across name, brand, description
- `limit` — max results (default 50, max 200)
- `offset` — pagination offset

**GET /api/inspiration**
- `tags` — comma-separated tags
- `search` — text search
- `limit` — max results (default 30, max 100)
- `offset` — pagination offset

## Database Tables

| Table | Purpose |
|-------|---------|
| `product_sources` | Registered feed sources |
| `products` | Normalized product catalog |
| `product_images` | Product images (primary + gallery) |
| `product_assets` | Prepared assets (cutout, texture, thumbnail) |
| `product_prices` | Price history |
| `product_inventory` | Availability history |
| `ingestion_runs` | Adapter run logs |
| `inspiration_items` | Pinterest pins for inspiration |
| `job_queue` | Background job queue |

## Production Deployment

### Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Asset Prep Upgrades

The current `AssetPrepService` uses simple heuristics. For production quality:

1. **Background Removal**: Replace Sharp threshold with [rembg](https://github.com/danielgatis/rembg) or a hosted ML model
2. **Pose Scoring**: Train a lightweight classifier on product vs. lifestyle images
3. **Texture Tiling**: Use seam-carving or AI-based texture synthesis for better tiles
4. **Image Quality**: Add blur detection, resolution requirements, and color profile validation
