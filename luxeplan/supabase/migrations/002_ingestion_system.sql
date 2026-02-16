-- ─────────────────────────────────────────────
-- LUXEPLAN Product Ingestion System
-- Migration 002
-- ─────────────────────────────────────────────

-- ── Product Sources ──

CREATE TABLE product_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    adapter_type TEXT NOT NULL CHECK (adapter_type IN (
        'home_depot_feed', 'lowes_catalog', 'pinterest', 'manual'
    )),
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default sources
INSERT INTO product_sources (name, adapter_type, config) VALUES
    ('Home Depot Feed', 'home_depot_feed', '{"feed_url": "", "api_key": ""}'),
    ('Lowes Catalog', 'lowes_catalog', '{"api_key": "", "api_secret": ""}'),
    ('Pinterest Inspiration', 'pinterest', '{"access_token": ""}'),
    ('Manual Entry', 'manual', '{}');

-- ── Products (normalized catalog) ──

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES product_sources(id) ON DELETE SET NULL,
    external_id TEXT,
    retailer TEXT,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'faucets', 'sinks', 'countertops', 'cabinets', 'backsplash',
        'flooring', 'lighting', 'mirrors', 'hardware', 'appliances',
        'fixtures', 'shower', 'tub', 'vanity', 'toilet'
    )),
    description TEXT,
    product_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_id, external_id)
);

CREATE INDEX idx_ingestion_products_category ON products(category);
CREATE INDEX idx_ingestion_products_retailer ON products(retailer);
CREATE INDEX idx_ingestion_products_tags ON products USING GIN(tags);
CREATE INDEX idx_ingestion_products_source ON products(source_id);

-- ── Product Images ──

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'primary' CHECK (type IN ('primary', 'gallery')),
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ── Product Assets (prepared for Live Studio) ──

CREATE TABLE product_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('cutout_png', 'texture_tile', 'thumbnail')),
    asset_url TEXT NOT NULL,
    pose_score INTEGER CHECK (pose_score BETWEEN 0 AND 100),
    is_live_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_assets_product ON product_assets(product_id);
CREATE INDEX idx_product_assets_eligible ON product_assets(is_live_eligible) WHERE is_live_eligible = TRUE;

-- ── Product Prices ──

CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    unit TEXT NOT NULL DEFAULT 'each' CHECK (unit IN ('each', 'sqft', 'linear_ft')),
    effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_prices_product ON product_prices(product_id);
CREATE INDEX idx_product_prices_effective ON product_prices(product_id, effective_at DESC);

-- ── Product Inventory ──

CREATE TABLE product_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    availability TEXT NOT NULL DEFAULT 'unknown' CHECK (availability IN (
        'in_stock', 'out_of_stock', 'limited', 'unknown'
    )),
    effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_inventory_product ON product_inventory(product_id);

-- ── Ingestion Runs ──

CREATE TABLE ingestion_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES product_sources(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
        'running', 'completed', 'failed', 'cancelled'
    )),
    products_fetched INTEGER NOT NULL DEFAULT 0,
    products_created INTEGER NOT NULL DEFAULT 0,
    products_updated INTEGER NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ingestion_runs_source ON ingestion_runs(source_id);
CREATE INDEX idx_ingestion_runs_status ON ingestion_runs(status);

-- ── Inspiration Items (Pinterest) ──

CREATE TABLE inspiration_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pin_id TEXT UNIQUE,
    board_id TEXT,
    image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    source_url TEXT,
    promoted_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspiration_pin ON inspiration_items(pin_id);
CREATE INDEX idx_inspiration_tags ON inspiration_items USING GIN(tags);

-- ── Job Queue ──

CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type TEXT NOT NULL CHECK (job_type IN (
        'INGEST_SOURCE', 'PREP_ASSETS_FOR_PRODUCT', 'REFRESH_PRICE', 'REFRESH_INVENTORY'
    )),
    payload JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed'
    )),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_queue_status ON job_queue(status, created_at) WHERE status = 'pending';

-- ── Row Level Security ──

ALTER TABLE product_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Public read for catalog data
CREATE POLICY "Products are public read" ON products FOR SELECT USING (true);
CREATE POLICY "Product images are public read" ON product_images FOR SELECT USING (true);
CREATE POLICY "Product assets are public read" ON product_assets FOR SELECT USING (true);
CREATE POLICY "Product prices are public read" ON product_prices FOR SELECT USING (true);
CREATE POLICY "Product inventory is public read" ON product_inventory FOR SELECT USING (true);
CREATE POLICY "Inspiration items are public read" ON inspiration_items FOR SELECT USING (true);
CREATE POLICY "Product sources are public read" ON product_sources FOR SELECT USING (true);

-- Service role only for writes (ingestion system uses service role key)
CREATE POLICY "Service role writes products" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes product_images" ON product_images FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes product_assets" ON product_assets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes product_prices" ON product_prices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes product_inventory" ON product_inventory FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes ingestion_runs" ON ingestion_runs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes inspiration_items" ON inspiration_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes product_sources" ON product_sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes job_queue" ON job_queue FOR ALL USING (auth.role() = 'service_role');

-- ── Updated-at triggers ──

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER product_sources_updated_at
    BEFORE UPDATE ON product_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
