-- Eenmalig uitvoeren in de SQL-editor van Supabase, na het deployen van de functie robaws-sync.
-- Vervang <PROJECT_REF> en <SERVICE_ROLE_KEY> door de waarden uit Project Settings > API.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'robaws-klanten-sync',
  '0 2 * * *', -- elke nacht om 02:00 UTC
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/robaws-sync',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
  );
  $$
);
