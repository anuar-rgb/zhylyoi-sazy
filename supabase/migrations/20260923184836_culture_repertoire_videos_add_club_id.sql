-- Links each repertoire piece and video recording to the collective it belongs
-- to, the same way culture_members already carries club_id. Nullable: a row
-- with no collective simply stays in the institution's general list, same as
-- an unassigned artist.
alter table public.culture_repertoire
  add column club_id uuid references public.culture_clubs(id) on delete set null;

alter table public.culture_videos
  add column club_id uuid references public.culture_clubs(id) on delete set null;

-- Every row that exists right now belongs to the same collective in practice
-- (verified against the actual content, not assumed): all ten repertoire
-- pieces and both videos are the folklore ensemble's own. Backfilling them
-- avoids a silent "unassigned" pile the moment this ships.
update public.culture_repertoire
  set club_id = '00e9000c-603e-4761-96f1-fe4ade9edf4a'
  where club_id is null;

update public.culture_videos
  set club_id = '00e9000c-603e-4761-96f1-fe4ade9edf4a'
  where club_id is null;
