-- RetroSync: let a signed-in user permanently delete their own account.
-- Clients cannot call the Auth admin API, so this runs as SECURITY DEFINER and only
-- ever acts on auth.uid(). Safe to re-run. Paste into the Supabase SQL Editor.
--
-- Removes: the user's votes and cards, every board they facilitate (with its
-- columns, cards and votes), then the auth user itself.

begin;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid text := (select auth.uid())::text;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Data on boards this user facilitates
  delete from public.votes   where board_id::text in (select id::text from public.boards where facilitator_id::text = uid);
  delete from public.cards   where board_id::text in (select id::text from public.boards where facilitator_id::text = uid);
  delete from public.columns where board_id::text in (select id::text from public.boards where facilitator_id::text = uid);
  delete from public.boards  where facilitator_id::text = uid;

  -- The user's contributions to other people's boards
  delete from public.votes where user_id::text = uid;
  delete from public.votes where card_id::text in (select id::text from public.cards where author_id::text = uid);
  delete from public.cards where author_id::text = uid;

  delete from auth.users where id::text = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

commit;
