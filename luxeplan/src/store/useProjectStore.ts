import { create } from "zustand";
import type {
  Product,
  Project,
  DesignSelection,
  DesignVersion,
  BudgetEstimate,
  VisionAnalysis,
  ProductCategory,
  StudioMode,
  UploadStep,
  GeminiGuidance,
  OnboardingStep,
  DesignStyle,
  RoomLayout,
  RoomType,
  ChatMessage,
  DetectedObject,
  SurfaceSegments,
  StyleRenderItem,
} from "@/types";
import { v4 as uuid } from "uuid";

interface ProjectState {
  // Upload flow
  uploadStep: UploadStep;
  setUploadStep: (step: UploadStep) => void;

  // Onboarding
  onboardingStep: OnboardingStep;
  setOnboardingStep: (step: OnboardingStep) => void;
  selectedStyle: DesignStyle | null;
  setSelectedStyle: (style: DesignStyle) => void;
  selectedLayout: RoomLayout | null;
  setSelectedLayout: (layout: RoomLayout) => void;
  selectedRoomType: RoomType | null;
  setSelectedRoomType: (type: RoomType) => void;

  // Current project
  project: Project | null;
  setProject: (project: Project) => void;

  // Vision analysis
  visionAnalysis: VisionAnalysis | null;
  setVisionAnalysis: (analysis: VisionAnalysis) => void;

  // Studio state
  studioMode: StudioMode;
  setStudioMode: (mode: StudioMode) => void;
  activeCategory: ProductCategory;
  setActiveCategory: (category: ProductCategory) => void;
  showBeforeAfter: boolean;
  toggleBeforeAfter: () => void;

  // Selections
  selections: DesignSelection[];
  addSelection: (product: Product, placement: any) => void;
  removeSelection: (selectionId: string) => void;
  clearSelections: () => void;

  // Budget
  budget: BudgetEstimate;
  zipCode: string;
  setZipCode: (zip: string) => void;

  // Versions
  versions: DesignVersion[];
  currentVersionId: string | null;
  saveVersion: () => void;
  loadVersion: (versionId: string) => void;

  // Gemini guidance
  guidance: GeminiGuidance | null;
  setGuidance: (guidance: GeminiGuidance) => void;

  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;
  filteredProducts: () => Product[];

  // AI concept (realistic view) — undo/redo history
  conceptHistory: string[];
  conceptHistoryIndex: number;
  conceptImageUrl: string | null;
  setConceptImageUrl: (url: string | null) => void;
  pushConceptImage: (url: string) => void;
  undoConcept: () => void;
  redoConcept: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  conceptLoading: boolean;
  setConceptLoading: (v: boolean) => void;

  // Region product replacement
  replacementImageBase64: string | null;
  setReplacementImageBase64: (v: string | null) => void;

  // Chat editing
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  chatLoading: boolean;
  setChatLoading: (v: boolean) => void;
  selectedRegion: { x: number; y: number; width: number; height: number } | null;
  setSelectedRegion: (region: { x: number; y: number; width: number; height: number } | null) => void;

  // Object detection
  detectedObjects: DetectedObject[];
  setDetectedObjects: (objects: DetectedObject[]) => void;
  objectDetectionLoading: boolean;
  setObjectDetectionLoading: (v: boolean) => void;
  surfaceSegments: SurfaceSegments | null;
  setSurfaceSegments: (segments: SurfaceSegments | null) => void;
  segmentLoading: boolean;
  setSegmentLoading: (v: boolean) => void;

  // Style render (AI-estimated items from initial concept)
  styleRenderItems: StyleRenderItem[] | null;
  setStyleRenderItems: (items: StyleRenderItem[] | null) => void;
  styleRenderLoading: boolean;
  setStyleRenderLoading: (v: boolean) => void;
}

const LABOR_MULTIPLIERS: Record<string, number> = {
  "10001": 1.85, // NYC
  "90210": 1.65, // Beverly Hills
  "60601": 1.35, // Chicago
  "33101": 1.25, // Miami
  default: 1.0,
};

