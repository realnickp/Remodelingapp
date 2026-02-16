// ─────────────────────────────────────────────
// Product Ingestion — Shared Types & Adapter Interface
// ─────────────────────────────────────────────

import type { ProductCategory } from "@/types";

/** Matches the `products` database table. */
export interface NormalizedProduct {
  id?: string; // UUID — omit when inserting (auto-generated)
  source_id: string;
  external_id: string;
  retailer?: string;
  brand: string;
  name: string;
  category: ProductCategory;
  description?: string;
  product_url?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/** Matches `product_images` table. */
export interface NormalizedProductImage {
  product_id: string;
  image_url: string;
  type: "primary" | "gallery";
  width?: number;
  height?: number;
}

/** Matches `product_prices` table. */
export interface NormalizedProductPrice {
  product_id: string;
  price: number;
  currency?: string;
  unit?: "each" | "sqft" | "linear_ft";
}

/** Matches `product_inventory` table. */
export interface NormalizedInventory {
  product_id: string;
  availability: "in_stock" | "out_of_stock" | "limited" | "unknown";
}

/** Matches `product_assets` table. */
export interface NormalizedAsset {
  product_id: string;
  asset_type: "cutout_png" | "texture_tile" | "thumbnail";
  asset_url: string;
  pose_score?: number;
  is_live_eligible?: boolean;
  rejection_reason?: string;
}

/** Matches `inspiration_items` table. */
export interface InspirationItem {
  pin_id?: string;
  board_id?: string;
  image_url: string;
  title?: string;
  description?: string;
  tags?: string[];
  source_url?: string;
  promoted_product_id?: string;
}

/** Matches `ingestion_runs` table. */
export interface IngestionRun {
  id?: string;
  source_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  products_fetched: number;
  products_created: number;
  products_updated: number;
  errors: unknown[];
  started_at?: string;
  completed_at?: string;
}

/** Matches `job_queue` table. */
export type JobType =
  | "INGEST_SOURCE"
  | "PREP_ASSETS_FOR_PRODUCT"
  | "REFRESH_PRICE"
  | "REFRESH_INVENTORY";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface Job {
  id: string;
  job_type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  locked_at?: string;
  completed_at?: string;
  error?: string;
  created_at: string;
}

// ── Adapter Interface ──

export interface FetchProductsResult {
  products: NormalizedProduct[];
  nextCursor?: string;
}

export interface ProductIngestionAdapter {
  /** Human-readable name of this adapter. */
  readonly name: string;

  /** Whether this adapter can return pricing data. */
  readonly supportsPricing: boolean;

  /** Whether this adapter can return inventory/availability. */
  readonly supportsInventory: boolean;

  /** Fetch a page of products. Pass `cursor` for pagination. */
  fetchProducts(cursor?: string): Promise<FetchProductsResult>;

  /** Fetch full detail for a single product by external ID. */
  fetchProductDetails(
    externalId: string
  ): Promise<{
    product: NormalizedProduct;
    images: NormalizedProductImage[];
    price?: NormalizedProductPrice;
    inventory?: NormalizedInventory;
  } | null>;

  /** Fetch image URLs for a product by external ID. */
  fetchImages(externalId: string): Promise<NormalizedProductImage[]>;
}
