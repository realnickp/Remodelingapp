// Product Ingestion System — Barrel Export

export type {
  ProductIngestionAdapter,
  FetchProductsResult,
  NormalizedProduct,
  NormalizedProductImage,
  NormalizedProductPrice,
  NormalizedInventory,
  NormalizedAsset,
  InspirationItem,
  IngestionRun,
  Job,
  JobType,
  JobStatus,
} from "./types";

export { HomeDepotFeedAdapter } from "./home-depot-feed";
export { LowesCatalogAdapter } from "./lowes-catalog";
export { PinterestInspirationAdapter } from "./pinterest-inspiration";
export { AssetPrepService } from "./asset-prep";
export { enqueueJob, dequeueJob, completeJob, failJob, getQueueStats } from "./queue";
