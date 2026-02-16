import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getServiceClient } from "@/lib/supabase-server";
import { getProductById } from "@/lib/products";

/**
 * GET /api/products/:id
 *
 * Returns a single product with its images, assets, latest price, and inventory.
 * Falls back to SEED_PRODUCTS when Supabase is not configured.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── Fallback to seed data ──
  if (!isSupabaseConfigured()) {
    const product = getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ product, source: "seed" });
  }

  // ── Query from database ──
  try {
    const db = getServiceClient();

    const { data: product, error } = await db
      .from("products")
      .select(
        `
        *,
        product_images (id, image_url, type, width, height),
        product_assets (id, asset_type, asset_url, pose_score, is_live_eligible, rejection_reason),
        product_prices (id, price, currency, unit, effective_at),
        product_inventory (id, availability, effective_at)
      `
      )
      .eq("id", id)
      .single();

    if (error || !product) {
      // Try as seed product
      const seedProduct = getProductById(id);
      if (seedProduct) {
        return NextResponse.json({ product: seedProduct, source: "seed" });
      }
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    type ProductRow = {
      product_prices?: Array<{ effective_at: string }>;
      product_inventory?: Array<{ effective_at: string; availability?: string }>;
      [key: string]: unknown;
    };
    const row = product as ProductRow;

    // Sort prices and inventory by most recent
    const prices = row.product_prices ?? [];
    prices.sort(
      (a, b) =>
        new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime()
    );

    const inventory = row.product_inventory ?? [];
    inventory.sort(
      (a, b) =>
        new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime()
    );

    return NextResponse.json({
      product: {
        ...row,
        product_prices: prices,
        product_inventory: inventory,
        current_price: prices[0] ?? null,
        current_availability: inventory[0]?.availability ?? "unknown",
      },
      source: "database",
    });
  } catch (err) {
    console.error(`[GET /api/products/${id}] Error:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
