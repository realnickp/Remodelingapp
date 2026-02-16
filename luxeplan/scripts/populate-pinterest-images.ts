/**
 * Populate product images from Pinterest API v5.
 *
 * Usage:
 *   PINTEREST_TOKEN=<your-token> npx tsx scripts/populate-pinterest-images.ts
 *
 * Reads SEED_PRODUCTS from src/lib/products.ts, searches Pinterest for each
 * product, takes the first result's 600x image URL, and rewrites the file
 * with updated image_url values.
 */

import * as fs from "fs";
import * as path from "path";

const PINTEREST_API = "https://api.pinterest.com/v5";
const TOKEN = process.env.PINTEREST_TOKEN;
const RATE_LIMIT_MS = 200;
const PRODUCTS_FILE = path.resolve(__dirname, "../src/lib/products.ts");

interface PinSearchResult {
  items?: Array<{
    id: string;
    media?: {
      images?: {
        "600x"?: { url: string };
        originals?: { url: string };
      };
    };
  }>;
}

async function searchPins(query: string): Promise<string | null> {
  const url = `${PINTEREST_API}/search/pins?query=${encodeURIComponent(query)}&page_size=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (!res.ok) {
    console.warn(`  Pinterest API ${res.status} for query: "${query}"`);
    return null;
  }

  const data: PinSearchResult = await res.json();
  const pin = data.items?.[0];
  if (!pin?.media?.images) return null;

  return (
    pin.media.images["600x"]?.url ||
    pin.media.images.originals?.url ||
    null
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!TOKEN) {
    console.error(
      "Error: Set PINTEREST_TOKEN environment variable.\n" +
        "Get a token at https://developers.pinterest.com/"
    );
    process.exit(1);
  }

  const source = fs.readFileSync(PRODUCTS_FILE, "utf-8");

  // Parse image_url lines: find `image_url: "/products/..."` patterns
  const IMAGE_URL_RE =
    /image_url:\s*"(\/products\/[^"]+)"/g;

  const matches = [...source.matchAll(IMAGE_URL_RE)];
  console.log(`Found ${matches.length} products with local image paths.`);

  // Also extract product info for search queries
  const PRODUCT_RE =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?brand:\s*"([^"]+)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?image_url:\s*"(\/products\/[^"]+)"/g;

  const products = [...source.matchAll(PRODUCT_RE)].map((m) => ({
    id: m[1],
    name: m[2],
    brand: m[3],
    category: m[4],
    originalUrl: m[5],
  }));

  console.log(`Parsed ${products.length} products for image search.\n`);

  let updated = source;
  let successCount = 0;

  for (const product of products) {
    // Primary query: "brand name category"
    const primaryQuery = `${product.brand} ${product.name} ${product.category}`;
    let imageUrl = await searchPins(primaryQuery);

    if (!imageUrl) {
      // Fallback: simpler query
      const fallbackQuery = `${product.name} ${product.category}`;
      console.log(`  Retrying with fallback: "${fallbackQuery}"`);
      imageUrl = await searchPins(fallbackQuery);
    }

    if (imageUrl) {
      updated = updated.replace(
        `image_url: "${product.originalUrl}"`,
        `image_url: "${imageUrl}"`
      );
      console.log(`✓ ${product.id}: ${imageUrl.substring(0, 60)}...`);
      successCount++;
    } else {
      console.log(`✗ ${product.id}: no image found, keeping original`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  fs.writeFileSync(PRODUCTS_FILE, updated, "utf-8");
  console.log(
    `\nDone! Updated ${successCount}/${products.length} product images.`
  );
}

main().catch(console.error);
