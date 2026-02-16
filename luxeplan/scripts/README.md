# Scripts

## populate-product-images.mjs

Fills `public/products/` with **relevant** product images so the Roomvo-style instant preview works. Uses the [Unsplash API](https://unsplash.com/documentation#search-photos) to search by product name, material, and category (e.g. "Calacatta marble countertop", "white oak flooring").

- **Requires:** `UNSPLASH_ACCESS_KEY` in `.env.local` or as an env var. Get a free key at [Unsplash Developers](https://unsplash.com/developers) (50 requests/hour on demo).
- **Run:** From project root: `node scripts/populate-product-images.mjs`
- **Rate limit:** The script processes up to 50 images per run with a ~72s delay between requests so you stay under the hourly limit. Re-run after an hour to continue; for 140+ products, run a few times or overnight.
- **Result:** Each product gets an image that matches its type (marble, wood, tile, etc.). The studio instant overlay uses these in AI-identified surface regions.
