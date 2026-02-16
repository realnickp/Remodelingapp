#!/usr/bin/env node
/**
 * Uses AI vision (Gemini or OpenAI) to categorize each image in public/images/
 * and writes src/lib/product-image-categories.json.
 * Run from luxeplan: node scripts/analyze-product-images.mjs
 * Requires GEMINI_API_KEY or OPENAI_API_KEY in .env.local (tries Gemini first, then OpenAI)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/\r$/, "");
    let val = trimmed.slice(eq + 1).trim().replace(/\r$/, "");
    if (!val) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (!next) continue;
        if (next.startsWith("#") || /^[A-Z_][A-Z0-9_]*=/.test(next)) break;
        val = next.replace(/\r$/, "");
        i = j;
        break;
      }
    }
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    process.env[key] = val;
  }
}

const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.join(root, ".env.local"),
];
for (const p of envPaths) loadEnvFile(p);

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const hasValidKey =
  (GEMINI_API_KEY && GEMINI_API_KEY.length > 20) ||
  (OPENAI_API_KEY && OPENAI_API_KEY.length > 20);
if (!hasValidKey) {
  console.error(
    "Missing GEMINI_API_KEY or OPENAI_API_KEY in .env.local. Set at least one (value must be on the same line as the key)."
  );
  process.exit(1);
}

const CATEGORIES = [
  "faucets",
  "sinks",
  "countertops",
  "cabinets",
  "backsplash",
  "flooring",
  "lighting",
  "mirrors",
  "hardware",
  "appliances",
  "fixtures",
  "shower",
  "tub",
  "vanity",
  "toilet",
  "other",
];

const imagesDir = path.join(root, "public", "images");
const outPath = path.join(root, "src", "lib", "product-image-categories.json");

function normalizeCategory(text) {
  const t = (text || "").toLowerCase().trim().replace(/\s+/g, "");
  if (CATEGORIES.includes(t)) return t;
  if (t === "faucet") return "faucets";
  if (t === "sink") return "sinks";
  if (t === "countertop") return "countertops";
  if (t === "cabinet") return "cabinets";
  if (t === "mirror") return "mirrors";
  if (t === "appliance") return "appliances";
  if (t === "fixture") return "fixtures";
  if (t === "vanities") return "vanity";
  if (t === "toilets") return "toilet";
  if (t === "tubs") return "tub";
  if (t === "showers") return "shower";
  if (t === "floor") return "flooring";
  if (t === "backplash" || t === "tile") return "backsplash";
  return "other";
}

const PROMPT = `What product category does this image show? Reply with exactly one word from: ${CATEGORIES.join(", ")}. Only one word, no explanation.`;

async function analyzeWithGemini(base64) {
  if (!GEMINI_API_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: "image/png", data: base64 } },
          { text: PROMPT },
        ],
      },
    ],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return part?.trim().split(/\s/)[0] ?? null;
}

async function analyzeWithOpenAI(base64) {
  if (!OPENAI_API_KEY) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text?.split(/\s/)[0] ?? null;
}

async function analyzeImage(imageNum, base64) {
  let raw = null;
  try {
    raw = await analyzeWithGemini(base64);
  } catch (e) {
    if (OPENAI_API_KEY) {
      try {
        raw = await analyzeWithOpenAI(base64);
      } catch (e2) {
        throw new Error(`${e.message}; OpenAI fallback: ${e2.message}`);
      }
    } else {
      throw e;
    }
  }
  if (raw === null && OPENAI_API_KEY) {
    raw = await analyzeWithOpenAI(base64);
  }
  if (raw === null) throw new Error("No API key available");
  const category = normalizeCategory(raw);
  return category;
}

async function main() {
  const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith(".png"));
  const numeric = (a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  };
  files.sort(numeric);

  const categoryToImages = {};
  CATEGORIES.forEach((c) => (categoryToImages[c] = []));

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const num = parseInt(file.replace(/\D/g, ""), 10) || i + 1;
    const buf = fs.readFileSync(path.join(imagesDir, file));
    const base64 = buf.toString("base64");

    try {
      const category = await analyzeImage(num, base64);
      if (!categoryToImages[category]) categoryToImages[category] = [];
      categoryToImages[category].push(num);
      console.log(`${file} -> ${category}`);
    } catch (e) {
      console.error(`${file} error:`, e.message);
      categoryToImages["other"].push(num);
    }

    if (i < files.length - 1) await new Promise((r) => setTimeout(r, 300));
  }

  fs.writeFileSync(outPath, JSON.stringify(categoryToImages, null, 2), "utf8");
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
