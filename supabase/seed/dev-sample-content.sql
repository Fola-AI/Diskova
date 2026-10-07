-- DEV ONLY. Publishes the fictional seed vendors with sample hours, prices and features so the
-- directory can be developed and QA'd. Idempotent. NEVER run against PROD (LAUNCH.md).
-- opening_hours format: {"mon":[["18:00","02:00"]], ...}; an end time earlier than the start means
-- the interval runs past midnight into the next day.
begin;

with hours(category, h) as (values
  ('nightclub', '{"thu":[["22:00","04:00"]],"fri":[["22:00","05:00"]],"sat":[["22:00","05:00"]],"sun":[["21:00","03:00"]]}'),
  ('lounge', '{"mon":[["16:00","01:00"]],"tue":[["16:00","01:00"]],"wed":[["16:00","01:00"]],"thu":[["16:00","01:00"]],"fri":[["16:00","02:00"]],"sat":[["14:00","02:00"]],"sun":[["14:00","00:00"]]}'),
  ('bar', '{"mon":[["12:00","00:00"]],"tue":[["12:00","00:00"]],"wed":[["12:00","00:00"]],"thu":[["12:00","00:00"]],"fri":[["12:00","01:00"]],"sat":[["12:00","01:00"]],"sun":[["13:00","23:00"]]}'),
  ('rooftop', '{"mon":[["17:00","00:00"]],"tue":[["17:00","00:00"]],"wed":[["17:00","00:00"]],"thu":[["17:00","01:00"]],"fri":[["17:00","02:00"]],"sat":[["15:00","02:00"]],"sun":[["15:00","00:00"]]}'),
  ('restaurant', '{"mon":[["11:00","22:00"]],"tue":[["11:00","22:00"]],"wed":[["11:00","22:00"]],"thu":[["11:00","22:00"]],"fri":[["11:00","23:00"]],"sat":[["11:00","23:00"]],"sun":[["12:00","21:00"]]}'),
  ('cafe', '{"mon":[["07:30","19:00"]],"tue":[["07:30","19:00"]],"wed":[["07:30","19:00"]],"thu":[["07:30","19:00"]],"fri":[["07:30","19:00"]],"sat":[["08:00","19:00"]],"sun":[["09:00","17:00"]]}'),
  ('street_food', '{"mon":[["17:00","23:30"]],"tue":[["17:00","23:30"]],"wed":[["17:00","23:30"]],"thu":[["17:00","23:30"]],"fri":[["17:00","01:00"]],"sat":[["17:00","01:00"]],"sun":[["17:00","23:00"]]}'),
  ('beach', '{"mon":[["09:00","18:00"]],"tue":[["09:00","18:00"]],"wed":[["09:00","18:00"]],"thu":[["09:00","18:00"]],"fri":[["09:00","18:00"]],"sat":[["08:00","19:00"]],"sun":[["08:00","19:00"]]}'),
  ('resort', '{"mon":[["08:00","20:00"]],"tue":[["08:00","20:00"]],"wed":[["08:00","20:00"]],"thu":[["08:00","20:00"]],"fri":[["08:00","20:00"]],"sat":[["08:00","20:00"]],"sun":[["08:00","20:00"]]}'),
  ('cinema', '{"mon":[["10:00","23:30"]],"tue":[["10:00","23:30"]],"wed":[["10:00","23:30"]],"thu":[["10:00","23:30"]],"fri":[["10:00","01:00"]],"sat":[["10:00","01:00"]],"sun":[["11:00","23:00"]]}'),
  ('art_gallery', '{"tue":[["10:00","18:00"]],"wed":[["10:00","18:00"]],"thu":[["10:00","18:00"]],"fri":[["10:00","18:00"]],"sat":[["11:00","17:00"]]}'),
  ('market', '{"mon":[["07:00","18:00"]],"tue":[["07:00","18:00"]],"wed":[["07:00","18:00"]],"thu":[["07:00","18:00"]],"fri":[["07:00","18:00"]],"sat":[["07:00","18:00"]]}'),
  ('nature', '{"mon":[["06:00","18:00"]],"tue":[["06:00","18:00"]],"wed":[["06:00","18:00"]],"thu":[["06:00","18:00"]],"fri":[["06:00","18:00"]],"sat":[["06:00","18:00"]],"sun":[["06:00","18:00"]]}'),
  ('historic_site', '{"mon":[["09:00","17:00"]],"tue":[["09:00","17:00"]],"wed":[["09:00","17:00"]],"thu":[["09:00","17:00"]],"fri":[["09:00","17:00"]],"sat":[["09:00","17:00"]],"sun":[["10:00","16:00"]]}')
),
extras(category, features, dress_code, age_policy, parking, late_note) as (values
  ('nightclub', array['dj','late_night','vip_area','card_payments','air_conditioned'], 'Smart casual. No slippers or shorts.', '18+ with ID', 'Valet parking available', 'Busy taxi rank outside after 2am; book your ride before leaving.'),
  ('lounge', array['dj','outdoor_seating','food_served','card_payments','reservations'], 'Smart casual', '18+ after 9pm', 'Street parking', null),
  ('bar', array['live_music','food_served','card_payments'], null, '18+', 'Limited parking', null),
  ('rooftop', array['rooftop','dj','food_served','card_payments','reservations'], 'Smart casual. No sportswear.', '21+ after 8pm', 'Car park in the building', null),
  ('restaurant', array['food_served','family_friendly','air_conditioned','card_payments','reservations','parking'], null, null, 'On-site parking', null),
  ('cafe', array['wifi','family_friendly','air_conditioned','card_payments'], null, null, null, null),
  ('street_food', array['late_night','outdoor_seating'], null, null, null, 'Cash and transfer preferred.'),
  ('beach', array['sea_view','outdoor_seating','food_served','family_friendly','parking'], null, null, 'Paid parking at the entrance', null),
  ('resort', array['sea_view','food_served','family_friendly','parking','reservations'], null, null, 'Free parking', null),
  ('cinema', array['air_conditioned','food_served','family_friendly','card_payments','wheelchair_access'], null, 'Age ratings apply', 'Mall parking', null),
  ('art_gallery', array['air_conditioned','wheelchair_access','family_friendly'], null, null, null, null),
  ('market', array['family_friendly'], null, null, 'Busy — use ride-hailing', null),
  ('nature', array['outdoor_seating','family_friendly'], null, null, 'Free parking', null),
  ('historic_site', array['family_friendly'], null, null, null, null)
)
update public.vendors v
   set status = 'published',
       opening_hours = h.h::jsonb,
       features = e.features,
       dress_code = e.dress_code,
       age_policy = e.age_policy,
       parking_note = e.parking,
       late_night_area_note = e.late_note,
       whatsapp = coalesce(v.whatsapp, '+234 800 000 ' || lpad((abs(hashtext(v.slug)) % 10000)::text, 4, '0')),
       website_url = coalesce(v.website_url, 'https://example.com/' || v.slug),
       description_md = 'Sample listing for development. This venue is fictional.' || E'\n\n'
         || 'Expect ' || lower(coalesce(v.tagline, 'a good time')) || '.'
  from public.categories c, hours h, extras e
 where v.is_seed and v.category_id = c.id and h.category = c.slug and e.category = c.slug;

