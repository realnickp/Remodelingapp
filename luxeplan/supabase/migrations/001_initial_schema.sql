-- ─────────────────────────────────────────────
-- LUXEPLAN Database Schema
-- Supabase PostgreSQL Migration
-- ─────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Projects ──

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Project',
    room_type TEXT NOT NULL CHECK (room_type IN ('kitchen', 'bathroom')),
    zip_code TEXT,
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_share ON projects(share_token);

-- ── Project Images ──

CREATE TABLE project_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    -- Vision analysis results
    segmentation_json JSONB,
    anchors_json JSONB,
    depth_map_url TEXT,
    planes_json JSONB,
    detected_room_type TEXT,
    analysis_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (analysis_status IN ('pending', 'processing', 'complete', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_images_project ON project_images(project_id);

-- ── Product Catalog ──

CREATE TABLE product_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'faucets', 'sinks', 'countertops', 'cabinets', 'backsplash',
        'flooring', 'lighting', 'mirrors', 'hardware', 'appliances',
        'fixtures', 'shower', 'tub', 'vanity', 'toilet'
    )),
    price DECIMAL(10,2) NOT NULL,
    price_unit TEXT DEFAULT 'each' CHECK (price_unit IN ('each', 'sqft', 'linear_ft')),
    image_url TEXT NOT NULL,
    alpha_png_url TEXT,
    thumbnail_url TEXT,
    description TEXT,
    material TEXT,
    finish TEXT,
    color TEXT,
    dimensions JSONB,
    room_types TEXT[] NOT NULL DEFAULT '{}',
    is_insertion_ready BOOLEAN NOT NULL DEFAULT FALSE,
    pose_rating INTEGER CHECK (pose_rating BETWEEN 1 AND 10),
    style_tags TEXT[] NOT NULL DEFAULT '{}',
    source_platform TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON product_catalog(category);
CREATE INDEX idx_products_room ON product_catalog USING GIN(room_types);
CREATE INDEX idx_products_style ON product_catalog USING GIN(style_tags);
CREATE INDEX idx_products_ready ON product_catalog(is_insertion_ready);

-- ── Design Versions ──

CREATE TABLE design_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    thumbnail_url TEXT,
    budget_low DECIMAL(12,2),
    budget_high DECIMAL(12,2),
    budget_details JSONB,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, version_number)
);

CREATE INDEX idx_versions_project ON design_versions(project_id);

-- ── Project Selections ──

CREATE TABLE project_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product_catalog(id),
    placement_x DECIMAL(8,2),
    placement_y DECIMAL(8,2),
    placement_scale DECIMAL(6,4),
    placement_rotation DECIMAL(6,2),
    placement_z_order INTEGER,
    shadow_plane TEXT,
    occlusion_mask_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_selections_version ON project_selections(version_id);
CREATE INDEX idx_selections_product ON project_selections(product_id);

-- ── Cost Models ──

CREATE TABLE cost_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    zip_prefix TEXT NOT NULL,
    labor_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    base_labor_rate_low DECIMAL(8,2) NOT NULL,
    base_labor_rate_high DECIMAL(8,2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'each',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category, zip_prefix)
);

CREATE INDEX idx_cost_models_lookup ON cost_models(category, zip_prefix);

-- ── Concept Renders ──

CREATE TABLE concept_renders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id UUID REFERENCES design_versions(id),
    prompt TEXT NOT NULL,
    render_url TEXT,
    changes_summary JSONB,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'complete', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_renders_project ON concept_renders(project_id);

-- ── Row Level Security ──

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_renders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY "Users see own projects"
    ON projects FOR ALL
    USING (auth.uid() = user_id);

-- Shared projects are readable by anyone with the token
CREATE POLICY "Shared projects are public"
    ON projects FOR SELECT
    USING (share_token IS NOT NULL);

-- Project images follow project access
CREATE POLICY "Users see own project images"
    ON project_images FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Design versions follow project access
CREATE POLICY "Users see own versions"
    ON design_versions FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Selections follow version access
CREATE POLICY "Users see own selections"
    ON project_selections FOR ALL
    USING (
        version_id IN (
            SELECT dv.id FROM design_versions dv
            JOIN projects p ON p.id = dv.project_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Product catalog is public read
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are public"
    ON product_catalog FOR SELECT
    USING (true);

-- Cost models are public read
ALTER TABLE cost_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cost models are public"
    ON cost_models FOR SELECT
    USING (true);

-- Renders follow project access
CREATE POLICY "Users see own renders"
    ON concept_renders FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- ── Updated at trigger ──

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON product_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cost_models_updated_at
    BEFORE UPDATE ON cost_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
