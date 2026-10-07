-- DEV seed (PRD §13). Idempotent: safe to re-run. NEVER run against PROD.
-- = the PROD-safe reference data (reference.sql) + fictional sample vendors (is_seed = true, status = draft).
\ir reference.sql

begin;

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

commit;
