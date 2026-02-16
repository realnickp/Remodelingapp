// ─────────────────────────────────────────────
// Lowes Catalog Adapter (stub)
//
// Designed for the Lowes B2B Catalog / Product API.
// Set LOWES_API_KEY and LOWES_API_SECRET in .env.local
// when credentials are available.
// ─────────────────────────────────────────────

import type {
  ProductIngestionAdapter,
  FetchProductsResult,
  NormalizedProduct,
  NormalizedProductImage,
  NormalizedProductPrice,
  NormalizedInventory,
} from "./types";

function getApiKey() { return process.env.LOWES_API_KEY ?? ""; }
function getApiSecret() { return process.env.LOWES_API_SECRET ?? ""; }
const BASE_URL = "https://api.lowes.com/v1"; // placeholder

export class LowesCatalogAdapter implements ProductIngestionAdapter {
  readonly name = "Lowes Catalog";
  readonly supportsPricing = true;
  readonly supportsInventory = true;

  async fetchProducts(_cursor?: string): Promise<FetchProductsResult> {
    if (!getApiKey() || !getApiSecret()) {
      console.warn("[LowesCatalogAdapter] Missing API_KEY or API_SECRET — returning empty.");
      return { products: [] };
    }

    // TODO: Call Lowes catalog API with cursor pagination
    // TODO: Map response to NormalizedProduct[]
    console.log("[LowesCatalogAdapter] Would call", BASE_URL, "with key", getApiKey().slice(0, 4) + "...");

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
    // TODO: GET /products/{externalId} from Lowes API
    return null;
  }

  async fetchImages(_externalId: string): Promise<NormalizedProductImage[]> {
    // TODO: GET /products/{externalId}/images from Lowes API
    return [];
  }
}
