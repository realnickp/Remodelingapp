#!/usr/bin/env npx tsx
// ─────────────────────────────────────────────
// Job Queue Worker
//
// Polls the job_queue table and dispatches each job to the appropriate
// adapter or service. Run with:
//
//   npx tsx scripts/worker.ts
//
// Environment: reads from .env.local (loaded via dotenv)
// ─────────────────────────────────────────────

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { dequeueJob, completeJob, failJob, getQueueStats } from "../src/lib/ingestion/queue";
import { HomeDepotFeedAdapter } from "../src/lib/ingestion/home-depot-feed";
import { LowesCatalogAdapter } from "../src/lib/ingestion/lowes-catalog";
import { PinterestInspirationAdapter } from "../src/lib/ingestion/pinterest-inspiration";
import { AssetPrepService } from "../src/lib/ingestion/asset-prep";
import { getServiceClient } from "../src/lib/supabase-server";
import type { Job } from "../src/lib/ingestion/types";

const POLL_INTERVAL_MS = 2_000; // 2 seconds between polls
const MAX_CONSECUTIVE_EMPTY = 30; // After 30 empty polls (60s), log stats
let consecutiveEmpty = 0;

// ── Adapter registry ──

function getAdapter(adapterType: string) {
  switch (adapterType) {
    case "home_depot_feed":
      return new HomeDepotFeedAdapter();
    case "lowes_catalog":
      return new LowesCatalogAdapter();
    case "pinterest":
      return new PinterestInspirationAdapter();
    default:
      throw new Error(`Unknown adapter type: ${adapterType}`);
  }
}

// ── Job handlers ──

