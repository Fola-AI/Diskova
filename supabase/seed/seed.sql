-- DEV seed (PRD §13). Idempotent: safe to re-run. NEVER run against PROD.
-- Vendors are fictional sample listings (is_seed = true, status = draft). Area coordinates are
-- approximate centroids for development only.
begin;

-- ---------------------------------------------------------------- platform settings
update public.platform_settings
   set december_season_start = date '2026-11-15',
       december_season_end   = date '2027-01-10',
       monetisation_notice_md = 'Listing your venue is **free**. If we ever introduce paid options, '
         || 'existing listings stay free and we will give at least 30 days'' notice first.'
 where id = 1;

-- ---------------------------------------------------------------- categories (§6.3)
insert into public.categories (slug, name, "group", icon, sort_order) values
  ('nightclub',      'Nightclub',      'nightlife',     'music',             10),
  ('lounge',         'Lounge',         'nightlife',     'sofa',              20),
  ('bar',            'Bar',            'nightlife',     'beer',              30),
  ('rooftop',        'Rooftop',        'nightlife',     'building-2',        40),
  ('restaurant',     'Restaurant',     'food_drink',    'utensils-crossed',  50),
  ('cafe',           'Café',           'food_drink',    'coffee',            60),
  ('street_food',    'Street food',    'food_drink',    'sandwich',          70),
  ('beach',          'Beach',          'daytime',       'waves',             80),
  ('resort',         'Resort',         'daytime',       'palmtree',          90),
  ('amusement_park', 'Amusement park', 'daytime',       'ferris-wheel',     100),
  ('cinema',         'Cinema',         'culture',       'clapperboard',     110),
  ('art_gallery',    'Art gallery',    'culture',       'palette',          120),
  ('museum',         'Museum',         'culture',       'landmark',         130),
  ('market',         'Market',         'daytime',       'shopping-basket',  140),
  ('nature',         'Nature',         'daytime',       'trees',            150),
  ('historic_site',  'Historic site',  'culture',       'castle',           160),
  ('concert_venue',  'Concert venue',  'events',        'mic-vocal',        170),
  ('event_space',    'Event space',    'events',        'party-popper',     180),
  ('hotel_bar',      'Hotel bar',      'stay_adjacent', 'hotel',            190)
on conflict (slug) do update set name = excluded.name, "group" = excluded."group",
  icon = excluded.icon, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------- cities (§1.4)
insert into public.cities (slug, name, state, centroid, sort_order) values
  ('lagos',         'Lagos',         'Lagos',  extensions.st_setsrid(extensions.st_makepoint(3.3792, 6.5244), 4326)::extensions.geography, 10),
  ('abuja',         'Abuja',         'FCT',    extensions.st_setsrid(extensions.st_makepoint(7.4898, 9.0579), 4326)::extensions.geography, 20),
  ('ibadan',        'Ibadan',        'Oyo',    extensions.st_setsrid(extensions.st_makepoint(3.9470, 7.3775), 4326)::extensions.geography, 30),
  ('port-harcourt', 'Port Harcourt', 'Rivers', extensions.st_setsrid(extensions.st_makepoint(7.0498, 4.8156), 4326)::extensions.geography, 40),
  ('aba',           'Aba',           'Abia',   extensions.st_setsrid(extensions.st_makepoint(7.3667, 5.1066), 4326)::extensions.geography, 50),
  ('owerri',        'Owerri',        'Imo',    extensions.st_setsrid(extensions.st_makepoint(7.0351, 5.4840), 4326)::extensions.geography, 60)
on conflict (slug) do update set name = excluded.name, state = excluded.state,
  centroid = excluded.centroid, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------- areas (Lagos 12, Abuja 8, Ibadan 6, PH 6, Aba 4, Owerri 4)
