-- RetroSync: replace the open "using (true)" RLS policies with least-privilege ones.
-- Safe to re-run. Paste into the Supabase SQL Editor (or run with `supabase db push`).
--
-- Access model:
--   * Anonymous (not signed in) users get NO table access.
--   * Signed-in users can view boards and join any board by link (collaborative retro).
--   * Only the facilitator can update/delete a board and manage its columns.
--   * Cards: anyone signed in can add (as themselves) and move cards; only the author
--     or facilitator can edit content or delete.
--   * Votes: users can only cast/remove their own votes.

begin;

-- 1. Make sure RLS is on everywhere
alter table public.boards  enable row level security;
alter table public.columns enable row level security;
alter table public.cards   enable row level security;
alter table public.votes   enable row level security;

-- 2. Defense in depth: the anon role gets no table privileges at all
revoke all on public.boards, public.columns, public.cards, public.votes from anon;

-- 3. Remove the old wide-open policies
drop policy if exists "Allow all authenticated users full access" on public.boards;
drop policy if exists "Allow all authenticated users full access" on public.columns;
drop policy if exists "Allow all authenticated users full access" on public.cards;
drop policy if exists "Allow all authenticated users full access" on public.votes;

-- 4. Helper: is the current user the facilitator of this board?
--    (ids are compared as text so this works whether the columns are uuid or text)
create or replace function public.is_board_facilitator(p_board_id text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards b
    where b.id::text = p_board_id
      and b.facilitator_id::text = (select auth.uid())::text
  );
$$;

revoke execute on function public.is_board_facilitator(text) from public, anon;
grant execute on function public.is_board_facilitator(text) to authenticated;

-- 5. Boards
drop policy if exists "boards_select_authenticated" on public.boards;
drop policy if exists "boards_insert_own"           on public.boards;
drop policy if exists "boards_update_facilitator"   on public.boards;
drop policy if exists "boards_delete_facilitator"   on public.boards;

create policy "boards_select_authenticated" on public.boards
  for select to authenticated
  using (true);

create policy "boards_insert_own" on public.boards
  for insert to authenticated
  with check (facilitator_id::text = (select auth.uid())::text);

create policy "boards_update_facilitator" on public.boards
  for update to authenticated
  using (facilitator_id::text = (select auth.uid())::text)
  with check (facilitator_id::text = (select auth.uid())::text);

create policy "boards_delete_facilitator" on public.boards
  for delete to authenticated
  using (facilitator_id::text = (select auth.uid())::text);

-- 6. Columns (managed by the facilitator only)
drop policy if exists "columns_select_authenticated" on public.columns;
drop policy if exists "columns_insert_facilitator"   on public.columns;
drop policy if exists "columns_update_facilitator"   on public.columns;
drop policy if exists "columns_delete_facilitator"   on public.columns;

create policy "columns_select_authenticated" on public.columns
  for select to authenticated
  using (true);

create policy "columns_insert_facilitator" on public.columns
  for insert to authenticated
  with check (public.is_board_facilitator(board_id::text));

create policy "columns_update_facilitator" on public.columns
  for update to authenticated
  using (public.is_board_facilitator(board_id::text))
  with check (public.is_board_facilitator(board_id::text));

create policy "columns_delete_facilitator" on public.columns
  for delete to authenticated
  using (public.is_board_facilitator(board_id::text));

-- 7. Cards
drop policy if exists "cards_select_authenticated"        on public.cards;
drop policy if exists "cards_insert_own"                  on public.cards;
drop policy if exists "cards_update_participants"         on public.cards;
drop policy if exists "cards_delete_author_or_facilitator" on public.cards;

create policy "cards_select_authenticated" on public.cards
  for select to authenticated
  using (true);

create policy "cards_insert_own" on public.cards
  for insert to authenticated
  with check (
    author_id::text = (select auth.uid())::text
    and exists (
      select 1 from public.columns c
      where c.id = column_id and c.board_id = cards.board_id
    )
  );

-- Anyone signed in may move cards (drag & drop); the trigger below restricts
-- content edits to the author/facilitator and blocks ownership changes.
create policy "cards_update_participants" on public.cards
  for update to authenticated
  using (true)
  with check (true);

create policy "cards_delete_author_or_facilitator" on public.cards
  for delete to authenticated
  using (
    author_id::text = (select auth.uid())::text
    or public.is_board_facilitator(board_id::text)
  );

create or replace function public.guard_card_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Only enforce for end-user requests (dashboard / service role edits pass through)
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.author_id is distinct from old.author_id
     or new.board_id is distinct from old.board_id then
    raise exception 'Card author and board cannot be changed'
      using errcode = '42501';
  end if;

  if new.content is distinct from old.content
     and old.author_id::text is distinct from (select auth.uid())::text
     and not public.is_board_facilitator(old.board_id::text) then
    raise exception 'Only the card author or board facilitator can edit card content'
      using errcode = '42501';
  end if;

  if new.column_id is distinct from old.column_id
     and not exists (
       select 1 from public.columns c
       where c.id = new.column_id and c.board_id = new.board_id
     ) then
    raise exception 'Cards can only be moved to a column on the same board'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_card_update on public.cards;
create trigger guard_card_update
  before update on public.cards
  for each row execute function public.guard_card_update();

-- 8. Votes (own votes only)
drop policy if exists "votes_select_authenticated" on public.votes;
drop policy if exists "votes_insert_own"           on public.votes;
drop policy if exists "votes_delete_own"           on public.votes;

create policy "votes_select_authenticated" on public.votes
  for select to authenticated
  using (true);

create policy "votes_insert_own" on public.votes
  for insert to authenticated
  with check (
    user_id::text = (select auth.uid())::text
    and exists (
      select 1 from public.cards c
      where c.id = card_id and c.board_id = votes.board_id
    )
  );

create policy "votes_delete_own" on public.votes
  for delete to authenticated
  using (user_id::text = (select auth.uid())::text);

commit;
