// ─────────────────────────────────────────────
// Pinterest Inspiration Adapter
//
// Uses Pinterest API v5 to search for pins matching home-remodeling
// keywords, extract product-like data, and write to inspiration_items.
// Can also "promote" inspiration items to the products table.
//
// Set PINTEREST_ACCESS_TOKEN in .env.local.
// ─────────────────────────────────────────────

import type {
  ProductIngestionAdapter,
  FetchProductsResult,
  NormalizedProduct,
  NormalizedProductImage,
  InspirationItem,
} from "./types";
import type { ProductCategory } from "@/types";
import { getServiceClient } from "@/lib/supabase-server";

const PINTEREST_API = "https://api.pinterest.com/v5";

function getAccessToken(): string {
  return process.env.PINTEREST_ACCESS_TOKEN ?? "";
}

// ── Helpers ──

async function pinterestFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const ACCESS_TOKEN = getAccessToken();
  const url = new URL(`${PINTEREST_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinterest API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

interface PinSearchResponse {
  items: Array<{
    id: string;
    title?: string;
    description?: string;
    media?: { images?: { "600x"?: { url: string; width: number; height: number } } };
    link?: string;
    board_id?: string;
  }>;
  bookmark?: string;
}

function pinToInspiration(pin: PinSearchResponse["items"][number], tags: string[]): InspirationItem {
  const imageUrl =
    pin.media?.images?.["600x"]?.url ?? "";
  return {
    pin_id: pin.id,
    board_id: pin.board_id,
    image_url: imageUrl,
    title: pin.title,
    description: pin.description,
    tags,
    source_url: pin.link ?? `https://www.pinterest.com/pin/${pin.id}/`,
  };
}

function guessCategory(text: string): ProductCategory {
  const lower = text.toLowerCase();
  const map: Array<[string, ProductCategory]> = [
    ["faucet", "faucets"],
    ["sink", "sinks"],
    ["countertop", "countertops"],
    ["counter", "countertops"],
    ["cabinet", "cabinets"],
    ["backsplash", "backsplash"],
    ["tile", "backsplash"],
    ["floor", "flooring"],
    ["light", "lighting"],
    ["mirror", "mirrors"],
    ["hardware", "hardware"],
    ["knob", "hardware"],
    ["pull", "hardware"],
    ["appliance", "appliances"],
    ["range", "appliances"],
    ["refrigerator", "appliances"],
    ["shower", "shower"],
    ["tub", "tub"],
    ["bath", "tub"],
    ["vanity", "vanity"],
    ["toilet", "toilet"],
  ];
  for (const [kw, cat] of map) {
    if (lower.includes(kw)) return cat;
  }
  return "fixtures";
}

function guessBrand(title: string): string {
  // First two words are often the brand in Pinterest titles
  const words = (title ?? "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.slice(0, 2).join(" ");
  if (words.length === 1) return words[0];
  return "Unknown";
}

// ── Adapter ──

export class PinterestInspirationAdapter implements ProductIngestionAdapter {
  readonly name = "Pinterest Inspiration";
  readonly supportsPricing = false;
  readonly supportsInventory = false;

  /**
   * Search Pinterest for pins and save them as inspiration_items.
   * `cursor` is the Pinterest "bookmark" for pagination.
   */
  async fetchProducts(cursor?: string): Promise<FetchProductsResult> {
    if (!getAccessToken()) {
      console.warn("[PinterestInspirationAdapter] Missing PINTEREST_ACCESS_TOKEN — returning empty.");
      return { products: [] };
    }

    // Search a set of home-remodel keywords
    const keywords = [
      "kitchen faucet matte black",
      "modern kitchen countertop",
      "luxury bathroom vanity",
      "kitchen backsplash tile",
      "hardwood flooring kitchen",
      "modern bathroom shower",
    ];

    const allInspiration: InspirationItem[] = [];
    let nextCursor: string | undefined;

    for (const query of keywords) {
      const params: Record<string, string> = { query, page_size: "25" };
      if (cursor) params.bookmark = cursor;

      const data = await pinterestFetch<PinSearchResponse>("/search/pins", params);
      const tags = query.split(" ");
      for (const pin of data.items ?? []) {
        allInspiration.push(pinToInspiration(pin, tags));
      }
      if (data.bookmark) nextCursor = data.bookmark;
    }

    // Upsert into inspiration_items
    const db = getServiceClient();
    if (allInspiration.length > 0) {
      const { error } = await db
        .from("inspiration_items")
        .upsert(allInspiration, { onConflict: "pin_id" });
      if (error) console.error("[PinterestInspirationAdapter] upsert error:", error.message);
    }

    // Return as NormalizedProduct (lightweight — no external_id yet)
    const products: NormalizedProduct[] = allInspiration.map((item) => ({
      source_id: "", // filled by caller
      external_id: item.pin_id ?? "",
      brand: guessBrand(item.title ?? ""),
      name: item.title ?? "Untitled",
      category: guessCategory(`${item.title} ${item.description}`),
      description: item.description,
      product_url: item.source_url,
      tags: item.tags,
    }));

    return { products, nextCursor };
  }

  async fetchProductDetails(_externalId: string) {
    // Pinterest doesn't have a product detail endpoint — return null
    return null;
  }

  async fetchImages(externalId: string): Promise<NormalizedProductImage[]> {
    if (!getAccessToken()) return [];

    // Fetch pin by ID and return its image
    const pin = await pinterestFetch<PinSearchResponse["items"][number]>(
      `/pins/${externalId}`
    );
    const url = pin.media?.images?.["600x"]?.url;
    if (!url) return [];
    return [
      {
        product_id: "", // filled by caller
        image_url: url,
        type: "primary" as const,
        width: pin.media?.images?.["600x"]?.width,
        height: pin.media?.images?.["600x"]?.height,
      },
    ];
  }

  // ── Promotion: inspiration → products table ──

  /**
   * Promote a batch of inspiration items to the products table.
   * Creates product + product_images rows and links the inspiration item.
   */
  async promoteInspirationItems(
    sourceId: string,
    limit = 50
  ): Promise<{ promoted: number; errors: string[] }> {
    const db = getServiceClient();
    const { data: items, error } = await db
      .from("inspiration_items")
      .select("*")
      .is("promoted_product_id", null)
      .not("image_url", "eq", "")
      .limit(limit);

    if (error || !items) {
      return { promoted: 0, errors: [error?.message ?? "No items found"] };
    }

    let promoted = 0;
    const errors: string[] = [];

    for (const item of items) {
      const category = guessCategory(`${item.title} ${item.description}`);
      const brand = guessBrand(item.title ?? "");

      // Insert product
      const { data: product, error: pErr } = await db
        .from("products")
        .insert({
          source_id: sourceId,
          external_id: item.pin_id,
          retailer: "Pinterest",
          brand,
          name: item.title ?? "Untitled",
          category,
          description: item.description,
          product_url: item.source_url,
          tags: item.tags ?? [],
          metadata: { pinterest_pin_id: item.pin_id },
        })
        .select("id")
        .single();

      if (pErr || !product) {
        errors.push(`Product insert failed for pin ${item.pin_id}: ${pErr?.message}`);
        continue;
      }

      // Insert image
      if (item.image_url) {
        await db.from("product_images").insert({
          product_id: product.id,
          image_url: item.image_url,
          type: "primary",
        });
      }

      // Link back
      await db
        .from("inspiration_items")
        .update({ promoted_product_id: product.id })
        .eq("id", item.id);

      promoted++;
    }

    return { promoted, errors };
  }
}