with a(city_slug, slug, name, lat, lng, sort_order) as (values
  ('lagos', 'victoria-island', 'Victoria Island', 6.4281, 3.4216, 10),
  ('lagos', 'ikoyi', 'Ikoyi', 6.4541, 3.4346, 20),
  ('lagos', 'lekki-phase-1', 'Lekki Phase 1', 6.4474, 3.4720, 30),
  ('lagos', 'oniru', 'Oniru', 6.4300, 3.4480, 40),
  ('lagos', 'chevron', 'Chevron', 6.4386, 3.5300, 50),
  ('lagos', 'ajah', 'Ajah', 6.4698, 3.5852, 60),
  ('lagos', 'ikeja-gra', 'Ikeja GRA', 6.5774, 3.3523, 70),
  ('lagos', 'ikeja', 'Ikeja', 6.6018, 3.3515, 80),
  ('lagos', 'maryland', 'Maryland', 6.5710, 3.3670, 90),
  ('lagos', 'yaba', 'Yaba', 6.5095, 3.3711, 100),
  ('lagos', 'surulere', 'Surulere', 6.4969, 3.3540, 110),
  ('lagos', 'festac', 'Festac', 6.4667, 3.2833, 120),
  ('abuja', 'wuse-2', 'Wuse 2', 9.0790, 7.4700, 10),
  ('abuja', 'maitama', 'Maitama', 9.0950, 7.4950, 20),
  ('abuja', 'asokoro', 'Asokoro', 9.0400, 7.5200, 30),
  ('abuja', 'garki', 'Garki', 9.0300, 7.4900, 40),
  ('abuja', 'central-business-district', 'Central Business District', 9.0560, 7.4890, 50),
  ('abuja', 'jabi', 'Jabi', 9.0700, 7.4250, 60),
  ('abuja', 'utako', 'Utako', 9.0700, 7.4400, 70),
  ('abuja', 'gwarinpa', 'Gwarinpa', 9.1100, 7.4000, 80),
  ('ibadan', 'bodija', 'Bodija', 7.4300, 3.9150, 10),
  ('ibadan', 'ring-road', 'Ring Road', 7.3640, 3.8840, 20),
  ('ibadan', 'dugbe', 'Dugbe', 7.3870, 3.8830, 30),
  ('ibadan', 'jericho', 'Jericho', 7.4000, 3.8700, 40),
  ('ibadan', 'challenge', 'Challenge', 7.3500, 3.8800, 50),
  ('ibadan', 'oluyole', 'Oluyole', 7.3600, 3.8600, 60),
  ('port-harcourt', 'gra-phase-2', 'GRA Phase 2', 4.8240, 7.0050, 10),
  ('port-harcourt', 'old-gra', 'Old GRA', 4.7800, 7.0050, 20),
  ('port-harcourt', 'trans-amadi', 'Trans-Amadi', 4.8100, 7.0400, 30),
  ('port-harcourt', 'd-line', 'D-Line', 4.8050, 7.0150, 40),
  ('port-harcourt', 'rumuola', 'Rumuola', 4.8400, 7.0100, 50),
  ('port-harcourt', 'peter-odili-road', 'Peter Odili Road', 4.8000, 7.0600, 60),
  ('aba', 'aba-gra', 'Aba GRA', 5.1100, 7.3600, 10),
  ('aba', 'ogbor-hill', 'Ogbor Hill', 5.1300, 7.3700, 20),
  ('aba', 'asa-road', 'Asa Road', 5.1000, 7.3550, 30),
  ('aba', 'ariaria', 'Ariaria', 5.1150, 7.3300, 40),
  ('owerri', 'ikenegbu', 'Ikenegbu', 5.4900, 7.0300, 10),
  ('owerri', 'new-owerri', 'New Owerri', 5.4800, 7.0100, 20),
  ('owerri', 'world-bank', 'World Bank', 5.4700, 7.0000, 30),
  ('owerri', 'wetheral-road', 'Wetheral Road', 5.4850, 7.0400, 40)
)
insert into public.areas (city_id, slug, name, centroid, sort_order)
select c.id, a.slug, a.name,
       extensions.st_setsrid(extensions.st_makepoint(a.lng, a.lat), 4326)::extensions.geography,
       a.sort_order
  from a join public.cities c on c.slug = a.city_slug
