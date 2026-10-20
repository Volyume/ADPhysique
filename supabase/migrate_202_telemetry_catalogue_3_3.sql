-- migrate_202_telemetry_catalogue_3_3.sql
--
-- Purpose:           Founder brief 2026-10-20 ("confirm telemetry coverage
--                    for new paths", approved "Go"). The server's event
--                    catalogue (migrate_200) learns the two event names
--                    first declared in the app after 3.2.0, and records the
--                    new fields on two existing events:
--                     - weight_basis_switched (new): raw or dry / cooked was
--                       switched for a day, a meal item, one food or the
--                       shopping list. Fields: where, basis. No food, no
--                       amount.
--                     - coaching_setup_card_snoozed (new): "Not now" on the
--                       "Set up coaching" card. Field: surface.
--                     - challenge_viewed (fields): now status,
--                       points_band_90 (the sum of the train, week,
--                       stronger, community and check-in parts, out of 90,
--                       in five bands) and parts_full (0 to 5: how many of
--                       those five are full). The app no longer sends tier,
--                       and never sends the total or the food and weigh-in
--                       parts: a withheld entrant (calm mode or an open ED
--                       flag) is credited food and weigh-in in full without
--                       logging (migrate_201), so all three lean upward for
--                       withheld people. The five parts used never read the
--                       gate, and both fields are sent for every entrant.
--                     - coaching_setup_card_shown (fields): adds mode (full
--                       or compact).
--                    The batch RPC rejects only unknown NAMES (migrate_200
--                    part 3); fields are documentation. The app drops the
--                    two new names until this is applied
--                    (TELEMETRY_202_EVENTS, src/lib/sync/featureFlags.js).
--
-- Applied locally:   no (cloud-only catalogue rows)
-- Applied remotely:  NO. Needs the founder's "run against production 202";
--                    then turn TELEMETRY_202_EVENTS on.
-- Safe to re-run:    yes (ON CONFLICT DO UPDATE; UPDATE by name).
-- Rollback:          DELETE FROM public.telemetry_event_catalogue WHERE name
--                    IN ('weight_basis_switched', 'coaching_setup_card_snoozed');
--                    re-run migrate_200's rows for challenge_viewed and
--                    coaching_setup_card_shown.
-- Depends on:        200 (telemetry_event_catalogue).

INSERT INTO public.telemetry_event_catalogue (name, area, signal, description, fields, pre_consent, added_in) VALUES
  ('weight_basis_switched', 'food', 'progression', 'The person switched a weight between raw or dry and cooked: the whole day, one meal item or one food, or the shopping list basis. No food or amount.', '{"where":{"type":"enum","values":["day","meal_item","food","shopping"]},"basis":{"type":"enum","values":["raw","cooked"]}}'::jsonb, false, '3.3'),
  ('coaching_setup_card_snoozed', 'onboarding', 'retention', 'A quick-start person tapped "Not now" on the "Set up coaching" card (it shows as a short row for 7 days).', '{"surface":{"type":"enum","values":["nutrition","meal_plan","targets","checkin","coach_output","coach_home","home","goal_setup","challenge","unknown"]}}'::jsonb, false, '3.3')
ON CONFLICT (name) DO UPDATE SET
  area = EXCLUDED.area, signal = EXCLUDED.signal, description = EXCLUDED.description,
  fields = EXCLUDED.fields, pre_consent = EXCLUDED.pre_consent, added_in = EXCLUDED.added_in;

UPDATE public.telemetry_event_catalogue
   SET description = 'An entrant opened their gym challenge: the band of their train, week, stronger, community and check-in points (out of 90) and how many of those five parts are full.',
       fields = '{"status":{"type":"enum","values":["upcoming","active","ended","closed"]},"points_band_90":{"type":"enum","values":["0-19","20-39","40-59","60-74","75-90"]},"parts_full":{"type":"int","min":0,"max":5}}'::jsonb
 WHERE name = 'challenge_viewed';

UPDATE public.telemetry_event_catalogue
   SET description = 'A "Set up coaching" card was shown to a quick-start person, full or as the short row (once a day per surface and form).',
       fields = '{"surface":{"type":"enum","values":["nutrition","meal_plan","targets","checkin","coach_output","coach_home","home","goal_setup","challenge","unknown"]},"mode":{"type":"enum","values":["full","compact"]}}'::jsonb
 WHERE name = 'coaching_setup_card_shown';
