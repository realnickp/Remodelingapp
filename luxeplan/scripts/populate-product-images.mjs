#!/usr/bin/env node
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

/**
 * Populate public/products/ with relevant product images (Roomvo-style).
 * Uses Unsplash API search by product name + material + category so each
 * image matches the product (e.g. marble for Calacatta, wood for cabinets).
 *
 * Requires: UNSPLASH_ACCESS_KEY in env or .env.local (50 req/hr on free tier).
 * Run from project root: node scripts/populate-product-images.mjs
 *
 * Rate limit: script processes in batches of 50 with ~72s delay between
 * requests so you stay under 50/hour. Run multiple times or overnight for 140+ products.
 */

import fs from "fs";
import path from "path";
const projectRoot = path.resolve(__dirname, "..");
const productsPath = path.join(projectRoot, "src/lib/products.ts");
const publicProductsDir = path.join(projectRoot, "public/products");

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const RATE_LIMIT_DELAY_MS = 72 * 1000; // ~50 requests per hour
const MAX_REQUESTS_PER_RUN = 50;

function extractProducts(content) {
  const products = [];
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.includes("image_url:")) continue;
    const nameM = line.match(/name:\s*"([^"]+)"/);
    const catM = line.match(/category:\s*"([^"]+)"/);
    const urlM = line.match(/image_url:\s*"(\/products\/[^"]+)"/);
    const matM = line.match(/material:\s*"([^"]*)"/);
    if (urlM) {
      products.push({
        name: (nameM?.[1] || "").trim(),
        category: (catM?.[1] || "").trim(),
        image_url: urlM[1].trim(),
        material: (matM?.[1] || "").trim(),
      });
    }
  }
  return products;
}

function buildSearchQuery(product) {
  const { name, material, category } = product;
  const parts = [];
  if (name) parts.push(name);
  if (material) parts.push(material);
  const cat = category.replace(/-/g, " ");
  if (cat && !parts.some((p) => p.toLowerCase().includes(cat))) parts.push(cat);
  const query = parts.slice(0, 4).join(" ").trim();
  return query || category;
}

async function fetchUnsplashImage(query) {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error("UNSPLASH_ACCESS_KEY is not set. Add it to .env.local or export it.");
  }
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Unsplash API ${res.status}: ${t}`);
  }
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit?.urls?.regular) return null;
  const imgRes = await fetch(hit.urls.regular, { redirect: "follow" });
  if (!imgRes.ok) return null;
  return Buffer.from(await imgRes.arrayBuffer());
}

async function main() {
  if (!UNSPLASH_ACCESS_KEY) {
    console.error("UNSPLASH_ACCESS_KEY is required. Get a free key at https://unsplash.com/developers");
    process.exit(1);
  }

  const content = fs.readFileSync(productsPath, "utf-8");
  const products = extractProducts(content);
  const seen = new Set();
  const unique = products.filter((p) => {
    if (seen.has(p.image_url)) return false;
    seen.add(p.image_url);
    return true;
  });

  console.log(`Found ${unique.length} product image paths. Unsplash free tier: 50 req/hr.`);
  console.log(`This run will process up to ${MAX_REQUESTS_PER_RUN} images. Re-run to continue.\n`);

  if (!fs.existsSync(publicProductsDir)) {
    fs.mkdirSync(publicProductsDir, { recursive: true });
  }

  let ok = 0;
  let err = 0;
  let count = 0;
  for (const product of unique) {
    if (count >= MAX_REQUESTS_PER_RUN) {
      console.log(`\nReached ${MAX_REQUESTS_PER_RUN} requests. Run again in ~1 hour to continue.`);
      break;
    }
    const fullPath = path.join(projectRoot, "public", product.image_url);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const query = buildSearchQuery(product);
    try {
      const buffer = await fetchUnsplashImage(query);
      if (buffer) {
        fs.writeFileSync(fullPath, buffer);
        console.log(`  OK ${product.image_url} (${query})`);
        ok++;
      } else {
        console.log(`  SKIP ${product.image_url} (no result for "${query}")`);
      }
      count++;
    } catch (e) {
      console.error(`  FAIL ${product.image_url}: ${e.message}`);
      err++;
      count++;
    }
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
  }

  console.log(`\nDone. ${ok} saved, ${err} failed. Processed ${count} this run.`);
  process.exit(err > 0 ? 1 : 0);
}

main();