async function handleIngestSource(job: Job): Promise<void> {
  const sourceId = job.payload.source_id as string;
  if (!sourceId) throw new Error("Missing source_id in payload");

  const db = getServiceClient();
  const { data: source, error } = await db
    .from("product_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (error || !source) throw new Error(`Source not found: ${sourceId}`);
  if (!source.is_active) {
    console.log(`  ⏭️  Source "${source.name}" is inactive, skipping.`);
    return;
  }

  // Create ingestion run
  const { data: run } = await db
    .from("ingestion_runs")
    .insert({
      source_id: sourceId,
      status: "running",
    })
    .select("id")
    .single();

  const adapter = getAdapter(source.adapter_type);
  let cursor: string | undefined;
  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  const errors: string[] = [];

  try {
    do {
      const { products, nextCursor } = await adapter.fetchProducts(cursor);
      totalFetched += products.length;
      cursor = nextCursor;

      for (const product of products) {
        try {
          // Upsert product
          const { data: existing } = await db
            .from("products")
            .select("id")
            .eq("source_id", sourceId)
            .eq("external_id", product.external_id)
            .maybeSingle();

          if (existing) {
            await db
              .from("products")
              .update({ ...product, source_id: sourceId })
              .eq("id", existing.id);
            totalUpdated++;
          } else {
            const { data: inserted } = await db
              .from("products")
              .insert({ ...product, source_id: sourceId })
              .select("id")
              .single();

            if (inserted) {
              totalCreated++;

              // Fetch and store images
              const images = await adapter.fetchImages(product.external_id);
              for (const img of images) {
                await db
                  .from("product_images")
                  .insert({ ...img, product_id: inserted.id });
              }
            }
          }
        } catch (err) {
          errors.push(`Product ${product.external_id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } while (cursor);

    // Update run
    if (run) {
      await db
        .from("ingestion_runs")
        .update({
          status: "completed",
          products_fetched: totalFetched,
          products_created: totalCreated,
          products_updated: totalUpdated,
          errors,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }

    console.log(
      `  📦 Ingestion complete: ${totalFetched} fetched, ${totalCreated} created, ${totalUpdated} updated`
    );
  } catch (err) {
    if (run) {
      await db
        .from("ingestion_runs")
        .update({
          status: "failed",
          errors: [...errors, err instanceof Error ? err.message : String(err)],
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }
    throw err;
  }
}

async function handlePrepAssets(job: Job): Promise<void> {
  const productId = job.payload.product_id as string;
  if (!productId) throw new Error("Missing product_id in payload");

  const service = new AssetPrepService();
  const result = await service.prepareAssets(productId);

  if (result.rejected) {
    console.log(`  ⚠️  Product ${productId} rejected: ${result.rejectionReason}`);
  } else {
    console.log(`  ✅ Prepared ${result.assets.length} assets for ${productId}`);
  }
}

async function handleRefreshPrice(job: Job): Promise<void> {
  const productId = job.payload.product_id as string;
  const sourceId = job.payload.source_id as string;
  if (!productId || !sourceId) throw new Error("Missing product_id or source_id");

  const db = getServiceClient();
  const { data: source } = await db
    .from("product_sources")
    .select("adapter_type")
    .eq("id", sourceId)
    .single();

  if (!source) throw new Error(`Source not found: ${sourceId}`);

  const adapter = getAdapter(source.adapter_type);
  if (!adapter.supportsPricing) {
    console.log("  ⏭️  Adapter does not support pricing");
    return;
  }

  const { data: product } = await db
    .from("products")
    .select("external_id")
    .eq("id", productId)
    .single();

  if (!product) throw new Error(`Product not found: ${productId}`);

  const detail = await adapter.fetchProductDetails(product.external_id);
  if (detail?.price) {
    await db.from("product_prices").insert({
      ...detail.price,
      product_id: productId,
    });
    console.log(`  💰 Price refreshed for ${productId}: $${detail.price.price}`);
  }
}

async function handleRefreshInventory(job: Job): Promise<void> {
  const productId = job.payload.product_id as string;
  const sourceId = job.payload.source_id as string;
  if (!productId || !sourceId) throw new Error("Missing product_id or source_id");

  const db = getServiceClient();
  const { data: source } = await db
    .from("product_sources")
    .select("adapter_type")
    .eq("id", sourceId)
    .single();

  if (!source) throw new Error(`Source not found: ${sourceId}`);

  const adapter = getAdapter(source.adapter_type);
  if (!adapter.supportsInventory) {
    console.log("  ⏭️  Adapter does not support inventory");
    return;
  }

  const { data: product } = await db
    .from("products")
    .select("external_id")
    .eq("id", productId)
    .single();

  if (!product) throw new Error(`Product not found: ${productId}`);

  const detail = await adapter.fetchProductDetails(product.external_id);
  if (detail?.inventory) {
    await db.from("product_inventory").insert({
      ...detail.inventory,
      product_id: productId,
    });
    console.log(`  📦 Inventory refreshed for ${productId}: ${detail.inventory.availability}`);
  }
}

// ── Dispatcher ──

async function dispatch(job: Job): Promise<void> {
  switch (job.job_type) {
    case "INGEST_SOURCE":
      return handleIngestSource(job);
    case "PREP_ASSETS_FOR_PRODUCT":
      return handlePrepAssets(job);
    case "REFRESH_PRICE":
      return handleRefreshPrice(job);
    case "REFRESH_INVENTORY":
      return handleRefreshInventory(job);
    default:
      throw new Error(`Unknown job type: ${job.job_type}`);
  }
}

// ── Main Loop ──

async function poll() {
  const job = await dequeueJob();

  if (!job) {
    consecutiveEmpty++;
    if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
      const stats = await getQueueStats();
      console.log(`📊 Queue stats: ${JSON.stringify(stats)}`);
      consecutiveEmpty = 0;
    }
    return;
  }

  consecutiveEmpty = 0;
  console.log(`\n🔄 Processing job ${job.id} [${job.job_type}] (attempt ${job.attempts})`);

  try {
    await dispatch(job);
    await completeJob(job.id);
    console.log(`✅ Job ${job.id} completed`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Job ${job.id} failed: ${message}`);
    await failJob(job.id, message);
  }
}

async function main() {
  console.log("🏗️  LUXEPLAN Job Queue Worker");
  console.log("────────────────────────────");
  console.log(`Polling every ${POLL_INTERVAL_MS}ms...`);
  console.log("Press Ctrl+C to stop.\n");

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n👋 Shutting down worker...");
    process.exit(0);
  });

  // Poll loop
  while (true) {
    try {
      await poll();
    } catch (err) {
      console.error("Worker loop error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main();
