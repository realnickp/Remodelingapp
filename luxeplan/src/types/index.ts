// ─────────────────────────────────────────────
// LUXEPLAN Core Types
// ─────────────────────────────────────────────

export type RoomType = "kitchen" | "bathroom";

export type ProductCategory =
  | "faucets"
  | "sinks"
  | "countertops"
  | "cabinets"
  | "backsplash"
  | "flooring"
  | "lighting"
  | "mirrors"
  | "hardware"
  | "appliances"
  | "fixtures"
  | "shower"
  | "tub"
  | "vanity"
  | "toilet"
  | "walls"
  | "islands"
  | "storage"
  | "windows"
  | "doors";

export type DesignStyle =
  | "soft-scandinavian-natural"
  | "organic-transitional-marble-luxe"
  | "modern-black-contrast"
  | "navy-brushed-brass-classic"
  | "earthy-organic-modern"
  | "minimal-stone-matte-black-spa"
  | "warm-brass-herringbone-marble"
  | "light-modern-coastal-neutral";

export interface StyleRenderItem {
  category: string;
  name: string;
  material?: string;
  finish?: string;
  estimatedCost?: number;
}

export type KitchenLayout =
  | "l-shape"
  | "u-shape"
  | "galley"
  | "single-wall"
  | "island"
  | "peninsula"
  | "open-concept"
  | "g-shape";

export type BathroomLayout =
  | "full-bath"
  | "three-quarter"
  | "half-bath"
  | "jack-and-jill"
  | "master-suite"
  | "wet-room"
  | "narrow-long"
  | "l-shape";

export type RoomLayout = KitchenLayout | BathroomLayout;

export type OnboardingStep = "room-type" | "style" | "layout" | "upload";

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  image_url: string;
  alpha_png_url?: string;
  thumbnail_url?: string;
  description: string;
  material?: string;
  finish?: string;
  color?: string;
  dimensions?: { width: number; height: number; depth?: number };
  room_type: RoomType[];
  is_insertion_ready: boolean;
  pose_rating?: number;
  style_tags: string[];
  created_at: string;
}

export interface AnchorPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  plane: "wall" | "floor" | "countertop" | "ceiling";
}

export interface SegmentationMask {
  label: string;
  mask_url: string;
  polygon: Array<[number, number]>;
  area: number;
}

export interface PlaneInfo {
  label: string;
  normal: [number, number, number];
  distance: number;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface VisionAnalysis {
  image_id: string;
  width: number;
  height: number;
  segments: SegmentationMask[];
  anchors: AnchorPoint[];
  depth_map_url: string;
  planes: PlaneInfo[];
  room_type: RoomType;
}

export interface PlacementResult {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z_order: number;
  shadow_plane: "floor" | "wall" | "countertop" | "ceiling";
  occlusion_mask?: string;
}

export interface DesignSelection {
  id: string;
  product: Product;
  placement: PlacementResult;
  added_at: string;
}

export interface BudgetEstimate {
  low: number;
  high: number;
  line_items: BudgetLineItem[];
  labor_estimate_low: number;
  labor_estimate_high: number;
  total_low: number;
  total_high: number;
}

export interface BudgetLineItem {
  category: string;
  product_name: string;
  material_cost: number;
  labor_cost_low: number;
  labor_cost_high: number;
}

export interface DesignVersion {
  id: string;
  version_number: number;
  thumbnail_url: string;
  selections: DesignSelection[];
  budget: BudgetEstimate;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  room_type: RoomType;
  original_image_url: string;
  vision_analysis?: VisionAnalysis;
  versions: DesignVersion[];
  current_version_id: string;
  zip_code?: string;
  design_style?: DesignStyle;
  room_layout?: RoomLayout;
  created_at: string;
  updated_at: string;
}

export interface GeminiGuidance {
  style_summary: string;
  color_palette: string[];
  recommended_product_ids: string[];
  budget_warnings: string[];
}

export interface ConceptRender {
  id: string;
  image_url: string;
  changes_summary: string[];
  created_at: string;
}

export type StudioMode = "live" | "concept";
export type UploadStep = "landing" | "uploading" | "analyzing" | "ready";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  region?: { x: number; y: number; width: number; height: number };
  timestamp: string;
}

// ─────────────────────────────────────────────
// Design State — stable data model for the compositing pipeline
// ─────────────────────────────────────────────

export type SurfaceCategory = "flooring" | "backsplash" | "countertops" | "cabinets" | "wall_paint";
export type FixtureCategory = "faucets" | "sinks" | "shower" | "lighting" | "mirrors";

export interface SurfaceSelection {
  productId: string;
  textureUrl: string;          // URL to a tileable texture image
  color?: string;              // fallback solid color
  material?: string;
  finish?: string;
}

export interface FixtureSelection {
  productId: string;
  imageUrl: string;            // cutout PNG
  anchorLabel?: string;        // which anchor to place at
}

export interface DesignState {
  activeImageId: string;
  surfaces: Partial<Record<SurfaceCategory, SurfaceSelection>>;
  fixtures: Partial<Record<FixtureCategory, FixtureSelection>>;
}

export interface VisionMasks {
  width: number;
  height: number;
  masks: Array<{
    label: string;
    mask_b64: string;
    polygon: number[][];
    area: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

export interface VisionAnchors {
  width: number;
  height: number;
  anchors: AnchorPoint[];
}

export interface VisionDepth {
  width: number;
  height: number;
  depth_b64: string;
}

export interface DetectedObject {
  label: string;
  /** ProductCategory this region maps to (e.g. clicking opens that category in the nav). */
  category?: ProductCategory;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Normalized [x,y] polygon (0-1) for one surface, used for mask-based overlay. */
export type SurfacePolygon = [number, number][];

/** Per-category polygon for pixel-accurate texture placement. */
export type SurfaceSegments = Record<string, SurfacePolygon>;