function calculateBudget(
  selections: DesignSelection[],
  zipCode: string
): BudgetEstimate {
  const zipPrefix = zipCode.substring(0, 3);
  const multiplier =
    LABOR_MULTIPLIERS[zipCode] ||
    (parseInt(zipPrefix) >= 100 && parseInt(zipPrefix) <= 102
      ? 1.85
      : parseInt(zipPrefix) >= 900 && parseInt(zipPrefix) <= 902
      ? 1.65
      : 1.0);

  const line_items = selections.map((s) => {
    const baseLaborLow = s.product.price * 0.35;
    const baseLaborHigh = s.product.price * 0.6;
    return {
      category: s.product.category,
      product_name: s.product.name,
      material_cost: s.product.price,
      labor_cost_low: Math.round(baseLaborLow * multiplier),
      labor_cost_high: Math.round(baseLaborHigh * multiplier),
    };
  });

  const totalMaterial = line_items.reduce(
    (sum, item) => sum + item.material_cost,
    0
  );
  const laborLow = line_items.reduce(
    (sum, item) => sum + item.labor_cost_low,
    0
  );
  const laborHigh = line_items.reduce(
    (sum, item) => sum + item.labor_cost_high,
    0
  );

  return {
    low: totalMaterial + laborLow,
    high: totalMaterial + laborHigh,
    line_items,
    labor_estimate_low: laborLow,
    labor_estimate_high: laborHigh,
    total_low: totalMaterial + laborLow,
    total_high: totalMaterial + laborHigh,
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  uploadStep: "landing",
  setUploadStep: (step) => set({ uploadStep: step }),

  onboardingStep: "room-type",
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  selectedStyle: null,
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  selectedLayout: null,
  setSelectedLayout: (layout) => set({ selectedLayout: layout }),
  selectedRoomType: null,
  setSelectedRoomType: (type) => set({ selectedRoomType: type }),

  project: null,
  setProject: (project) => set({ project }),

  visionAnalysis: null,
  setVisionAnalysis: (analysis) => set({ visionAnalysis: analysis }),

  studioMode: "live",
  setStudioMode: (mode) => set({ studioMode: mode }),
  activeCategory: "countertops",
  setActiveCategory: (category) => set({ activeCategory: category }),
  showBeforeAfter: false,
  toggleBeforeAfter: () =>
    set((state) => ({ showBeforeAfter: !state.showBeforeAfter })),

  selections: [],
  addSelection: (product, placement) => {
    const selection: DesignSelection = {
      id: uuid(),
      product,
      placement,
      added_at: new Date().toISOString(),
    };
    const newSelections = [
      ...get().selections.filter(
        (s) => s.product.category !== product.category
      ),
      selection,
    ];
    set({
      selections: newSelections,
      budget: calculateBudget(newSelections, get().zipCode),
    });
  },
  removeSelection: (selectionId) => {
    const newSelections = get().selections.filter((s) => s.id !== selectionId);
    set({
      selections: newSelections,
      budget: calculateBudget(newSelections, get().zipCode),
    });
  },
  clearSelections: () =>
    set({
      selections: [],
      budget: calculateBudget([], get().zipCode),
    }),

  budget: {
    low: 0,
    high: 0,
    line_items: [],
    labor_estimate_low: 0,
    labor_estimate_high: 0,
    total_low: 0,
    total_high: 0,
  },
  zipCode: "",
  setZipCode: (zip) => {
    set({ zipCode: zip });
    const newBudget = calculateBudget(get().selections, zip);
    set({ budget: newBudget });
  },

  versions: [],
  currentVersionId: null,
  saveVersion: () => {
    const state = get();
    const version: DesignVersion = {
      id: uuid(),
      version_number: state.versions.length + 1,
      thumbnail_url: "",
      selections: [...state.selections],
      budget: { ...state.budget },
      created_at: new Date().toISOString(),
    };
    set({
      versions: [...state.versions, version],
      currentVersionId: version.id,
    });
  },
  loadVersion: (versionId) => {
    const version = get().versions.find((v) => v.id === versionId);
    if (version) {
      set({
        selections: [...version.selections],
        budget: { ...version.budget },
        currentVersionId: versionId,
      });
    }
  },

  guidance: null,
  setGuidance: (guidance) => set({ guidance }),

  products: [],
  setProducts: (products) => set({ products }),
  filteredProducts: () => {
    const state = get();
    const roomType = state.project?.room_type;
    const style = state.selectedStyle;
    const filtered = state.products.filter(
      (p) =>
        p.category === state.activeCategory &&
        (!roomType || p.room_type.includes(roomType))
    );
    if (style) {
      filtered.sort((a, b) => {
        const aMatch = a.style_tags.includes(style) ? 0 : 1;
        const bMatch = b.style_tags.includes(style) ? 0 : 1;
        return aMatch - bMatch;
      });
    }
    return filtered;
  },

  conceptHistory: [],
  conceptHistoryIndex: -1,
  conceptImageUrl: null,
  setConceptImageUrl: (url) => {
    if (url === null) {
      set({ conceptHistory: [], conceptHistoryIndex: -1, conceptImageUrl: null });
    } else {
      get().pushConceptImage(url);
    }
  },
  pushConceptImage: (url) => {
    const { conceptHistory, conceptHistoryIndex } = get();
    const truncated = conceptHistory.slice(0, conceptHistoryIndex + 1);
    const newHistory = [...truncated, url];
    const MAX = 20;
    if (newHistory.length > MAX) {
      newHistory.splice(0, newHistory.length - MAX);
    }
    set({
      conceptHistory: newHistory,
      conceptHistoryIndex: newHistory.length - 1,
      conceptImageUrl: url,
    });
  },
  undoConcept: () => {
    const { conceptHistoryIndex, conceptHistory } = get();
    if (conceptHistoryIndex > 0) {
      const newIndex = conceptHistoryIndex - 1;
      set({
        conceptHistoryIndex: newIndex,
        conceptImageUrl: conceptHistory[newIndex] ?? null,
        detectedObjects: [],
      });
    }
  },
  redoConcept: () => {
    const { conceptHistoryIndex, conceptHistory } = get();
    if (conceptHistoryIndex < conceptHistory.length - 1) {
      const newIndex = conceptHistoryIndex + 1;
      set({
        conceptHistoryIndex: newIndex,
        conceptImageUrl: conceptHistory[newIndex] ?? null,
        detectedObjects: [],
      });
    }
  },
  canUndo: () => get().conceptHistoryIndex > 0,
  canRedo: () => get().conceptHistoryIndex < get().conceptHistory.length - 1,
  conceptLoading: false,
  setConceptLoading: (v) => set({ conceptLoading: v }),

  replacementImageBase64: null,
  setReplacementImageBase64: (v) => set({ replacementImageBase64: v }),

  chatMessages: [],
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),
  chatLoading: false,
  setChatLoading: (v) => set({ chatLoading: v }),
  selectedRegion: null,
  setSelectedRegion: (region) => set({ selectedRegion: region }),

  detectedObjects: [],
  setDetectedObjects: (objects) => set({ detectedObjects: objects }),
  objectDetectionLoading: false,
  setObjectDetectionLoading: (v) => set({ objectDetectionLoading: v }),
  surfaceSegments: null,
  setSurfaceSegments: (segments) => set({ surfaceSegments: segments }),
  segmentLoading: false,
  setSegmentLoading: (v) => set({ segmentLoading: v }),

  styleRenderItems: null,
  setStyleRenderItems: (items) => set({ styleRenderItems: items }),
  styleRenderLoading: false,
  setStyleRenderLoading: (v) => set({ styleRenderLoading: v }),
}));
