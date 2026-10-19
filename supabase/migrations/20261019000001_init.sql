-- Koelmiddellogboek AR Airco: basisschema
-- Logboekinhoud volgens VLAREM II art. 5.16.3.3 §8, lektestfrequentie volgens Verordening (EU) 2024/573 art. 5.

create extension if not exists pgcrypto;

-- ---------- Techniekers ----------
create table profielen (
  id uuid primary key references auth.users (id) on delete cascade,
  naam text not null,
  certificaat_nummer text,
  certificaat_categorie text,
  certificaat_geldig_tot date,
  actief boolean not null default true,
  aangemaakt_op timestamptz not null default now()
);

-- Elke nieuwe login krijgt automatisch een profiel; naam aanpassen in de app of het dashboard.
create function public.nieuw_profiel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profielen (id, naam) values (new.id, coalesce(new.raw_user_meta_data->>'naam', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger nieuw_profiel after insert on auth.users for each row execute function public.nieuw_profiel();

create function public.is_technieker() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profielen where id = auth.uid() and actief)
$$;

-- ---------- Referentie: koelmiddelen (GWP volgens Verordening (EU) 2024/573, bijlage I) ----------
create table koelmiddelen (
  code text primary key,
  gwp numeric not null check (gwp >= 0),
  veiligheidsklasse text not null
);
insert into koelmiddelen (code, gwp, veiligheidsklasse) values
  ('R32', 675, 'A2L'), ('R410A', 2088, 'A1'), ('R407C', 1774, 'A1'), ('R404A', 3922, 'A1'),
  ('R134a', 1430, 'A1'), ('R454B', 465, 'A2L'), ('R513A', 629, 'A1'), ('R452A', 2139, 'A1'),
  ('R448A', 1386, 'A1'), ('R449A', 1396, 'A1'), ('R1234yf', 0.5, 'A2L'), ('R290', 0.02, 'A3'), ('R744', 1, 'A1');

-- ---------- Klanten: alleen-lezen kopie uit Robaws ----------
create table klanten (
  robaws_id bigint primary key,
  naam text not null,
  straat text,
  postcode text,
  gemeente text,
  land text,
  email text,
  telefoon text,
  gsm text,
  robaws_status text,
  robaws_gewijzigd_op timestamptz,
  gesynchroniseerd_op timestamptz not null default now()
);
create index klanten_naam_idx on klanten using gin (to_tsvector('simple', naam || ' ' || coalesce(gemeente, '')));

-- ---------- Installaties ----------
create table installaties (
  id uuid primary key default gen_random_uuid(),
  klant_id bigint not null references klanten (robaws_id),
  type text not null,
  merk text not null,
  model text not null,
  serienummer text,
  locatie text,
  koelmiddel text not null references koelmiddelen (code),
  nominale_inhoud_kg numeric(8, 3) not null check (nominale_inhoud_kg >= 0),
  hermetisch boolean not null default false,
  lekdetectiesysteem boolean not null default false,
  ingebruikname date not null,
  status text not null default 'actief' check (status in ('actief', 'buiten dienst')),
  aangemaakt_door uuid not null default auth.uid() references profielen (id),
  aangemaakt_op timestamptz not null default now(),
  gewijzigd_door uuid references profielen (id),
  gewijzigd_op timestamptz
);
create index installaties_klant_idx on installaties (klant_id);

-- ---------- Flessen ----------
create table flessen (
  id uuid primary key default gen_random_uuid(),
  serienummer text not null unique,
  koelmiddel text not null references koelmiddelen (code),
  soort text not null check (soort in ('nieuw', 'recuperatie')),
  inhoud_bij_ontvangst_kg numeric(8, 3) not null default 0,
  capaciteit_kg numeric(8, 3),
  leverancier text,
  factuurnummer text,
  ontvangen_op date not null default current_date,
  status text not null default 'in voorraad' check (status in ('in voorraad', 'bij technieker', 'retour')),
  aangemaakt_door uuid not null default auth.uid() references profielen (id),
  aangemaakt_op timestamptz not null default now(),
  gewijzigd_door uuid references profielen (id),
  gewijzigd_op timestamptz
);

-- ---------- Interventies: het logboek zelf, alleen toevoegen ----------
create table interventies (
  id uuid primary key default gen_random_uuid(),
  installatie_id uuid not null references installaties (id),
  datum date not null,
  type text not null check (type in ('ingebruikname', 'onderhoud', 'lektest', 'herstelling', 'bijvulling', 'recuperatie', 'buitendienst')),
  technieker_id uuid not null default auth.uid() references profielen (id),
  kg_toegevoegd numeric(8, 3) not null default 0 check (kg_toegevoegd >= 0),
  fles_toegevoegd_id uuid references flessen (id),
  gerecycleerd boolean not null default false,
  kg_teruggewonnen numeric(8, 3) not null default 0 check (kg_teruggewonnen >= 0),
  fles_recuperatie_id uuid references flessen (id),
  lektest text check (lektest in ('dicht', 'lek')),
  lekplaats text,
  werkzaamheden text,
  handtekening_png text,
  corrigeert_id uuid references interventies (id),
  -- uniek id dat het toestel aanmaakt, zodat een offline wachtrij niets dubbel opslaat
  toestel_id uuid unique,
  aangemaakt_op timestamptz not null default now(),
  check (kg_toegevoegd = 0 or fles_toegevoegd_id is not null),
  check (kg_teruggewonnen = 0 or fles_recuperatie_id is not null)
);
create index interventies_installatie_idx on interventies (installatie_id, datum desc);

-- Technieker komt altijd van de login, nooit van het toestel.
create function public.zet_technieker() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then new.technieker_id := auth.uid(); end if;
  return new;
end $$;
create trigger zet_technieker before insert on interventies for each row execute function public.zet_technieker();

-- Buitendienststelling zet de installatie op 'buiten dienst'.
create function public.na_interventie() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'buitendienst' then
    update installaties set status = 'buiten dienst', gewijzigd_door = new.technieker_id, gewijzigd_op = now() where id = new.installatie_id;
  end if;
  return new;
end $$;
create trigger na_interventie after insert on interventies for each row execute function public.na_interventie();

create function public.zet_gewijzigd() returns trigger
language plpgsql as $$
begin
  new.gewijzigd_door := auth.uid();
  new.gewijzigd_op := now();
  return new;
end $$;
create trigger zet_gewijzigd before update on installaties for each row execute function public.zet_gewijzigd();
create trigger zet_gewijzigd before update on flessen for each row execute function public.zet_gewijzigd();

-- ---------- Audit: wie deed wat ----------
create table audit_log (
  id bigint generated always as identity primary key,
  tabel text not null,
  record_id uuid not null,
  actie text not null,
  door uuid,
  op timestamptz not null default now(),
  oud jsonb,
  nieuw jsonb
);
create function public.audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (tabel, record_id, actie, door, oud, nieuw)
  values (tg_table_name, coalesce(new.id, old.id), lower(tg_op), auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger audit after insert or update or delete on installaties for each row execute function public.audit();
create trigger audit after insert or update or delete on flessen for each row execute function public.audit();
create trigger audit after insert or update or delete on interventies for each row execute function public.audit();

-- ---------- Berekende overzichten ----------
create view installatie_overzicht with (security_invoker = true) as
with basis as (
  select i.*, k.gwp, kl.naam as klant_naam, kl.straat as klant_straat, kl.postcode as klant_postcode, kl.gemeente as klant_gemeente,
    round(i.nominale_inhoud_kg * k.gwp / 1000, 2) as ton_co2_eq,
    (select max(v.datum) from interventies v where v.installatie_id = i.id and v.lektest is not null) as laatste_lektest,
    (select coalesce(sum(v.kg_toegevoegd), 0) from interventies v
      where v.installatie_id = i.id and v.type <> 'ingebruikname'
        and date_part('year', v.datum) = date_part('year', current_date)) as kg_bijgevuld_dit_jaar
  from installaties i join koelmiddelen k on k.code = i.koelmiddel join klanten kl on kl.robaws_id = i.klant_id
), met_interval as (
  select b.*,
    case
      when b.ton_co2_eq < case when b.hermetisch then 10 else 5 end then null
      when b.ton_co2_eq >= 500 then case when b.lekdetectiesysteem then 6 else 3 end
      when b.ton_co2_eq >= 50 then case when b.lekdetectiesysteem then 12 else 6 end
      else case when b.lekdetectiesysteem then 24 else 12 end
    end as lektest_interval_maanden
  from basis b
)
select m.*,
  m.lektest_interval_maanden is not null as logboekplichtig,
  case when m.lektest_interval_maanden is not null and m.status = 'actief'
    then (coalesce(m.laatste_lektest, m.ingebruikname) + make_interval(months => m.lektest_interval_maanden))::date end as volgende_lektest,
  case when m.nominale_inhoud_kg > 0 then round(m.kg_bijgevuld_dit_jaar / m.nominale_inhoud_kg * 100, 1) else 0 end as lekverlies_pct_dit_jaar
from met_interval m;

create view fles_saldo with (security_invoker = true) as
select f.*,
  f.inhoud_bij_ontvangst_kg
    - coalesce((select sum(v.kg_toegevoegd) from interventies v where v.fles_toegevoegd_id = f.id), 0)
    + coalesce((select sum(v.kg_teruggewonnen) from interventies v where v.fles_recuperatie_id = f.id), 0) as saldo_kg
from flessen f;

-- ---------- Rechten: alle actieve techniekers mogen alles lezen en toevoegen; niets wissen ----------
alter table profielen enable row level security;
alter table koelmiddelen enable row level security;
alter table klanten enable row level security;
alter table installaties enable row level security;
alter table flessen enable row level security;
alter table interventies enable row level security;
alter table audit_log enable row level security;

create policy lezen on profielen for select to authenticated using (is_technieker());
create policy eigen_profiel on profielen for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy lezen on koelmiddelen for select to authenticated using (is_technieker());
create policy lezen on klanten for select to authenticated using (is_technieker());
create policy lezen on installaties for select to authenticated using (is_technieker());
create policy toevoegen on installaties for insert to authenticated with check (is_technieker());
create policy wijzigen on installaties for update to authenticated using (is_technieker()) with check (is_technieker());
create policy lezen on flessen for select to authenticated using (is_technieker());
create policy toevoegen on flessen for insert to authenticated with check (is_technieker());
create policy wijzigen on flessen for update to authenticated using (is_technieker()) with check (is_technieker());
create policy lezen on interventies for select to authenticated using (is_technieker());
create policy toevoegen on interventies for insert to authenticated with check (is_technieker());
create policy lezen on audit_log for select to authenticated using (is_technieker());
-- Klanten worden enkel geschreven door de Robaws-sync (service role, omzeilt RLS).
