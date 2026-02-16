-- ─────────────────────────────────────────────
-- LUXEPLAN Seed Data
-- 100+ insertion-ready luxury products
-- ─────────────────────────────────────────────

-- ── FAUCETS ──
INSERT INTO product_catalog (external_id, name, brand, category, price, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('faucet-001', 'Mondrian Single Handle', 'Waterworks', 'faucets', 1850.00, '/products/faucets/mondrian.jpg', 'Sculptural single-handle faucet in polished nickel with ceramic disc valve', 'Solid brass', 'Polished Nickel', '{kitchen,bathroom}', true, 9, '{modern,minimalist}'),
('faucet-002', 'Bond Pull-Down', 'Brizo', 'faucets', 2340.00, '/products/faucets/bond.jpg', 'Articulating pull-down kitchen faucet with SmartTouch technology', 'Brass', 'Matte Black', '{kitchen}', true, 8, '{contemporary,industrial}'),
('faucet-003', 'Tara Classic', 'Dornbracht', 'faucets', 3200.00, '/products/faucets/tara.jpg', 'Timeless two-handle faucet with crosshead handles', 'Brass', 'Brushed Durabrass', '{kitchen,bathroom}', true, 9, '{classic,transitional}'),
('faucet-004', 'Vola 111', 'Vola', 'faucets', 2890.00, '/products/faucets/vola111.jpg', 'Iconic Danish design wall-mount faucet', 'Brass', 'Brushed Nickel', '{bathroom}', true, 9, '{scandinavian,minimalist}'),
('faucet-005', 'Purist Bridge', 'Kohler', 'faucets', 1450.00, '/products/faucets/purist.jpg', 'Bridge kitchen faucet with side spray and lever handles', 'Brass', 'Vibrant Stainless', '{kitchen}', true, 8, '{transitional,classic}'),
('faucet-006', 'Metris Select', 'Hansgrohe', 'faucets', 980.00, '/products/faucets/metris.jpg', 'Push-button kitchen mixer with swivel spout', 'Brass', 'Chrome', '{kitchen}', true, 7, '{modern,functional}'),
('faucet-007', 'Newport Brass Jacobean', 'Newport Brass', 'faucets', 2100.00, '/products/faucets/jacobean.jpg', 'Traditional widespread lavatory faucet with cross handles', 'Brass', 'Aged Brass', '{bathroom}', true, 8, '{traditional,elegant}'),
('faucet-008', 'Pot Filler Articulated', 'Rohl', 'faucets', 1200.00, '/products/faucets/pot-filler.jpg', 'Wall-mount articulated pot filler with cross handles', 'Brass', 'Polished Nickel', '{kitchen}', true, 8, '{functional,professional}'),
('faucet-009', 'Minimalist Bar Faucet', 'Kallista', 'faucets', 1650.00, '/products/faucets/bar-faucet.jpg', 'Cold water bar faucet in minimal cylinder design', 'Brass', 'Matte Black', '{kitchen}', true, 8, '{modern,bar}');

-- ── SINKS ──
INSERT INTO product_catalog (external_id, name, brand, category, price, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('sink-001', 'Ruvati Verona', 'Ruvati', 'sinks', 1200.00, '/products/sinks/verona.jpg', '36-inch fireclay farmhouse apron-front sink', 'Fireclay', 'White Gloss', '{kitchen}', true, 8, '{farmhouse,classic}'),
('sink-002', 'Kohler Stages 45', 'Kohler', 'sinks', 2800.00, '/products/sinks/stages.jpg', '45-inch stainless steel undermount kitchen sink with accessories', 'Stainless Steel', 'Satin', '{kitchen}', true, 9, '{modern,functional}'),
('sink-003', 'Native Trails Farmhouse', 'Native Trails', 'sinks', 3400.00, '/products/sinks/farmhouse-copper.jpg', 'Hand-hammered copper farmhouse sink with living finish', 'Copper', 'Antique Copper', '{kitchen}', true, 9, '{artisan,rustic}'),
('sink-004', 'Duravit Vero', 'Duravit', 'sinks', 890.00, '/products/sinks/vero.jpg', 'Rectangular above-counter washbasin with sharp geometric lines', 'Ceramic', 'White Alpin', '{bathroom}', true, 8, '{modern,geometric}'),
('sink-005', 'Stone Forest Vessel', 'Stone Forest', 'sinks', 4200.00, '/products/sinks/stone-vessel.jpg', 'Hand-carved natural stone vessel sink', 'Natural Stone', 'Honed', '{bathroom}', true, 9, '{organic,luxury}'),
('sink-006', 'Blanco Silgranit', 'Blanco', 'sinks', 750.00, '/products/sinks/silgranit.jpg', 'Double bowl undermount sink in composite granite', 'Silgranit', 'Anthracite', '{kitchen}', true, 7, '{contemporary,durable}'),
('sink-007', 'Integrated Quartz Sink', 'Silestone', 'sinks', 1600.00, '/products/sinks/integrated.jpg', 'Integrated quartz sink and countertop in single piece', 'Quartz', 'Matte', '{kitchen}', true, 8, '{seamless,modern}'),
('sink-008', 'Concrete Basin', 'Nood Co', 'sinks', 980.00, '/products/sinks/concrete-basin.jpg', 'Hand-cast concrete basin in pill shape', 'Concrete', 'Mid Tone Grey', '{bathroom}', true, 9, '{organic,artisan}');

-- ── COUNTERTOPS ──
INSERT INTO product_catalog (external_id, name, brand, category, price, price_unit, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('counter-001', 'Calacatta Borghini', 'ABC Stone', 'countertops', 185.00, 'sqft', '/products/countertops/calacatta.jpg', 'Premium Italian marble with dramatic gold and grey veining', 'Marble', 'Polished', '{kitchen,bathroom}', true, 9, '{luxury,classic}'),
('counter-002', 'Taj Mahal Quartzite', 'MSI', 'countertops', 145.00, 'sqft', '/products/countertops/taj-mahal.jpg', 'Exotic quartzite with warm golden tones and soft veining', 'Quartzite', 'Polished', '{kitchen,bathroom}', true, 9, '{warm,elegant}'),
('counter-003', 'Soapstone Barroca', 'M.Teixeira', 'countertops', 120.00, 'sqft', '/products/countertops/soapstone.jpg', 'Brazilian soapstone with rich charcoal veining', 'Soapstone', 'Honed', '{kitchen,bathroom}', true, 8, '{organic,matte}'),
('counter-004', 'Dekton Entzo', 'Cosentino', 'countertops', 95.00, 'sqft', '/products/countertops/dekton.jpg', 'Ultra-compact sintered surface inspired by Calacatta marble', 'Sintered Stone', 'Polished', '{kitchen,bathroom}', true, 8, '{modern,durable}'),
('counter-005', 'Nero Marquina', 'ABC Stone', 'countertops', 165.00, 'sqft', '/products/countertops/nero-marquina.jpg', 'Dramatic black marble with crisp white veining', 'Marble', 'Polished', '{kitchen,bathroom}', true, 9, '{dramatic,bold}'),
('counter-006', 'White Oak Butcher Block', 'Grothouse', 'countertops', 210.00, 'sqft', '/products/countertops/butcher-block.jpg', 'Premium white oak end-grain butcher block', 'Wood', 'Durata Waterproof', '{kitchen}', true, 8, '{warm,natural}'),
('counter-007', 'Terrazzo Palladiana', 'Diespeker', 'countertops', 175.00, 'sqft', '/products/countertops/terrazzo.jpg', 'Large chip terrazzo in warm neutral tones', 'Terrazzo', 'Polished', '{kitchen,bathroom}', true, 7, '{artisan,retro-modern}'),
('counter-008', 'Concrete Countertop', 'Trueform', 'countertops', 135.00, 'sqft', '/products/countertops/concrete.jpg', 'Custom cast concrete countertop with integral sink option', 'Concrete', 'Honed', '{kitchen,bathroom}', true, 8, '{industrial,artisan}'),
('counter-009', 'Leathered Granite', 'Arizona Tile', 'countertops', 88.00, 'sqft', '/products/countertops/leathered.jpg', 'Leathered finish black granite with textured surface', 'Granite', 'Leathered', '{kitchen}', true, 8, '{textured,moody}');

-- ── CABINETS ──
INSERT INTO product_catalog (external_id, name, brand, category, price, price_unit, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('cab-001', 'Shaker in Alabaster', 'Plain & Fancy', 'cabinets', 850.00, 'linear_ft', '/products/cabinets/shaker-white.jpg', 'Inset shaker door in maple with alabaster finish', 'Maple', 'Alabaster Paint', '{kitchen,bathroom}', true, 9, '{classic,clean}'),
('cab-002', 'Flat Panel Walnut', 'Henrybuilt', 'cabinets', 1200.00, 'linear_ft', '/products/cabinets/walnut-flat.jpg', 'Slab-front walnut cabinet doors with push-to-open mechanism', 'Walnut', 'Natural Oil', '{kitchen,bathroom}', true, 9, '{modern,warm}'),
('cab-003', 'Recessed Panel Sage', 'Waterworks', 'cabinets', 980.00, 'linear_ft', '/products/cabinets/sage-recessed.jpg', 'Recessed panel cabinet in heritage sage green', 'Poplar', 'Sage Paint', '{kitchen}', true, 8, '{transitional,color}'),
('cab-004', 'Rift Oak Minimal', 'Bulthaup', 'cabinets', 1450.00, 'linear_ft', '/products/cabinets/rift-oak.jpg', 'Handleless rift-cut white oak with invisible hinges', 'White Oak', 'Matte Lacquer', '{kitchen}', true, 9, '{minimalist,european}'),
('cab-005', 'Beaded Inset Navy', 'Christopher Peacock', 'cabinets', 1650.00, 'linear_ft', '/products/cabinets/navy-beaded.jpg', 'Beaded inset cabinetry in Hale Navy with brass hardware', 'Maple', 'Hale Navy Paint', '{kitchen}', true, 9, '{traditional,bold}'),
('cab-006', 'Floating Vanity Teak', 'RH', 'cabinets', 3200.00, 'each', '/products/cabinets/floating-teak.jpg', 'Wall-mounted floating vanity in reclaimed teak', 'Reclaimed Teak', 'Natural', '{bathroom}', true, 8, '{modern,spa}'),
('cab-007', 'Glass Front Display', 'Plain & Fancy', 'cabinets', 1100.00, 'linear_ft', '/products/cabinets/glass-front.jpg', 'Mullion glass-front upper cabinet in painted finish', 'Maple/Glass', 'White Paint', '{kitchen}', true, 8, '{traditional,display}'),
('cab-008', 'Fluted Panel', 'SemiHandmade', 'cabinets', 420.00, 'each', '/products/cabinets/fluted.jpg', 'Vertically fluted MDF cabinet fronts for IKEA frames', 'MDF', 'Matte White', '{kitchen,bathroom}', true, 8, '{textured,modern}');

-- ── BACKSPLASH ──
INSERT INTO product_catalog (external_id, name, brand, category, price, price_unit, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('back-001', 'Zellige in Weathered White', 'Clé Tile', 'backsplash', 38.00, 'sqft', '/products/backsplash/zellige-white.jpg', 'Handmade Moroccan zellige tiles with natural variation', 'Zellige', 'Glazed', '{kitchen,bathroom}', true, 9, '{artisan,textured}'),
('back-002', 'Calacatta Marble Slab', 'ABC Stone', 'backsplash', 165.00, 'sqft', '/products/backsplash/calacatta-slab.jpg', 'Full slab Calacatta marble backsplash', 'Marble', 'Polished', '{kitchen,bathroom}', true, 9, '{luxury,seamless}'),
('back-003', 'Heath Dimensional', 'Heath Ceramics', 'backsplash', 52.00, 'sqft', '/products/backsplash/heath.jpg', 'Handcrafted dimensional tiles in varied glazes', 'Ceramic', 'Matte Glaze', '{kitchen,bathroom}', true, 8, '{artisan,california}'),
('back-004', 'Waterjet Arabesque', 'Artistic Tile', 'backsplash', 85.00, 'sqft', '/products/backsplash/arabesque.jpg', 'Waterjet-cut marble and brass arabesque mosaic', 'Marble/Brass', 'Polished', '{kitchen,bathroom}', true, 8, '{ornate,luxury}'),
('back-005', 'Matte Black Subway', 'Fireclay Tile', 'backsplash', 22.00, 'sqft', '/products/backsplash/black-subway.jpg', 'Handmade 3x6 subway tile in true matte black', 'Ceramic', 'Matte', '{kitchen,bathroom}', true, 8, '{modern,bold}'),
('back-006', 'Terrazzo Micro', 'Concrete Collaborative', 'backsplash', 48.00, 'sqft', '/products/backsplash/terrazzo-micro.jpg', 'Micro chip terrazzo tiles in blush tones', 'Terrazzo', 'Honed', '{kitchen,bathroom}', true, 7, '{playful,retro}'),
('back-007', 'Fluted Marble', 'Ann Sacks', 'backsplash', 95.00, 'sqft', '/products/backsplash/fluted-marble.jpg', 'Vertically fluted Thassos marble tiles', 'Marble', 'Honed', '{kitchen,bathroom}', true, 9, '{textured,elegant}'),
('back-008', 'Herringbone Marble', 'Tilebar', 'backsplash', 42.00, 'sqft', '/products/backsplash/herringbone.jpg', '1x3 marble herringbone mosaic in Carrara', 'Marble', 'Honed', '{kitchen,bathroom}', true, 8, '{classic,pattern}'),
('back-009', 'Glass Slab', 'ThinkGlass', 'backsplash', 120.00, 'sqft', '/products/backsplash/glass-slab.jpg', 'Back-painted tempered glass slab backsplash', 'Glass', 'Back-Painted', '{kitchen}', true, 8, '{modern,seamless}');

-- ── FLOORING ──
INSERT INTO product_catalog (external_id, name, brand, category, price, price_unit, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('floor-001', 'European White Oak Wide Plank', 'Dinesen', 'flooring', 32.00, 'sqft', '/products/flooring/dinesen-oak.jpg', '12-inch wide premium white oak planks, up to 16ft lengths', 'White Oak', 'Natural Oil', '{kitchen,bathroom}', true, 9, '{scandinavian,luxury}'),
('floor-002', 'Encaustic Cement Tile', 'Popham Design', 'flooring', 28.00, 'sqft', '/products/flooring/encaustic.jpg', 'Hand-poured cement tiles in geometric patterns', 'Cement', 'Matte', '{kitchen,bathroom}', true, 8, '{artisan,pattern}'),
('floor-003', 'Honed Limestone', 'Paris Ceramics', 'flooring', 42.00, 'sqft', '/products/flooring/limestone.jpg', 'French limestone in tumbled antiqued finish', 'Limestone', 'Antiqued', '{kitchen,bathroom}', true, 9, '{classic,european}'),
('floor-004', 'Chevron Parquet Walnut', 'Havwoods', 'flooring', 38.00, 'sqft', '/products/flooring/chevron-walnut.jpg', 'Chevron pattern walnut parquet flooring', 'Walnut', 'Matte Lacquer', '{kitchen}', true, 8, '{classic,parisian}'),
('floor-005', 'Black Slate Natural', 'Stone Source', 'flooring', 18.00, 'sqft', '/products/flooring/black-slate.jpg', 'Natural cleft black slate tiles', 'Slate', 'Natural Cleft', '{kitchen,bathroom}', true, 7, '{organic,dramatic}'),
('floor-006', 'Large Format Porcelain', 'Marazzi', 'flooring', 14.00, 'sqft', '/products/flooring/large-porcelain.jpg', '48x48 porcelain tiles in warm grey concrete look', 'Porcelain', 'Matte', '{kitchen,bathroom}', true, 8, '{modern,minimal}'),
('floor-007', 'Hex Terracotta', 'Tabarka', 'flooring', 24.00, 'sqft', '/products/flooring/hex-terracotta.jpg', 'Handmade hexagonal terracotta tiles', 'Terracotta', 'Natural', '{kitchen,bathroom}', true, 8, '{mediterranean,warm}'),
('floor-008', 'Penny Round Mosaic', 'Merola', 'flooring', 16.00, 'sqft', '/products/flooring/penny-round.jpg', 'Porcelain penny round mosaic in matte white', 'Porcelain', 'Matte', '{bathroom}', true, 8, '{classic,bathroom}');

-- ── LIGHTING ──
INSERT INTO product_catalog (external_id, name, brand, category, price, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('light-001', 'Melange Elongated Pendant', 'Visual Comfort', 'lighting', 1890.00, '/products/lighting/melange.jpg', 'Alabaster and brass elongated pendant for kitchen islands', 'Alabaster/Brass', 'Antique Brass', '{kitchen}', true, 9, '{sculptural,warm}'),
('light-002', 'IC Ceiling Light', 'Flos', 'lighting', 750.00, '/products/lighting/ic-flos.jpg', 'Michael Anastassiades blown glass sphere on brass frame', 'Glass/Brass', 'Brushed Brass', '{kitchen,bathroom}', true, 9, '{modern,iconic}'),
('light-003', 'Apparatus Studio Vanity', 'Apparatus', 'lighting', 3200.00, '/products/lighting/apparatus.jpg', 'Horsehair and brass vanity light with porcelain diffuser', 'Brass/Horsehair', 'Satin Brass', '{bathroom}', true, 9, '{artisan,statement}'),
('light-004', 'Cedar & Moss Alto Sconce', 'Cedar & Moss', 'lighting', 320.00, '/products/lighting/alto.jpg', 'Minimalist wall sconce with linen shade', 'Brass/Linen', 'Brushed Brass', '{bathroom}', true, 8, '{minimal,warm}'),
('light-005', 'Roll & Hill Modo Chandelier', 'Roll & Hill', 'lighting', 8500.00, '/products/lighting/modo.jpg', '13-globe modular glass and brass chandelier', 'Glass/Brass', 'Brushed Brass', '{kitchen}', true, 9, '{modern,statement}'),
('light-006', 'Workstead Lodge Linear', 'Workstead', 'lighting', 2400.00, '/products/lighting/lodge.jpg', 'Hand-bent brass linear pendant with patina finish', 'Brass', 'Natural Patina', '{kitchen}', true, 8, '{artisan,industrial}'),
('light-007', 'Articolo Fizi Ball', 'Articolo', 'lighting', 1650.00, '/products/lighting/fizi.jpg', 'Mouth-blown textured glass pendant', 'Glass', 'Clear Textured', '{kitchen,bathroom}', true, 8, '{organic,sculptural}'),
('light-008', 'Recessed Trim Ring', 'Element', 'lighting', 180.00, '/products/lighting/recessed.jpg', 'Trimless recessed downlight with warm dim technology', 'Aluminum', 'White', '{kitchen,bathroom}', true, 7, '{minimal,architectural}'),
('light-009', 'Picture Light Brass', 'Circa Lighting', 'lighting', 480.00, '/products/lighting/picture-light.jpg', 'Slim profile picture light for artwork and mirrors', 'Brass', 'Hand-Rubbed Antique Brass', '{bathroom}', true, 8, '{classic,accent}');

-- ── MIRRORS ──
INSERT INTO product_catalog (external_id, name, brand, category, price, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('mirror-001', 'Daphne Round Mirror', 'Rejuvenation', 'mirrors', 680.00, '/products/mirrors/daphne.jpg', '36-inch round mirror with thin brass frame', 'Brass/Glass', 'Aged Brass', '{bathroom}', true, 9, '{classic,warm}'),
('mirror-002', 'Infinity Frameless', 'CB2', 'mirrors', 450.00, '/products/mirrors/infinity.jpg', '36x24 frameless mirror with polished edge', 'Glass', 'Polished Edge', '{bathroom}', true, 8, '{modern,minimal}'),
('mirror-003', 'Arched Floor Mirror', 'RH', 'mirrors', 2800.00, '/products/mirrors/arched.jpg', '7-foot arched metal frame floor mirror', 'Iron/Glass', 'Antique Iron', '{bathroom}', true, 9, '{dramatic,statement}'),
('mirror-004', 'Capsule LED Mirror', 'West Elm', 'mirrors', 890.00, '/products/mirrors/capsule-led.jpg', 'Backlit capsule mirror with integrated LED and defogger', 'Aluminum/Glass', 'Matte Black', '{bathroom}', true, 8, '{modern,functional}'),
('mirror-005', 'Venetian Antiqued', 'John Derian', 'mirrors', 3400.00, '/products/mirrors/venetian.jpg', 'Hand-antiqued Venetian glass mirror with foxed finish', 'Glass', 'Antiqued', '{bathroom}', true, 9, '{vintage,romantic}'),
('mirror-006', 'Pivoting Vanity Mirror', 'Waterworks', 'mirrors', 1200.00, '/products/mirrors/pivoting.jpg', 'Wall-mounted pivoting mirror on brass arm', 'Brass/Glass', 'Unlacquered Brass', '{bathroom}', true, 9, '{classic,functional}');

-- ── HARDWARE ──
INSERT INTO product_catalog (external_id, name, brand, category, price, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('hw-001', 'Arc Pull 6"', 'Schoolhouse', 'hardware', 48.00, '/products/hardware/arc-pull.jpg', 'Solid brass arc pull in 6-inch center-to-center', 'Brass', 'Aged Brass', '{kitchen,bathroom}', true, 8, '{classic,warm}'),
('hw-002', 'Linear Edge Pull', 'Emtek', 'hardware', 32.00, '/products/hardware/linear.jpg', 'Slim profile edge pull for handleless look', 'Stainless Steel', 'Satin Nickel', '{kitchen,bathroom}', true, 7, '{modern,minimal}'),
('hw-003', 'T-Bar Knurled', 'Buster + Punch', 'hardware', 65.00, '/products/hardware/knurled.jpg', 'Knurled T-bar pull in solid brass', 'Brass', 'Smoked Bronze', '{kitchen,bathroom}', true, 9, '{industrial,tactile}'),
('hw-004', 'Globe Knob', 'Anthropologie', 'hardware', 18.00, '/products/hardware/globe.jpg', 'Hand-cast brass globe knob with patina', 'Brass', 'Natural Brass', '{kitchen,bathroom}', true, 7, '{eclectic,artisan}'),
('hw-005', 'Flat Black Bar Pull', 'Top Knobs', 'hardware', 28.00, '/products/hardware/flat-bar.jpg', '12-inch flat bar pull in matte black', 'Zinc', 'Flat Black', '{kitchen,bathroom}', true, 8, '{modern,bold}'),
('hw-006', 'Leather Wrap Pull', 'Turnstyle', 'hardware', 95.00, '/products/hardware/leather.jpg', 'Brass pull wrapped in hand-stitched saddle leather', 'Brass/Leather', 'Polished Brass/Tan', '{kitchen}', true, 8, '{warm,tactile}'),
('hw-007', 'Stepped Backplate Pull', 'Waterworks', 'hardware', 120.00, '/products/hardware/stepped.jpg', 'Stepped backplate with lever pull in unlacquered brass', 'Brass', 'Unlacquered Brass', '{kitchen,bathroom}', true, 8, '{transitional,classic}');

-- ── APPLIANCES ──
INSERT INTO product_catalog (external_id, name, brand, category, price, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('appl-001', '48" Dual Fuel Range', 'La Cornue', 'appliances', 18500.00, '/products/appliances/lacornue.jpg', 'Château series range in custom color with brass trim', 'Steel/Brass', 'Custom Color', '{kitchen}', true, 9, '{luxury,statement}'),
('appl-002', 'Column Refrigerator', 'Sub-Zero', 'appliances', 9800.00, '/products/appliances/subzero-column.jpg', '30-inch integrated column refrigerator with panel-ready design', 'Stainless Steel', 'Panel Ready', '{kitchen}', true, 8, '{integrated,modern}'),
('appl-003', 'Pro Range 36"', 'Wolf', 'appliances', 8200.00, '/products/appliances/wolf-range.jpg', '36-inch gas range with infrared charbroiler and griddle', 'Stainless Steel', 'Stainless', '{kitchen}', true, 9, '{professional,performance}'),
('appl-004', 'Panel-Ready Dishwasher', 'Miele', 'appliances', 2400.00, '/products/appliances/miele-dw.jpg', 'Fully integrated dishwasher with AutoDos and knock-to-open', 'Stainless Steel', 'Panel Ready', '{kitchen}', true, 7, '{integrated,silent}'),
('appl-005', 'Induction Cooktop 36"', 'Gaggenau', 'appliances', 5600.00, '/products/appliances/gaggenau-induction.jpg', 'Full surface induction cooktop with flex zones', 'Glass Ceramic', 'Black', '{kitchen}', true, 8, '{modern,performance}'),
('appl-006', 'Ventilation Hood Insert', 'Best', 'appliances', 1800.00, '/products/appliances/hood-insert.jpg', 'Built-in ventilation insert for custom hood', 'Stainless Steel', 'Stainless', '{kitchen}', true, 7, '{integrated,functional}'),
('appl-007', 'Built-In Coffee System', 'Miele', 'appliances', 4200.00, '/products/appliances/coffee.jpg', 'Built-in whole bean coffee system with dual dispensers', 'Stainless Steel', 'Obsidian Black', '{kitchen}', true, 8, '{luxury,integrated}');

-- ── BATHROOM FIXTURES ──
INSERT INTO product_catalog (external_id, name, brand, category, price, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('fix-001', 'Freestanding Soaking Tub', 'Victoria + Albert', 'tub', 6800.00, '/products/fixtures/freestanding-tub.jpg', 'Barcelona freestanding tub in volcanic limestone composite', 'Volcanic Limestone', 'Gloss White', '{bathroom}', true, 9, '{sculptural,spa}'),
('fix-002', 'Japanese Soaking Tub', 'Aquatica', 'tub', 4500.00, '/products/fixtures/ofuro.jpg', 'Deep soaking tub inspired by traditional Japanese ofuro', 'Solid Surface', 'Matte White', '{bathroom}', true, 8, '{zen,minimal}'),
('fix-003', 'Rainfall Shower System', 'Fantini', 'shower', 4200.00, '/products/fixtures/rainfall.jpg', 'Ceiling-mount 16-inch rainfall shower head with hand shower', 'Brass', 'Brushed Nickel', '{bathroom}', true, 9, '{luxury,spa}'),
('fix-004', 'Wall-Mount Toilet', 'Toto', 'toilet', 1850.00, '/products/fixtures/wall-toilet.jpg', 'Wall-hung toilet with Washlet bidet seat and concealed tank', 'Vitreous China', 'Cotton White', '{bathroom}', true, 8, '{modern,clean}'),
('fix-005', 'Pedestal Tub', 'Waterworks', 'tub', 12000.00, '/products/fixtures/pedestal-tub.jpg', 'Cast iron clawfoot tub with polished exterior', 'Cast Iron', 'Polished Nickel Exterior', '{bathroom}', true, 9, '{traditional,statement}'),
('fix-006', 'Linear Shower Drain', 'Infinity Drain', 'shower', 890.00, '/products/fixtures/linear-drain.jpg', '36-inch linear shower drain with tile-insert grate', 'Stainless Steel', 'Satin', '{bathroom}', true, 7, '{modern,seamless}'),
('fix-007', 'Thermostatic Shower Panel', 'Graff', 'shower', 5800.00, '/products/fixtures/thermo-panel.jpg', 'Full thermostatic shower panel with body jets and rain head', 'Brass', 'Brushed Nickel', '{bathroom}', true, 8, '{luxury,spa}'),
('fix-008', 'Bidet Seat', 'Toto', 'toilet', 1400.00, '/products/fixtures/bidet-seat.jpg', 'Washlet S7A electronic bidet seat with ewater+', 'Plastic', 'Cotton White', '{bathroom}', true, 7, '{modern,wellness}');

-- ── VANITIES ──
INSERT INTO product_catalog (external_id, name, brand, category, price, image_url, description, material, finish, room_types, is_insertion_ready, pose_rating, style_tags) VALUES
('van-001', '60" Double Vanity', 'Restoration Hardware', 'vanity', 5400.00, '/products/vanity/rh-double.jpg', 'Weathered oak double vanity with marble top', 'Oak/Marble', 'Weathered', '{bathroom}', true, 9, '{transitional,luxury}'),
('van-002', 'Floating Console Vanity', 'West Elm', 'vanity', 2200.00, '/products/vanity/floating-console.jpg', 'Wall-mounted console vanity in blackened steel and marble', 'Steel/Marble', 'Blackened', '{bathroom}', true, 8, '{modern,industrial}'),
('van-003', 'Vintage Chest Vanity', 'Custom', 'vanity', 3800.00, '/products/vanity/vintage-chest.jpg', 'Repurposed vintage chest converted to vanity with stone top', 'Wood/Stone', 'Original Patina', '{bathroom}', true, 8, '{eclectic,one-of-a-kind}'),
('van-004', 'Concrete Trough Vanity', 'Native Trails', 'vanity', 4600.00, '/products/vanity/concrete-trough.jpg', 'Hand-finished concrete trough vanity with integrated sink', 'NativeStone Concrete', 'Ash', '{bathroom}', true, 9, '{organic,artisan}'),
('van-005', 'Built-In Linen Tower', 'Duravit', 'vanity', 2800.00, '/products/vanity/linen-tower.jpg', 'Tall storage cabinet with soft-close doors and interior lighting', 'MDF', 'Graphite Matte', '{bathroom}', true, 7, '{modern,storage}');

-- ── COST MODELS ──
INSERT INTO cost_models (category, zip_prefix, labor_multiplier, base_labor_rate_low, base_labor_rate_high, unit) VALUES
-- Default rates
('faucets', '000', 1.00, 150.00, 350.00, 'each'),
('sinks', '000', 1.00, 250.00, 500.00, 'each'),
('countertops', '000', 1.00, 40.00, 65.00, 'sqft'),
('cabinets', '000', 1.00, 150.00, 300.00, 'linear_ft'),
('backsplash', '000', 1.00, 15.00, 30.00, 'sqft'),
('flooring', '000', 1.00, 8.00, 15.00, 'sqft'),
('lighting', '000', 1.00, 200.00, 500.00, 'each'),
('mirrors', '000', 1.00, 100.00, 250.00, 'each'),
('hardware', '000', 1.00, 5.00, 15.00, 'each'),
('appliances', '000', 1.00, 300.00, 800.00, 'each'),
('tub', '000', 1.00, 800.00, 2000.00, 'each'),
('shower', '000', 1.00, 500.00, 1500.00, 'each'),
('toilet', '000', 1.00, 300.00, 600.00, 'each'),
('vanity', '000', 1.00, 400.00, 1000.00, 'each'),
-- NYC premium rates
('faucets', '100', 1.85, 150.00, 350.00, 'each'),
('sinks', '100', 1.85, 250.00, 500.00, 'each'),
('countertops', '100', 1.85, 40.00, 65.00, 'sqft'),
('cabinets', '100', 1.85, 150.00, 300.00, 'linear_ft'),
('backsplash', '100', 1.85, 15.00, 30.00, 'sqft'),
('flooring', '100', 1.85, 8.00, 15.00, 'sqft'),
-- LA premium rates
('faucets', '900', 1.65, 150.00, 350.00, 'each'),
('sinks', '900', 1.65, 250.00, 500.00, 'each'),
('countertops', '900', 1.65, 40.00, 65.00, 'sqft'),
('cabinets', '900', 1.65, 150.00, 300.00, 'linear_ft'),
-- Chicago rates
('faucets', '606', 1.35, 150.00, 350.00, 'each'),
('sinks', '606', 1.35, 250.00, 500.00, 'each'),
('countertops', '606', 1.35, 40.00, 65.00, 'sqft'),
('cabinets', '606', 1.35, 150.00, 300.00, 'linear_ft'),
-- Miami rates
('faucets', '331', 1.25, 150.00, 350.00, 'each'),
('sinks', '331', 1.25, 250.00, 500.00, 'each'),
('countertops', '331', 1.25, 40.00, 65.00, 'sqft'),
('cabinets', '331', 1.25, 150.00, 300.00, 'linear_ft');
