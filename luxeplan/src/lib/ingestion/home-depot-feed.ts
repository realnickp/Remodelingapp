// ─────────────────────────────────────────────
// Home Depot Feed Adapter (stub)
//
// Designed for daily CSV / XML product feed files supplied by
// Home Depot's merchant program. Populate HOME_DEPOT_FEED_URL and
// HOME_DEPOT_API_KEY in .env.local when credentials are available.
// ─────────────────────────────────────────────

import type {
  ProductIngestionAdapter,
  FetchProductsResult,
  NormalizedProduct,
  NormalizedProductImage,
  NormalizedProductPrice,
  NormalizedInventory,
} from "./types";

function getFeedUrl() { return process.env.HOME_DEPOT_FEED_URL ?? ""; }
function getApiKey() { return process.env.HOME_DEPOT_API_KEY ?? ""; }

export class HomeDepotFeedAdapter implements ProductIngestionAdapter {
  readonly name = "Home Depot Feed";
  readonly supportsPricing = true;
  readonly supportsInventory = true;

  async fetchProducts(_cursor?: string): Promise<FetchProductsResult> {
    if (!getFeedUrl() || !getApiKey()) {
      console.warn("[HomeDepotFeedAdapter] Missing FEED_URL or API_KEY — returning empty.");
      return { products: [] };
    }

    // TODO: Download feed file from FEED_URL
    // TODO: Parse CSV/XML rows into NormalizedProduct[]
    // TODO: Implement cursor-based pagination over rows

    const products: NormalizedProduct[] = [];
    return { products };
  }

  async fetchProductDetails(
    _externalId: string
  ): Promise<{
    product: NormalizedProduct;
    images: NormalizedProductImage[];
    price?: NormalizedProductPrice;
    inventory?: NormalizedInventory;
  } | null> {
    // TODO: Look up a single product from the feed or via the HD API
    return null;
  }

  async fetchImages(_externalId: string): Promise<NormalizedProductImage[]> {
    // TODO: Extract image URLs from the feed row
    return [];
  }
}
