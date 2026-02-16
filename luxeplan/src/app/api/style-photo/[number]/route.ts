import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const STYLE_FOLDER = "new styles photos";

function getFilename(number: number): string {
  if (number >= 1 && number <= 3) return `style${number}.png`;
  if (number >= 4 && number <= 8) return `style ${number}.png`;
  throw new Error("Invalid style number");
}

/**
 * GET /api/style-photo/1 … /api/style-photo/8
 * Serves the style reference image from luxeplan/new styles photos/
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const num = parseInt((await params).number, 10);
  if (Number.isNaN(num) || num < 1 || num > 8) {
    return NextResponse.json({ error: "Style number must be 1–8" }, { status: 400 });
  }

  try {
    const filename = getFilename(num);
    const dir = path.join(process.cwd(), STYLE_FOLDER);
    const filePath = path.join(dir, filename);
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Style photo not found: ${message}` },
      { status: 404 }
    );
  }
}
