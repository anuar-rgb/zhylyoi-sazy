-- Special visiting conditions of one event («вход только 18+», «вход в зал закрывается с началом»),
-- added to the institution's general visiting rules (Тексты сайта → Правила посещения). The public
-- offer (2.11, 5.3, 6.2) says such conditions are given on the event page. Optional, in both languages.
--
-- No grants change: anon's SELECT and authenticated's UPDATE on culture_events are table-wide, so
-- they cover the new columns; the policies are unchanged.

alter table public.culture_events add column if not exists visit_notes_kk text;
alter table public.culture_events add column if not exists visit_notes_ru text;

comment on column public.culture_events.visit_notes_kk is 'Special visiting conditions of this event (Kazakh), shown on its page beside the general rules.';
comment on column public.culture_events.visit_notes_ru is 'Special visiting conditions of this event (Russian), shown on its page beside the general rules.';