on conflict (city_id, slug) do update set name = excluded.name, centroid = excluded.centroid,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------- sample vendors (10 per city, fictional, draft)
with v(city_slug, area_slug, name, category_slug, price_band, tagline, n) as (values
  ('lagos', 'victoria-island', 'Indigo Tide Lounge', 'lounge', 'premium', 'Low lights, Afrobeats and lagoon breeze', 1),
  ('lagos', 'ikoyi', 'Copper Lantern Rooftop', 'rooftop', 'luxury', 'Skyline cocktails above Ikoyi', 2),
  ('lagos', 'lekki-phase-1', 'Afrobeat Junction', 'nightclub', 'premium', 'Late nights, live DJs, packed floor', 3),
  ('lagos', 'ikeja-gra', 'Mama Kemi''s Grill House', 'restaurant', 'mid', 'Smoky grills and jollof done right', 4),
  ('lagos', 'yaba', 'Palmwine & Pepper', 'bar', 'budget', 'Cold palmwine, peppered snail, good company', 5),
  ('lagos', 'ajah', 'Sandbar Cove Beach', 'beach', 'mid', 'Day loungers and sunset music', 6),
  ('lagos', 'surulere', 'Brass Hour Café', 'cafe', 'budget', 'Coffee, small chops and Wi-Fi', 7),
  ('lagos', 'oniru', 'Reel Lagoon Cinema', 'cinema', 'mid', 'Blockbusters and Nollywood premieres', 8),
  ('lagos', 'ikoyi', 'Ochre Wall Gallery', 'art_gallery', 'free', 'Contemporary Nigerian art, free entry', 9),
  ('lagos', 'ikeja', 'Suya Street Corner', 'street_food', 'budget', 'Fresh suya off the grill till late', 10),
  ('abuja', 'wuse-2', 'Savannah Moon Lounge', 'lounge', 'premium', 'Shisha-free lounge with live sax nights', 1),
  ('abuja', 'maitama', 'Citadel Rooftop Bar', 'rooftop', 'luxury', 'City lights and signature cocktails', 2),
  ('abuja', 'wuse-2', 'Pulse Ninety Club', 'nightclub', 'premium', 'Amapiano Fridays, Afrobeats Saturdays', 3),
  ('abuja', 'asokoro', 'Hilltop Hearth Kitchen', 'restaurant', 'premium', 'Northern and coastal Nigerian plates', 4),
  ('abuja', 'jabi', 'Lakeside Bean Café', 'cafe', 'mid', 'Lake views and slow mornings', 5),
  ('abuja', 'garki', 'Garki Grillyard', 'street_food', 'budget', 'Kilishi, suya and masa', 6),
  ('abuja', 'central-business-district', 'Capital Frames Cinema', 'cinema', 'mid', 'New releases every Friday', 7),
  ('abuja', 'maitama', 'Kola Nut Gallery', 'art_gallery', 'free', 'Rotating exhibitions from across the north', 8),
  ('abuja', 'gwarinpa', 'Greenbelt Trails', 'nature', 'free', 'Morning walks and weekend picnics', 9),
  ('abuja', 'utako', 'Utako Brew Room', 'bar', 'mid', 'Cold drinks and football on big screens', 10),
  ('ibadan', 'bodija', 'Brown Roof Lounge', 'lounge', 'mid', 'Highlife evenings in Bodija', 1),
  ('ibadan', 'bodija', 'Amala Heritage Kitchen', 'restaurant', 'budget', 'Amala, gbegiri and ewedu, the classic way', 2),
  ('ibadan', 'ring-road', 'Ring Road Groove Club', 'nightclub', 'mid', 'Weekend parties till sunrise', 3),
  ('ibadan', 'dugbe', 'Dugbe Market Walk', 'market', 'free', 'Fabrics, spices and street snacks', 4),
  ('ibadan', 'jericho', 'Jericho Garden Café', 'cafe', 'mid', 'Garden seating and fresh juices', 5),
  ('ibadan', 'challenge', 'Hilltower Rooftop', 'rooftop', 'premium', 'Seven hills at golden hour', 6),
  ('ibadan', 'oluyole', 'Oluyole Screen House', 'cinema', 'mid', 'Family films and late screenings', 7),
  ('ibadan', 'dugbe', 'Old Town Heritage Trail', 'historic_site', 'free', 'Walking route through old Ibadan', 8),
  ('ibadan', 'bodija', 'Bodija Bole Spot', 'street_food', 'budget', 'Roasted plantain and fish pepper sauce', 9),
  ('ibadan', 'jericho', 'Ancient City Art House', 'art_gallery', 'free', 'Adire, sculpture and painting', 10),
  ('port-harcourt', 'gra-phase-2', 'Riverlight Lounge', 'lounge', 'premium', 'Smooth sounds in GRA', 1),
  ('port-harcourt', 'old-gra', 'Bonny Breeze Rooftop', 'rooftop', 'premium', 'Breezy rooftop with seafood platters', 2),
  ('port-harcourt', 'd-line', 'Pepper Soup Junction', 'restaurant', 'budget', 'Catfish pepper soup and cold drinks', 3),
  ('port-harcourt', 'trans-amadi', 'Trans-Amadi Beat Club', 'nightclub', 'mid', 'The loudest Saturday in town', 4),
  ('port-harcourt', 'peter-odili-road', 'Creekside Fish Grill', 'street_food', 'budget', 'Bole and fish by the water', 5),
  ('port-harcourt', 'rumuola', 'Delta Reel Cinema', 'cinema', 'mid', 'Big screen, cold AC', 6),
  ('port-harcourt', 'peter-odili-road', 'Mangrove Walkway Park', 'nature', 'free', 'Boardwalk through the mangroves', 7),
  ('port-harcourt', 'd-line', 'Oil Lamp Bar', 'bar', 'mid', 'Cocktails and highlife', 8),
  ('port-harcourt', 'gra-phase-2', 'Tidewater Café', 'cafe', 'mid', 'Brunch, coffee and pastries', 9),
  ('port-harcourt', 'old-gra', 'Rivers Craft Gallery', 'art_gallery', 'free', 'Crafts and paintings from the Niger Delta', 10),
  ('aba', 'ogbor-hill', 'Ogbor Hill Lounge', 'lounge', 'mid', 'Relaxed evenings, good music', 1),
  ('aba', 'ariaria', 'Ariaria Trade Walk', 'market', 'free', 'Shoes, fabrics and made-in-Aba finds', 2),
  ('aba', 'aba-gra', 'Ukwa & Abacha Kitchen', 'restaurant', 'budget', 'Home-style Igbo dishes', 3),
  ('aba', 'asa-road', 'Asa Road Groove Club', 'nightclub', 'mid', 'Weekend dance floor', 4),
  ('aba', 'aba-gra', 'Made-in-Aba Gallery', 'art_gallery', 'free', 'Local design and craftsmanship', 5),
  ('aba', 'asa-road', 'Night Market Suya Hub', 'street_food', 'budget', 'Suya and roasted corn after dark', 6),
  ('aba', 'aba-gra', 'Cobbler''s Café', 'cafe', 'budget', 'Coffee and chops for shoppers', 7),
  ('aba', 'ogbor-hill', 'Aba Screen Palace', 'cinema', 'mid', 'Latest films, comfy seats', 8),
  ('aba', 'ariaria', 'Palm Grove Bar', 'bar', 'budget', 'Palmwine under the trees', 9),
  ('aba', 'ogbor-hill', 'Blue Stream Picnic Grounds', 'nature', 'budget', 'Shaded picnic spot by the stream', 10),
  ('owerri', 'new-owerri', 'Heartland Rooftop', 'rooftop', 'premium', 'Owerri nights from above', 1),
  ('owerri', 'wetheral-road', 'Wetheral Afterdark', 'nightclub', 'premium', 'Owerri''s late-night dance floor', 2),
  ('owerri', 'ikenegbu', 'Ofe Owerri Kitchen', 'restaurant', 'mid', 'Ofe Owerri and pounded yam', 3),
  ('owerri', 'world-bank', 'Nkwo Night Grill', 'street_food', 'budget', 'Grilled fish and nkwobi', 4),
  ('owerri', 'ikenegbu', 'Ikenegbu Social Lounge', 'lounge', 'mid', 'After-work drinks and live bands', 5),
  ('owerri', 'new-owerri', 'Lakeview Day Retreat', 'resort', 'premium', 'Pool, lake views and day passes', 6),
  ('owerri', 'new-owerri', 'Owerri Cine Lounge', 'cinema', 'mid', 'Films with a lounge bar', 7),
  ('owerri', 'ikenegbu', 'Uli Patterns Gallery', 'art_gallery', 'free', 'Uli-inspired contemporary art', 8),
  ('owerri', 'world-bank', 'World Bank Brew Spot', 'bar', 'budget', 'Cold drinks and pepper soup', 9),
  ('owerri', 'wetheral-road', 'Palm Leaf Café', 'cafe', 'mid', 'Quiet café for remote work', 10)
)
insert into public.vendors (
  slug, name, tagline, description_md, category_id, city_id, area_id, address_line, location,
  price_band, status, is_seed, claim_status, features
)
select
  lower(regexp_replace(regexp_replace(v.name, '[^A-Za-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || v.city_slug,
  v.name,
  v.tagline,
  'Sample listing for development. This venue is fictional.',
  cat.id,
  c.id,
  ar.id,
  ar.name || ', ' || c.name,
  -- deterministic offset (≈ 200–600 m) from the area centroid so pins don't stack
  extensions.st_setsrid(extensions.st_makepoint(
    extensions.st_x(ar.centroid::extensions.geometry) + ((v.n % 5) - 2) * 0.0018,
    extensions.st_y(ar.centroid::extensions.geometry) + ((v.n % 3) - 1) * 0.0018
  ), 4326)::extensions.geography,
  v.price_band::public.price_band,
  'draft',
  true,
  'unclaimed',
  '{}'
from v
join public.cities c on c.slug = v.city_slug
join public.areas ar on ar.city_id = c.id and ar.slug = v.area_slug
join public.categories cat on cat.slug = v.category_slug
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- toolkit guide drafts (§6.18)
with g(slug, title, excerpt) as (values
  ('visa-and-entry', 'Visa and entry requirements', 'Who needs a visa for Nigeria and how to apply.'),
  ('visa-on-arrival', 'Visa on arrival', 'How the visa-on-arrival process works, step by step.'),
  ('airport-arrival-lagos', 'Arriving at Lagos airport', 'Getting through arrivals at Murtala Muhammed International.'),
  ('airport-arrival-abuja', 'Arriving at Abuja airport', 'Getting through arrivals at Nnamdi Azikiwe International.'),
  ('sim-cards-and-data', 'SIM cards and mobile data', 'Getting connected: networks, registration and data bundles.'),
  ('money-cash-cards-pos', 'Money: cash, cards and POS', 'How to pay for things, and where cards do and don''t work.'),
  ('getting-around-bolt-uber', 'Getting around with Bolt and Uber', 'Ride-hailing tips for Nigerian cities.'),
  ('first-48-hours-lagos', 'Your first 48 hours in Lagos', 'A gentle plan for landing and settling in.'),
  ('first-48-hours-abuja', 'Your first 48 hours in Abuja', 'A gentle plan for landing and settling in.'),
  ('what-to-pack', 'What to pack', 'Clothes, chargers and the small things people forget.'),
  ('power-and-adapters', 'Power and adapters', 'Plug types, voltage and keeping your devices charged.'),
  ('tipping-and-etiquette', 'Tipping and etiquette', 'Greetings, tipping norms and dress codes.')
)
insert into public.guides (slug, type, title, excerpt, body_md, status)
select g.slug, 'toolkit', g.title, g.excerpt,
       '# ' || g.title || E'\n\n' || g.excerpt || E'\n\n_Draft — content to be written and fact-checked before publishing._',
       'draft'
  from g
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- safety info skeleton (§10)
-- National numbers from the PRD; last_verified_at stays NULL until someone verifies them.
insert into public.safety_info (city_id, section, title, body_md, sort_order)
select null, 'emergency_numbers', x.title, x.body, x.sort_order
  from (values
    ('National emergency number', 'Call **112** from any phone for police, fire and ambulance.', 10),
    ('Federal Road Safety Corps (FRSC)', 'Call **122** for road traffic incidents on highways.', 20)
  ) as x(title, body, sort_order)
 where not exists (
   select 1 from public.safety_info s where s.city_id is null and s.title = x.title
 );

insert into public.safety_info (city_id, section, title, body_md, sort_order)
select c.id, 'emergency_numbers', 'Lagos State Emergency Management Agency (LASEMA)',
       'Call **767** or **112** within Lagos State.', 30
  from public.cities c
 where c.slug = 'lagos'
   and not exists (
     select 1 from public.safety_info s
      where s.city_id = c.id and s.title = 'Lagos State Emergency Management Agency (LASEMA)'
   );

commit;
