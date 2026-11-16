import { Component, output, signal, inject } from '@angular/core';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../shared/services/toast.service';

const SQL_MIGRATION_SCHEMA = `-- 1. Boards Table
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  facilitator_id uuid references auth.users(id) on delete cascade not null,
  is_blurred boolean default false,
  timer_ends_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Columns Table
create table public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.boards(id) on delete cascade not null,
  title text not null,
  position int not null default 0,
  color_hex text default '#6366f1',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Cards Table
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid references public.columns(id) on delete cascade not null,
  board_id uuid references public.boards(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  position int not null default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Votes Table
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  board_id uuid references public.boards(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique(card_id, user_id)
);

-- Realtime & RLS
alter publication supabase_realtime add table public.boards;
alter publication supabase_realtime add table public.columns;
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.votes;

-- Least-privilege RLS (same as supabase/migrations/20261116000000_secure_rls_policies.sql)
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

commit;`;

@Component({
  selector: 'app-settings-modal',
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      (click)="close.emit()">

      <div
        class="w-full max-w-xl glass-panel rounded-2xl shadow-2xl border border-slate-700/80 p-6 flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
            <h2 class="text-base font-bold text-white tracking-tight">Supabase & Cloud Realtime Connection</h2>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close settings modal">
            &times;
          </button>
        </div>

        <!-- Current Status Pill -->
        <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="flex items-center gap-3">
            <span
              class="w-3 h-3 rounded-full"
              [class.bg-emerald-400]="supabaseService.isConfigured()"
              [class.bg-amber-400]="!supabaseService.isConfigured()">
            </span>
            <div>
              <p class="text-xs font-semibold text-white">
                {{ supabaseService.isConfigured() ? 'Connected to Live Supabase' : 'Offline / Demo Simulation Mode' }}
              </p>
              <p class="text-[11px] text-slate-400">
                {{ supabaseService.isConfigured() ? 'Syncing cards, presence, and votes via WebSocket.' : 'Collaborators & cursors simulated locally with full fidelity.' }}
              </p>
            </div>
          </div>

          @if (supabaseService.isConfigured()) {
            <button
              type="button"
              (click)="disconnectSupabase()"
              class="px-2.5 py-1 text-xs rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 transition">
              Disconnect
            </button>
          }
        </div>

        <!-- Connection Inputs -->
        <div class="space-y-3">
          <div>
            <label for="supabase-url" class="block text-xs font-semibold text-slate-300 mb-1">
              Project URL
            </label>
            <input
              id="supabase-url"
              type="text"
              #urlInput
              [value]="url()"
              (input)="url.set(urlInput.value)"
              placeholder="https://your-project.supabase.co"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
          </div>

          <div>
            <label for="supabase-key" class="block text-xs font-semibold text-slate-300 mb-1">
              Anon / Public API Key
            </label>
            <input
              id="supabase-key"
              type="password"
              #keyInput
              [value]="key()"
              (input)="key.set(keyInput.value)"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
          </div>
        </div>

        <!-- Schema Helper Accordion -->
        <div class="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-300">Database Schema (SQL Migration)</span>
            <button
              type="button"
              (click)="copySchema()"
              class="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium">
              Copy SQL Script
            </button>
          </div>
          <p class="text-[11px] text-slate-400">
            Paste this script in the Supabase SQL Editor to instantly provision boards, columns, cards, and votes with real-time replication.
          </p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            Close
          </button>
          <button
            type="button"
            (click)="saveConfiguration()"
            class="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition">
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  `
})
export class SettingsModalComponent {
  public close = output<void>();

  public supabaseService = inject(SupabaseService);
  private toastService = inject(ToastService);

  public url = signal<string>(localStorage.getItem('RETROSYNC_SUPABASE_URL') || '');
  public key = signal<string>(localStorage.getItem('RETROSYNC_SUPABASE_KEY') || '');

  public copySchema(): void {
    navigator.clipboard.writeText(SQL_MIGRATION_SCHEMA);
    this.toastService.show('Supabase SQL schema copied to clipboard!', 'success');
  }

  public saveConfiguration(): void {
    const success = this.supabaseService.updateConfig(this.url().trim(), this.key().trim());
    if (success) {
      this.toastService.show('Supabase credentials saved! Connecting...', 'success');
      this.close.emit();
      window.location.reload();
    } else {
      this.toastService.show('Invalid Supabase URL or Key.', 'error');
    }
  }

  public disconnectSupabase(): void {
    localStorage.removeItem('RETROSYNC_SUPABASE_URL');
    localStorage.removeItem('RETROSYNC_SUPABASE_KEY');
    this.toastService.show('Disconnected. Switched to offline demo mode.', 'info');
    window.location.reload();
  }
}

