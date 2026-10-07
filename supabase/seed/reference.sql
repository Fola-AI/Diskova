-- Reference data (PRD §1.4, §6.3, §6.18, §10). PROD-SAFE and idempotent: safe to re-run.
-- Categories, launch cities and areas, platform-setting defaults, toolkit guide drafts and the national
-- emergency numbers (unverified until someone checks them). NO vendors — real venues come from /content.
-- Area centroids are approximate: adjust them in Admin → Cities (map editor) if needed.
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
