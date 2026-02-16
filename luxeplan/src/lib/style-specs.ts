/**
 * Single source of truth for the 8 design styles.
 * Image names are numbered 1–8; place files in public/images/styles/ as 1.jpeg through 8.jpeg
 * (e.g. copy from "new style photos" folder).
 */

export type DesignStyleId =
  | "soft-scandinavian-natural"           // 1
  | "organic-transitional-marble-luxe"    // 2
  | "modern-black-contrast"               // 3
  | "navy-brushed-brass-classic"          // 4
  | "earthy-organic-modern"               // 5
  | "minimal-stone-matte-black-spa"       // 6
  | "warm-brass-herringbone-marble"       // 7
  | "light-modern-coastal-neutral";       // 8

export interface StyleSpec {
  id: DesignStyleId;
  /** 1-based index matching the style photo filename (e.g. 1.jpeg) */
  imageNumber: number;
  title: string;
  /** Short description for cards */
  description: string;
  /** Full spec text injected into the master concept/style prompt */
  masterPromptSpec: string;
  /** Color palette hex for UI */
  palette: string[];
}

const STYLE_SPECS: StyleSpec[] = [
  {
    id: "soft-scandinavian-natural",
    imageNumber: 1,
    title: "Soft Scandinavian Natural",
    description: "Light, airy, organic minimalism. Warm off-white cabinetry, light oak, soft marble.",
    palette: ["#F5F2ED", "#E8E0D5", "#9CAF88", "#C4A882", "#8A8A8A"],
    masterPromptSpec: `Style Name: Soft Scandinavian Natural
Core Aesthetic: Light, airy, organic minimalism. Calm and neutral. Soft textures. Subtle warmth.
Cabinetry: Warm off-white shaker or flat panel. Slight cream undertone. Matte finish.
Wood Elements: Light natural oak. Visible subtle grain. Not yellow. Not orange. Soft neutral wood tone.
Stone: Light marble or quartz with faint grey veining. Low contrast veining.
Hardware & Fixtures: Brushed nickel or soft satin stainless. Understated. Rounded edges.
Tile: Subtle light grey or beige stone texture. Clean grout lines. Soft finish.
Color Palette: Warm whites, soft beige, muted sage, light oak, stone grey.
Lighting: Natural daylight dominant. Soft shadows. No harsh contrast. Diffused light. Clean neutral white balance.
Mood: Calm. Spa-like. Modern but cozy. No bold contrasts.`,
  },
  {
    id: "organic-transitional-marble-luxe",
    imageNumber: 2,
    title: "Organic Transitional Marble Luxe",
    description: "Soft luxury with marble texture and light natural woods. Warm brass, cream textiles.",
    palette: ["#F5F5F0", "#C4A882", "#F5EDE0", "#C8A96E", "#8A8A8A"],
    masterPromptSpec: `Style Name: Organic Transitional Marble Luxe
Core Aesthetic: Soft luxury with marble texture and light natural woods.
Cabinetry: Soft white shaker with slight depth in panel detailing.
Wood Accent: Light blonde oak. Smooth finish.
Stone: Large marble slab. Medium veining. Soft grey and white mix.
Hardware: Warm brushed brass. Elegant. Rounded profile.
Tile: Marble mosaic or patterned stone. Light and textured.
Textiles: Cream woven fabrics. Natural linen textures.
Color Palette: Ivory, light oak, cream, warm brass, soft stone grey.
Lighting: Bright but diffused. Balanced interior lighting. No dramatic shadows.
Mood: Elevated but not flashy. Soft luxury. Designer showroom feel.`,
  },
  {
    id: "modern-black-contrast",
    imageNumber: 3,
    title: "Modern Black Contrast",
    description: "High contrast, clean geometry. Crisp white, matte black fixtures, white subway tile.",
    palette: ["#FFFFFF", "#2D2D2D", "#4A4A4A", "#F5F2ED"],
    masterPromptSpec: `Style Name: Modern Black Contrast
Core Aesthetic: High contrast. Clean geometry. Bold black fixtures against white tile.
Cabinetry: Crisp white flat panel or slab.
Fixtures: Matte black. Sharp edges. Minimalist.
Tile: White subway tile. Clean rectangular layout. Thin grout lines.
Accent Tile: Small black hex mosaic.
Wood: Dark stained wood or charcoal tone paneling.
Color Palette: Pure white, matte black, charcoal, soft neutral wall.
Lighting: Bright neutral lighting. No warmth shift. Slightly cooler white balance.
Mood: Modern. Architectural. Bold. Graphic.`,
  },
  {
    id: "navy-brushed-brass-classic",
    imageNumber: 4,
    title: "Navy & Brushed Brass Classic",
    description: "Deep navy cabinetry, warm brass, marble. Refined boutique hotel feel.",
    palette: ["#2C3E6B", "#C8A96E", "#F5EDE0", "#F5F2ED"],
    masterPromptSpec: `Style Name: Navy & Brushed Brass Classic
Core Aesthetic: Deep navy cabinetry paired with warm brass and marble.
Cabinetry: Rich navy shaker or inset panel. Matte finish.
Hardware: Brushed brass. Cylindrical pulls.
Stone: Warm beige marble slab. Medium veining.
Tile: White marble hex or geometric pattern.
Lighting Fixtures: Brass dome pendants. Soft warm glow.
Color Palette: Navy blue, warm brass, cream marble, soft neutral walls.
Lighting: Slightly warmer white balance. Balanced shadows. Natural daylight + warm accent lights.
Mood: Refined. Upscale. Boutique hotel.`,
  },
  {
    id: "earthy-organic-modern",
    imageNumber: 5,
    title: "Earthy Organic Modern",
    description: "Muted greens, textured stone, natural wood. Earth-inspired, wellness focused.",
    palette: ["#6B7B5A", "#C4A882", "#F5EDE0", "#C8A96E"],
    masterPromptSpec: `Style Name: Earthy Organic Modern
Core Aesthetic: Muted greens, textured stone, natural wood. Earth inspired.
Cabinetry: Warm natural oak slab.
Tile: Matte olive green square tile. Soft finish.
Stone: Light terrazzo or textured limestone slab.
Fixtures: Brushed brass or muted gold. Soft matte finish.
Decor: Natural linen textiles. Dried florals.
Color Palette: Olive green, warm oak, soft cream, muted brass.
Lighting: Soft golden daylight. Gentle warmth. No harsh highlights.
Mood: Organic. Calm. Wellness focused.`,
  },
  {
    id: "minimal-stone-matte-black-spa",
    imageNumber: 6,
    title: "Minimal Stone & Matte Black Spa",
    description: "Neutral stone with black fixtures. Modern spa, clean and minimal.",
    palette: ["#F5F5F5", "#8A8A8A", "#2D2D2D", "#E8E4E0"],
    masterPromptSpec: `Style Name: Minimal Stone & Matte Black Spa
Core Aesthetic: Neutral stone heavy aesthetic with black fixtures.
Stone: Large format marble or quartz slab. Visible grey veining.
Tile: Light textured stone tile. Matte finish.
Fixtures: Matte black shower hardware. Modern cylindrical shapes.
Textiles: Soft beige towels. Neutral woven textures.
Color Palette: Soft white, grey marble, charcoal black, cream.
Lighting: Bright neutral daylight. High clarity. Clean exposure.
Mood: Modern spa. Clean. Minimal. Calm.`,
  },
  {
    id: "warm-brass-herringbone-marble",
    imageNumber: 7,
    title: "Warm Brass & Herringbone Marble",
    description: "Classic white marble, brass fixtures. Elegant, upscale residential.",
    palette: ["#F5F5F5", "#C8A96E", "#C8BAA7", "#F5EDE0"],
    masterPromptSpec: `Style Name: Warm Brass & Herringbone Marble
Core Aesthetic: Classic white marble with strong brass statement fixtures.
Stone: Marble slab with clear veining.
Tile: Herringbone marble backsplash. Subtle texture.
Cabinetry: Warm grey oak or light neutral panel.
Fixtures: Polished brass. Luxurious. Warm glow.
Color Palette: White marble, warm gold, light taupe, cream.
Lighting: Soft diffused daylight. Slight warmth.
Mood: Elegant. Classic. Upscale residential.`,
  },
  {
    id: "light-modern-coastal-neutral",
    imageNumber: 8,
    title: "Light Modern Coastal Neutral",
    description: "Airy, pale wood, light marble. Clean, fresh, coastal but modern.",
    palette: ["#F5F5F5", "#C4A882", "#E8E8E8", "#8A8A8A"],
    masterPromptSpec: `Style Name: Light Modern Coastal Neutral
Core Aesthetic: Airy, pale wood, light marble, subtle texture.
Cabinetry: Soft white shaker. Clean edges.
Wood: Light natural oak panel.
Tile: Small square marble mosaic. Light grout.
Stone: White marble slab with light veining.
Hardware: Satin nickel or soft stainless.
Color Palette: Soft white, pale oak, light marble, muted grey.
Lighting: Bright natural daylight. Even exposure. No harsh shadows.
Mood: Clean. Fresh. Coastal but modern.`,
  },
];

export const STYLES = STYLE_SPECS;

/** URL for the style photo (numbered 1–8). Served from luxeplan/new styles photos/ via /api/style-photo/[number] */
export function getStyleImagePath(spec: StyleSpec): string {
  return `/api/style-photo/${spec.imageNumber}`;
}

export function getStyleById(id: DesignStyleId): StyleSpec | undefined {
  return STYLE_SPECS.find((s) => s.id === id);
}

export function getStyleByImageNumber(n: number): StyleSpec | undefined {
  return STYLE_SPECS.find((s) => s.imageNumber === n);
}
