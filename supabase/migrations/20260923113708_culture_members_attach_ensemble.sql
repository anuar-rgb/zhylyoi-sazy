-- =====================================================================
-- culture_members — восемнадцать перенесённых артистов это состав ансамбля
--
-- Они были внесены до появления club_id, поэтому привязка проставляется
-- отдельно. Только тем, у кого её ещё нет: повторный запуск не перепишет то,
-- что администратор мог поправить руками.
-- =====================================================================

begin;

update public.culture_members m
set club_id = c.id,
    updated_at = now()
from public.culture_clubs c
where c.slug = 'zhylyoi-sazy'
  and c.organization_id = m.organization_id
  and m.club_id is null;

commit;
