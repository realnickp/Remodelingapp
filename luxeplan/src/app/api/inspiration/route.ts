import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getServiceClient } from "@/lib/supabase-server";

/**
 * GET /api/inspiration
 *
 * Returns Pinterest-sourced inspiration items.
 *
 * Query parameters:
 *   - tags: comma-separated tag filter (any match)
 *   - search: text search in title/description
 *   - limit: max results (default 30)
 *   - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tagsParam = searchParams.get("tags");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      items: [],
      total: 0,
      offset,
      limit,
      message:
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable inspiration items.",
    });
  }

  try {
    const db = getServiceClient();

    let query = db
      .from("inspiration_items")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tagsParam) {
      const tags = tagsParam.split(",").map((t) => t.trim());
      query = query.overlaps("tags", tags);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data: items, count, error } = await query;

    if (error) {
      console.error("[GET /api/inspiration] DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: items ?? [],
      total: count ?? 0,
      offset,
      limit,
    });
  } catch (err) {
    console.error("[GET /api/inspiration] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
