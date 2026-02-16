import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const PINTEREST_API = "https://api.pinterest.com/v5";
const RATE_LIMIT_MS = 200;

interface PinSearchResult {
  items?: Array<{
    id: string;
    media?: {
      images?: {
        "600x"?: { url: string };
        originals?: { url: string };
      };
    };
  }>;
}

async function searchPins(
  query: string,
  token: string
): Promise<string | null> {
  const url = `${PINTEREST_API}/search/pins?query=${encodeURIComponent(query)}&page_size=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;

  const data: PinSearchResult = await res.json();
  const pin = data.items?.[0];
  if (!pin?.media?.images) return null;

  return (
    pin.media.images["600x"]?.url ||
    pin.media.images.originals?.url ||
    null
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: Request) {
  const token = process.env.PINTEREST_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "PINTEREST_TOKEN not set" },
      { status: 500 }
    );
  }

  const productsFile = path.resolve(
    process.cwd(),
    "src/lib/products.ts"
  );

  if (!fs.existsSync(productsFile)) {
    return NextResponse.json(
      { error: "products.ts not found" },
      { status: 500 }
    );
  }

  const source = fs.readFileSync(productsFile, "utf-8");

  const PRODUCT_RE =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?brand:\s*"([^"]+)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?image_url:\s*"(\/products\/[^"]+)"/g;

  const products = [...source.matchAll(PRODUCT_RE)].map((m) => ({
    id: m[1],
    name: m[2],
    brand: m[3],
    category: m[4],
    originalUrl: m[5],
  }));

  let updated = source;
  let successCount = 0;

  for (const product of products) {
    const primaryQuery = `${product.brand} ${product.name} ${product.category}`;
    let imageUrl = await searchPins(primaryQuery, token);

    if (!imageUrl) {
      const fallbackQuery = `${product.name} ${product.category}`;
      imageUrl = await searchPins(fallbackQuery, token);
    }

    if (imageUrl) {
      updated = updated.replace(
        `image_url: "${product.originalUrl}"`,
        `image_url: "${imageUrl}"`
      );
      successCount++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  fs.writeFileSync(productsFile, updated, "utf-8");

  return NextResponse.json({
    total: products.length,
    updated: successCount,
    message: `Updated ${successCount}/${products.length} product images.`,
  });
}
