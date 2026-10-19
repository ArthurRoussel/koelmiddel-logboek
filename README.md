# Koelmiddellogboek AR Airco

Webapp (PWA) voor de koelmiddelboekhouding van AR Airco: per installatie een F-gassenlogboek, lektestplanning, flessenvoorraad en jaaroverzicht. Klanten komen uit Robaws.

- Logboekinhoud volgens VLAREM II art. 5.16.3.3 §8, lektestfrequentie volgens Verordening (EU) 2024/573 art. 5, GWP-waarden uit bijlage I van die verordening.
- Alle techniekers hebben dezelfde rechten. Bij elke interventie en elke wijziging wordt bijgehouden wie het deed (`technieker_id` en tabel `audit_log`). Interventies kunnen niet gewijzigd of gewist worden.
- Werkt zonder bereik: laatst geladen gegevens blijven beschikbaar en interventies wachten op het toestel tot er netwerk is.

## Onderdelen

| Map | Inhoud |
| --- | --- |
| `app/` | Schermen (Next.js, statische export) |
| `lib/fgas.ts` | Regels uit de F-gassenwetgeving, met tests in `lib/fgas.test.ts` |
| `lib/offline.ts` | Cache en wachtrij voor werken zonder bereik |
| `supabase/migrations/` | Databaseschema, rechten, audit en berekende overzichten |
| `supabase/functions/robaws-sync/` | Haalt de klantenlijst uit Robaws |
| `supabase/cron.sql` | Nachtelijke sync van de klanten |

## Eenmalig opzetten

1. **Supabase-project** (regio Frankfurt). Voer in de SQL-editor `supabase/migrations/20261019000001_init.sql` uit.
2. **Robaws-sleutel**: maak in Robaws een API-gebruiker en sleutel aan (access key en secret). Zet ze in Supabase:
   ```
   supabase secrets set ROBAWS_ACCESS_KEY=... ROBAWS_SECRET=...
   supabase functions deploy robaws-sync
   ```
   Voer daarna `supabase/cron.sql` uit (met je project-ref en service role key) voor de nachtelijke sync, en klik één keer op **Klanten verversen** in de app.
3. **Techniekers**: maak in Supabase onder Authentication > Users per technieker een gebruiker met e-mail en wachtwoord. Vul in de tabel `profielen` de naam en het certificaatnummer in.
4. **Hosting op Vercel**: importeer de repository en zet `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` (zie `.env.example`).
5. Op de gsm: open de site en kies **Zet op beginscherm**.

## Ontwikkelen

```
npm install
cp .env.example .env.local   # waarden invullen
npm run dev
npm test                     # regels F-gassen
npm run build                # statische export in out/
```
