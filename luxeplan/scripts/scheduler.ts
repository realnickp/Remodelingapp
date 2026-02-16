#!/usr/bin/env npx tsx
// ─────────────────────────────────────────────
// Ingestion Scheduler
//
// Enqueues INGEST_SOURCE jobs for each active product source on a
// configurable schedule. Also enqueues PREP_ASSETS_FOR_PRODUCT for
// newly created products that don't have assets yet.
//
// Run manually:      npx tsx scripts/scheduler.ts
// Run as cron:       */30 * * * * cd /path/to/luxeplan && npx tsx scripts/scheduler.ts --once
// Vercel cron:       See vercel.json → crons config
// ─────────────────────────────────────────────

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getServiceClient } from "../src/lib/supabase-server";
import { enqueueJob, getQueueStats } from "../src/lib/ingestion/queue";

// ── Configuration ──

const INGEST_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const ASSET_PREP_BATCH_SIZE = 20; // Max products to prep per cycle
const RUN_ONCE = process.argv.includes("--once");

// ── Schedule Functions ──

async function scheduleIngestion(): Promise<number> {
  const db = getServiceClient();
  let enqueued = 0;

  const { data: sources } = await db
    .from("product_sources")
    .select("id, name, adapter_type")
    .eq("is_active", true);

  if (!sources?.length) {
    console.log("  No active sources found.");
    return 0;
  }

  for (const source of sources) {
    // Check if there's already a pending/running INGEST_SOURCE job for this source
    const { data: existingJob } = await db
      .from("job_queue")
      .select("id")
      .eq("job_type", "INGEST_SOURCE")
      .in("status", ["pending", "running"])
      .contains("payload", { source_id: source.id })
      .maybeSingle();

    if (existingJob) {
      console.log(`  ⏭️  ${source.name}: already has a pending/running job`);
      continue;
    }

    const jobId = await enqueueJob("INGEST_SOURCE", { source_id: source.id });
    console.log(`  📥 ${source.name}: enqueued INGEST_SOURCE (${jobId})`);
    enqueued++;
  }

  return enqueued;
}

async function scheduleAssetPrep(): Promise<number> {
  const db = getServiceClient();

  // Find products without any assets
  const { data: products } = await db
    .from("products")
    .select("id")
    .not(
      "id",
      "in",
      db.from("product_assets").select("product_id")
    )
    .limit(ASSET_PREP_BATCH_SIZE);

  if (!products?.length) {
    console.log("  No products need asset preparation.");
    return 0;
  }

  let enqueued = 0;
  for (const product of products) {
    // Check if there's already a pending/running PREP job for this product
    const { data: existingJob } = await db
      .from("job_queue")
      .select("id")
      .eq("job_type", "PREP_ASSETS_FOR_PRODUCT")
      .in("status", ["pending", "running"])
      .contains("payload", { product_id: product.id })
      .maybeSingle();

    if (existingJob) continue;

    const jobId = await enqueueJob("PREP_ASSETS_FOR_PRODUCT", {
      product_id: product.id,
    });
    console.log(`  🎨 Product ${product.id}: enqueued PREP_ASSETS (${jobId})`);
    enqueued++;
  }

  return enqueued;
}

// ── Main ──

async function runCycle() {
  console.log(`\n⏰ Scheduler cycle at ${new Date().toISOString()}`);
  console.log("────────────────────────────");

  console.log("\n📥 Scheduling ingestion jobs:");
  const ingestionCount = await scheduleIngestion();

  console.log("\n🎨 Scheduling asset prep jobs:");
  const prepCount = await scheduleAssetPrep();

  const stats = await getQueueStats();
  console.log(`\n📊 Queue stats: ${JSON.stringify(stats)}`);
  console.log(`   Enqueued: ${ingestionCount} ingestion + ${prepCount} asset prep = ${ingestionCount + prepCount} total`);
}

async function main() {
  console.log("📅 LUXEPLAN Ingestion Scheduler");
  console.log("────────────────────────────");

  if (RUN_ONCE) {
    console.log("Mode: single run (--once)");
    await runCycle();
    console.log("\n✅ Done.");
    process.exit(0);
  }

  console.log(`Mode: continuous (every ${INGEST_INTERVAL_MS / 1000}s)`);
  console.log("Press Ctrl+C to stop.\n");

  process.on("SIGINT", () => {
    console.log("\n👋 Shutting down scheduler...");
    process.exit(0);
  });

  // Run immediately, then on interval
  await runCycle();
  setInterval(runCycle, INGEST_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Fatal scheduler error:", err);
  process.exit(1);
});
