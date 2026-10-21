-- Triggerfuncties hoeven niet via de API aanroepbaar te zijn; is_technieker enkel voor ingelogde gebruikers (RLS).
alter function public.zet_gewijzigd() set search_path = public;
alter function public.zet_technieker() set search_path = public;
revoke execute on function public.audit(), public.na_interventie(), public.nieuw_profiel(), public.zet_gewijzigd(), public.zet_technieker() from public, anon, authenticated;
revoke execute on function public.is_technieker() from public, anon;
grant execute on function public.is_technieker() to authenticated;