-- Sample prices (replaced each run)
delete from public.vendor_prices p using public.vendors v where p.vendor_id = v.id and v.is_seed;
with price(category, label, amount, note) as (values
  ('nightclub', 'Entry (Fri & Sat)', 10000, 'Free before midnight on Thursdays'),
  ('nightclub', 'Bottles from', 150000, null),
  ('lounge', 'Cocktails from', 6000, null),
  ('lounge', 'Small chops platter', 12000, null),
  ('bar', 'Beer from', 1500, null),
  ('bar', 'Peppered snail', 4500, null),
  ('rooftop', 'Cocktails from', 9000, null),
  ('rooftop', 'Minimum spend (table)', 100000, 'Weekends only'),
  ('restaurant', 'Mains from', 7500, null),
  ('restaurant', 'Jollof & chicken', 9000, null),
  ('cafe', 'Coffee from', 2500, null),
  ('street_food', 'Suya (portion)', 2000, null),
  ('beach', 'Day entry', 5000, null),
  ('resort', 'Day pass', 35000, 'Includes pool access'),
  ('cinema', 'Ticket', 4500, '2D standard'),
  ('art_gallery', 'Entry', 0, 'Free'),
  ('nature', 'Entry', 0, 'Free'),
  ('historic_site', 'Guided walk', 3000, null)
)
insert into public.vendor_prices (vendor_id, label, amount_ngn, note)
select v.id, p.label, p.amount, p.note
  from public.vendors v
  join public.categories c on c.id = v.category_id
  join price p on p.category = c.slug
 where v.is_seed;

-- A published sample city guide (DEV only) so guide pages can be QA'd and Lighthouse-tested.
insert into public.guides (type, slug, title, excerpt, body_md, city_id, status, published_at, tags, seo_description)
select 'city_guide', 'sample-lagos-first-weekend', 'Sample guide: a first weekend in Lagos',
       'A fictional sample guide used on DEV for layout and performance checks.',
       E'This is **sample content** for development. Venues below are fictional seed listings.\n\n## Friday: ease in\n\nStart on the Island with sundowners, then move somewhere with a DJ.\n\n<VendorCard slug="copper-lantern-rooftop-lagos" />\n\n<Callout type="tip">Traffic peaks between 5pm and 9pm. Leave early or stay put.</Callout>\n\n## Saturday: eat, then dance\n\n- Late lunch somewhere relaxed\n- A nap (seriously)\n- Out after 11pm\n\n<VendorCard slug="afrobeat-junction-lagos" />\n\n## Sunday: slow down\n\nCoffee, a walk, and an early night.\n\n<VendorCard slug="brass-hour-caf-lagos" />\n',
       (select id from public.cities where slug = 'lagos'), 'published', now(), array['weekend', 'nightlife'],
       'Fictional DEV sample guide.'
 where not exists (select 1 from public.guides where slug = 'sample-lagos-first-weekend');

commit;
