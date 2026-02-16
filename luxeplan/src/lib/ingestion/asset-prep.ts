// ─────────────────────────────────────────────
// Asset Preparation Service
//
// Processes raw product images into studio-ready assets:
//   1. Download primary image from product_images
//   2. Background removal (Sharp threshold — TODO: replace with rembg/ML)
//   3. Generate tileable texture for surface categories
//   4. Compute pose_score heuristic
//   5. Reject lifestyle scenes (heuristic)
//   6. Store results in product_assets
//   7. Mark is_live_eligible
// ─────────────────────────────────────────────

import sharp from "sharp";
import { getServiceClient } from "@/lib/supabase-server";
import type { NormalizedAsset } from "./types";

// Surface categories that need a texture tile
const SURFACE_CATEGORIES = new Set([
  "countertops",
  "backsplash",
  "flooring",
  "cabinets",
]);

export class AssetPrepService {
  private db = getServiceClient();

  /**
   * Prepare all assets for a single product.
   */
  async prepareAssets(productId: string): Promise<{
    assets: NormalizedAsset[];
    rejected: boolean;
    rejectionReason?: string;
  }> {
    // 1. Fetch product and primary image
    const { data: product } = await this.db
      .from("products")
      .select("id, category")
      .eq("id", productId)
      .single();

    if (!product) {
      return { assets: [], rejected: true, rejectionReason: "Product not found" };
    }

    const { data: primaryImage } = await this.db
      .from("product_images")
      .select("image_url, width, height")
      .eq("product_id", productId)
      .eq("type", "primary")
      .limit(1)
      .single();

    if (!primaryImage?.image_url) {
      return { assets: [], rejected: true, rejectionReason: "No primary image" };
    }

    // 2. Download image
    let imageBuffer: Buffer;
    try {
      const res = await fetch(primaryImage.image_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      return {
        assets: [],
        rejected: true,
        rejectionReason: `Download failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    if (width < 100 || height < 100) {
      return { assets: [], rejected: true, rejectionReason: "Image too small" };
    }

    // 5. Reject lifestyle scenes (heuristic)
    const rejection = this.checkRejection(width, height);
    if (rejection) {
      await this.storeAsset({
        product_id: productId,
        asset_type: "thumbnail",
        asset_url: primaryImage.image_url,
        pose_score: 0,
        is_live_eligible: false,
        rejection_reason: rejection,
      });
      return { assets: [], rejected: true, rejectionReason: rejection };
    }

    const assets: NormalizedAsset[] = [];

    // 3a. Background removal → cutout PNG
    const cutoutBuffer = await this.removeBackground(imageBuffer);
    const cutoutUrl = await this.uploadAsset(productId, "cutout.png", cutoutBuffer);
    const poseScore = this.computePoseScore(width, height, imageBuffer);

    assets.push({
      product_id: productId,
      asset_type: "cutout_png",
      asset_url: cutoutUrl,
      pose_score: poseScore,
      is_live_eligible: poseScore >= 40,
    });

    // 3b. Texture tile for surfaces
    if (SURFACE_CATEGORIES.has(product.category)) {
      const tileBuffer = await this.generateTextureTile(imageBuffer, width, height);
      const tileUrl = await this.uploadAsset(productId, "texture_tile.png", tileBuffer);
      assets.push({
        product_id: productId,
        asset_type: "texture_tile",
        asset_url: tileUrl,
        is_live_eligible: true,
      });
    }

    // 3c. Thumbnail
    const thumbBuffer = await sharp(imageBuffer)
      .resize(256, 256, { fit: "cover" })
      .png()
      .toBuffer();
    const thumbUrl = await this.uploadAsset(productId, "thumbnail.png", thumbBuffer);
    assets.push({
      product_id: productId,
      asset_type: "thumbnail",
      asset_url: thumbUrl,
      is_live_eligible: true,
    });

    // 6. Store all assets in DB
    for (const asset of assets) {
      await this.storeAsset(asset);
    }

    return { assets, rejected: false };
  }

  // ── Private Helpers ──

  /**
   * Simple threshold-based background removal using Sharp.
   * TODO: Replace with rembg Python service or an ML model for production.
   */
  private async removeBackground(imageBuffer: Buffer): Promise<Buffer> {
    // Extract the alpha channel (if any) and use brightness threshold
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8Array(data);
    const { width, height, channels } = info;

    // Simple threshold: if pixel brightness > 240 on all RGB, make transparent
    for (let i = 0; i < width * height; i++) {
      const offset = i * channels;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 240) {
        pixels[offset + 3] = 0; // transparent
      }
    }

    return sharp(Buffer.from(pixels), { raw: { width, height, channels } })
      .png()
      .toBuffer();
  }

  /**
   * Generate a tileable texture by cropping center region and tiling 2x2.
   */
  private async generateTextureTile(
    imageBuffer: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    const cropSize = Math.min(width, height, 512);
    const left = Math.floor((width - cropSize) / 2);
    const top = Math.floor((height - cropSize) / 2);

    const center = await sharp(imageBuffer)
      .extract({ left, top, width: cropSize, height: cropSize })
      .resize(256, 256)
      .png()
      .toBuffer();

    // Tile 2x2
    return sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: center, left: 0, top: 0 },
        { input: center, left: 256, top: 0 },
        { input: center, left: 0, top: 256 },
        { input: center, left: 256, top: 256 },
      ])
      .png()
      .toBuffer();
  }

  /**
   * Heuristic pose score (0-100) based on:
   * - Aspect ratio (closer to 1:1 is better for product shots)
   * - Resolution (higher is better)
   * - Center-of-mass (TODO: analyze pixel distribution)
   */
  private computePoseScore(width: number, height: number, _imageBuffer: Buffer): number {
    let score = 50; // base

    // Aspect ratio: 1:1 ideal, penalize extremes
    const ratio = Math.max(width, height) / Math.min(width, height);
    if (ratio <= 1.3) score += 20;
    else if (ratio <= 1.8) score += 10;
    else score -= 10;

    // Resolution
    const megapixels = (width * height) / 1_000_000;
    if (megapixels >= 2) score += 15;
    else if (megapixels >= 1) score += 10;
    else if (megapixels >= 0.5) score += 5;

    // TODO: Analyze center-of-mass of non-transparent pixels for a centering bonus

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Reject lifestyle / contextual scenes that are not product shots.
   * Heuristic: very wide panoramic images or images with extreme aspect ratios.
   * TODO: Replace with a lightweight classifier.
   */
  private checkRejection(width: number, height: number): string | null {
    const ratio = width / height;
    if (ratio > 3 || ratio < 0.33) {
      return "Extreme aspect ratio — likely a lifestyle/panoramic shot";
    }
    return null;
  }

  /**
   * Upload an asset buffer to Supabase Storage and return the public URL.
   * Falls back to a data URI if storage is not configured.
   */
  private async uploadAsset(
    productId: string,
    filename: string,
    buffer: Buffer
  ): Promise<string> {
    const bucket = "product-assets";
    const path = `${productId}/${filename}`;

    try {
      const { error } = await this.db.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (error) {
        console.warn(`[AssetPrepService] Storage upload failed (${error.message}), using data URI fallback`);
        return `data:image/png;base64,${buffer.toString("base64")}`;
      }

      const { data: urlData } = this.db.storage
        .from(bucket)
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch {
      // Storage bucket may not exist yet — fall back to data URI
      return `data:image/png;base64,${buffer.toString("base64")}`;
    }
  }

  private async storeAsset(asset: NormalizedAsset): Promise<void> {
    const { error } = await this.db.from("product_assets").insert(asset);
    if (error) {
      console.error(`[AssetPrepService] Failed to store asset:`, error.message);
    }
  }
}
