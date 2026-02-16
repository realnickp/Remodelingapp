import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getServiceClient } from "@/lib/supabase-server";
import { SEED_PRODUCTS } from "@/lib/products";

/**
 * GET /api/products
 *
 * Query parameters:
 *   - category: filter by product category
 *   - tags: comma-separated tag filter (any match)
 *   - is_live_eligible: "true" to only return products with live-eligible assets
 *   - limit: max results (default 50)
 *   - offset: pagination offset (default 0)
 *   - search: text search in name/brand/description
 *
 * Falls back to SEED_PRODUCTS when Supabase is not configured.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const tagsParam = searchParams.get("tags");
  const isLiveEligible = searchParams.get("is_live_eligible") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const search = searchParams.get("search");

  // ── Fallback to seed data ──
  if (!isSupabaseConfigured()) {
    let filtered = [...SEED_PRODUCTS];

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (tagsParam) {
      const tags = tagsParam.split(",").map((t) => t.trim().toLowerCase());
      filtered = filtered.filter((p) =>
        p.style_tags.some((st) => tags.includes(st.toLowerCase()))
      );
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      products: paginated,
      total,
      offset,
      limit,
      source: "seed",
    });
  }

  // ── Query from database ──
  try {
    const db = getServiceClient();

    let query = db
      .from("products")
      .select(
        `
        *,
        product_images (id, image_url, type, width, height),
        product_assets (id, asset_type, asset_url, pose_score, is_live_eligible)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("category", category);
    }

    if (tagsParam) {
      const tags = tagsParam.split(",").map((t) => t.trim());
      query = query.overlaps("tags", tags);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,brand.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (isLiveEligible) {
      query = query.not("product_assets", "is", null);
    }

    const { data: products, count, error } = await query;

    if (error) {
      console.error("[GET /api/products] DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter for live-eligible in JS if needed (nested filter not supported in all Supabase versions)
    let filtered = products ?? [];
    if (isLiveEligible) {
      filtered = filtered.filter((p: Record<string, unknown>) => {
        const assets = p.product_assets as Array<{ is_live_eligible: boolean }> | undefined;
        return assets?.some((a) => a.is_live_eligible);
      });
    }

    return NextResponse.json({
      products: filtered,
      total: count ?? filtered.length,
      offset,
      limit,
      source: "database",
    });
  } catch (err) {
    console.error("[GET /api/products] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
