// ─────────────────────────────────────────────
// Pinterest Catalog Builder
//
// A standalone script that uses Pinterest search results to build an
// initial product catalog for testing. Run with:
//
//   npx tsx src/lib/ingestion/pinterest-catalog-builder.ts
//
// Prerequisites:
//   • NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set in .env.local
//   • PINTEREST_ACCESS_TOKEN set in .env.local
// ─────────────────────────────────────────────

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getServiceClient } from "@/lib/supabase-server";
import { PinterestInspirationAdapter } from "./pinterest-inspiration";

const SEARCH_QUERIES: Array<{ query: string; category: string; tags: string[] }> = [
  { query: "modern kitchen faucet matte black", category: "faucets", tags: ["modern", "matte-black", "kitchen"] },
  { query: "luxury undermount kitchen sink", category: "sinks", tags: ["luxury", "undermount", "kitchen"] },
  { query: "marble kitchen countertop calacatta", category: "countertops", tags: ["marble", "calacatta", "luxury"] },
  { query: "white shaker kitchen cabinets", category: "cabinets", tags: ["shaker", "white", "classic"] },
  { query: "zellige tile kitchen backsplash", category: "backsplash", tags: ["zellige", "artisan", "textured"] },
  { query: "wide plank white oak flooring", category: "flooring", tags: ["white-oak", "wide-plank", "scandinavian"] },
  { query: "brass pendant light kitchen island", category: "lighting", tags: ["brass", "pendant", "kitchen"] },
  { query: "round bathroom mirror brass frame", category: "mirrors", tags: ["round", "brass", "bathroom"] },
  { query: "brass cabinet hardware pulls", category: "hardware", tags: ["brass", "pulls", "modern"] },
  { query: "luxury freestanding bathtub", category: "tub", tags: ["freestanding", "luxury", "spa"] },
  { query: "modern floating bathroom vanity", category: "vanity", tags: ["floating", "modern", "bathroom"] },
  { query: "rainfall shower head system", category: "shower", tags: ["rainfall", "luxury", "spa"] },
];

async function main() {
  console.log("🔧 Pinterest Catalog Builder");
  console.log("────────────────────────────");

  const db = getServiceClient();

  // Ensure the Pinterest source exists
  const { data: source } = await db
    .from("product_sources")
    .select("id")
    .eq("adapter_type", "pinterest")
    .single();

  if (!source) {
    console.error("❌ Pinterest source not found in product_sources. Run migration 002 first.");
    process.exit(1);
  }

  const adapter = new PinterestInspirationAdapter();
  let totalInserted = 0;

  for (const entry of SEARCH_QUERIES) {
    console.log(`\n🔍 Searching: "${entry.query}"...`);
    try {
      const { products } = await adapter.fetchProducts();

      // Filter for items that got saved as inspiration_items
      // Now promote them to proper products
      const { promoted, errors } = await adapter.promoteInspirationItems(source.id, 10);

      console.log(`   ✅ Promoted ${promoted} products`);
      if (errors.length) {
        console.log(`   ⚠️  Errors: ${errors.join("; ")}`);
      }
      totalInserted += promoted;

      // Also insert any extra products directly from search results
      for (const product of products.slice(0, 5)) {
        const { data: existing } = await db
          .from("products")
          .select("id")
          .eq("external_id", product.external_id)
          .eq("source_id", source.id)
          .maybeSingle();

        if (existing) continue;

        const { data: inserted, error: insertErr } = await db
          .from("products")
          .insert({
            ...product,
            source_id: source.id,
            category: entry.category,
            tags: entry.tags,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.log(`   ⚠️  Insert error: ${insertErr.message}`);
          continue;
        }

        // Insert primary image (from product_url or pinterest image)
        if (inserted && product.product_url) {
          await db.from("product_images").insert({
            product_id: inserted.id,
            image_url: product.product_url,
            type: "primary",
          });
        }

        totalInserted++;
      }
    } catch (err) {
      console.error(`   ❌ Error for "${entry.query}":`, err);
    }
  }

  console.log(`\n────────────────────────────`);
  console.log(`✅ Done! Inserted ${totalInserted} products total.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
