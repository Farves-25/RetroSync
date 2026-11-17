import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BoardStateService, BoardListItem, RetroTemplate } from '../../core/services/board-state.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';

interface TemplateOption { id: RetroTemplate; name: string; hint: string; icon: string; from: string; to: string; cols: string[]; }

@Component({
  selector: 'app-board-list',
  imports: [ConfirmModalComponent],
  template: `
    <div class="h-screen w-screen canvas-grid flex overflow-hidden">
      <!-- Sidebar -->
      <aside class="hidden lg:flex w-64 xl:w-72 flex-shrink-0 flex-col justify-between p-5 m-4 mr-0 rounded-3xl glass border border-line shadow-[0_10px_40px_-16px_rgba(21,23,46,.18)]" aria-label="Sidebar">
        <div>
          <div class="flex items-center gap-3 px-1 mb-8">
            <span class="logo-mark !w-11 !h-11" aria-hidden="true">R</span>
            <span class="font-display text-2xl font-extrabold tracking-tight">Retro<span class="gradient-text">Sync</span></span>
          </div>

          <button type="button" (click)="openCreate()" class="btn btn-primary w-full !py-3.5 !text-sm mb-6">
            <span aria-hidden="true" class="text-base leading-none">＋</span> New board
          </button>

          <nav aria-label="Main">
            <p class="label px-2">Workspace</p>
            <ul class="flex flex-col gap-1 text-sm font-semibold">
              <li><span class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet/10 text-violet" aria-current="page"><span aria-hidden="true">🗂️</span> All boards <span class="ml-auto pill !py-0 !px-2 !text-[11px]">{{ boards().length }}</span></span></li>
              <li><a href="javascript:void(0)" (click)="scrollTo('templates')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-white hover:text-ink transition"><span aria-hidden="true">✨</span> Templates</a></li>
              <li><a href="javascript:void(0)" (click)="scrollTo('boards')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-white hover:text-ink transition"><span aria-hidden="true">🕘</span> Recent</a></li>
            </ul>
          </nav>

          <div class="mt-8 rounded-2xl p-4 text-white relative overflow-hidden" style="background: linear-gradient(135deg,#5a52f0,#a64df0 60%,#f2457d)">
            <p class="font-display font-extrabold text-base leading-tight">Pro tip</p>
            <p class="text-xs mt-1.5 text-white/85 leading-relaxed">Turn on stealth mode so everyone writes cards without being influenced, then reveal together.</p>
            <span class="absolute -right-4 -bottom-5 text-6xl opacity-25" aria-hidden="true">🙈</span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3 p-3 rounded-2xl bg-white border border-line">
            <span class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" [style.background-color]="authService.currentUser()?.color || '#5a52f0'" aria-hidden="true">{{ initial() }}</span>
            <div class="min-w-0">
              <p class="text-sm font-bold truncate">{{ authService.currentUser()?.name }}</p>
              <p class="text-[11px] text-muted truncate">{{ authService.currentUser()?.role || 'Team member' }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" (click)="authService.signOut()" class="btn btn-sm">Sign out</button>
            <button type="button" (click)="confirmingAccountDelete.set(true)" class="btn btn-sm btn-danger">Delete</button>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 min-w-0 overflow-y-auto p-5 md:p-8 xl:p-10">
        <!-- Mobile top bar -->
        <div class="lg:hidden flex items-center justify-between mb-6">
          <div class="flex items-center gap-2.5">
            <span class="logo-mark" aria-hidden="true">R</span>
            <span class="font-display text-xl font-extrabold">Retro<span class="gradient-text">Sync</span></span>
          </div>
          <div class="flex gap-2">
            <button type="button" (click)="authService.signOut()" class="btn btn-sm">Sign out</button>
            <button type="button" (click)="confirmingAccountDelete.set(true)" class="btn btn-sm btn-danger">Delete</button>
          </div>
        </div>

        <main class="w-full max-w-[1400px] mx-auto flex flex-col gap-8">
          <!-- Hero -->
          <section class="relative overflow-hidden rounded-[28px] p-7 md:p-10 text-white animate-fade-in"
            style="background: radial-gradient(600px 300px at 90% 0%, rgba(242,69,125,.65), transparent 60%), radial-gradient(500px 300px at 0% 100%, rgba(56,189,248,.45), transparent 60%), linear-gradient(135deg,#4a41e0,#7a46ee 55%,#a64df0); box-shadow: 0 30px 60px -28px rgba(90,82,240,.7)">
            <div class="relative z-10 max-w-xl">
              <span class="pill !bg-white/15 !border-white/25 !text-white mb-4">{{ today }}</span>
              <h1 class="font-display text-3xl md:text-5xl font-extrabold leading-[1.05]">{{ greeting }}, {{ firstName() }} 👋</h1>
              <p class="mt-3 md:text-lg text-white/85 leading-relaxed">Ready to learn from the last sprint? Start a fresh retrospective or jump back into one with your team.</p>
              <div class="mt-6 flex flex-wrap gap-3">
                <button type="button" (click)="openCreate()" class="btn !bg-white !text-violet !border-transparent !py-3 !px-5 !text-sm">＋ Start a retro</button>
                @if (latest(); as l) {
                  <button type="button" (click)="navigateToBoard(l.id)" class="btn !bg-white/15 !text-white !border-white/30 !py-3 !px-5 !text-sm hover:!bg-white/25">Resume “{{ l.title.length > 22 ? l.title.slice(0, 22) + '…' : l.title }}” →</button>
                }
              </div>
            </div>

            <!-- decorative sticky notes -->
            <div class="hidden md:block absolute right-8 top-6 bottom-6 w-[380px] xl:w-[460px]" aria-hidden="true">
              <div class="absolute right-48 top-2 w-44 p-3.5 rounded-2xl bg-white text-ink text-xs font-semibold shadow-2xl animate-float" style="--r:-6deg; border-left:4px solid #10b981">Zero-downtime deploys 🎉<p class="mt-2 text-[10px] text-muted flex justify-between"><span>Alex</span><span>♥ 5</span></p></div>
              <div class="absolute right-2 top-14 w-48 p-3.5 rounded-2xl bg-white text-ink text-xs font-semibold shadow-2xl animate-float" style="--r:5deg; animation-delay:-2s; border-left:4px solid #f59e0b">PR reviews take too long 🛠<p class="mt-2 text-[10px] text-muted flex justify-between"><span>Sam</span><span class="text-accent font-bold">♥ 7</span></p></div>
              <div class="absolute right-24 bottom-2 w-52 p-3.5 rounded-2xl bg-white text-ink text-xs font-semibold shadow-2xl animate-float" style="--r:-2deg; animation-delay:-4s; border-left:4px solid #5a52f0">Weekly architecture sync 🚀<p class="mt-2 text-[10px] text-muted flex justify-between"><span>Maya</span><span>♥ 4</span></p></div>
            </div>
          </section>

          <!-- Stats -->
          <section class="grid grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Overview">
            @for (s of stats(); track s.label) {
              <div class="panel !rounded-2xl p-5 flex items-center gap-4 transition hover:-translate-y-0.5">
                <span class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" [style.background]="s.bg" aria-hidden="true">{{ s.icon }}</span>
                <div class="min-w-0">
                  <p class="font-display text-3xl font-extrabold leading-none tabular-nums">{{ s.value }}</p>
                  <p class="text-xs font-semibold text-muted mt-1.5">{{ s.label }}</p>
                </div>
              </div>
            }
          </section>

          <!-- Templates -->
          <section id="templates" aria-labelledby="tpl-h">
            <div class="flex items-end justify-between mb-4">
              <div>
                <h2 id="tpl-h" class="text-2xl font-extrabold">Start from a <span class="gradient-text">template</span></h2>
                <p class="text-sm text-muted mt-1">Pick a format and your board is ready in seconds.</p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              @for (t of templates; track t.id) {
                <button type="button" (click)="openCreate(t.id)" class="group text-left rounded-3xl p-5 border border-line bg-white shadow-[0_1px_2px_rgba(21,23,46,.04),0_8px_24px_-8px_rgba(21,23,46,.10)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_rgba(90,82,240,.35)] relative overflow-hidden">
                  <span class="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-20 group-hover:opacity-35 transition" [style.background]="'linear-gradient(135deg,' + t.from + ',' + t.to + ')'" aria-hidden="true"></span>
                  <span class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg" [style.background]="'linear-gradient(135deg,' + t.from + ',' + t.to + ')'" aria-hidden="true">{{ t.icon }}</span>
                  <p class="font-display font-extrabold text-lg mt-4">{{ t.name }}</p>
                  <p class="text-xs text-muted mt-1 leading-relaxed">{{ t.hint }}</p>
                  <div class="flex flex-wrap gap-1.5 mt-4">
                    @for (c of t.cols; track c) { <span class="pill !py-0.5 !px-2 !text-[10px]">{{ c }}</span> }
                  </div>
                </button>
              }
            </div>
          </section>

          <!-- Boards -->
          <section id="boards" aria-labelledby="boards-h" class="pb-10">
            <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="boards-h" class="text-2xl font-extrabold">Your <span class="gradient-text">retrospectives</span></h2>
                <p class="text-sm text-muted mt-1">{{ filteredBoards().length }} of {{ boards().length }} boards</p>
              </div>
              <div>
                <label for="board-search" class="sr-only">Search boards</label>
                <input id="board-search" type="search" autocomplete="off" #boardSearch [value]="search()" (input)="search.set(boardSearch.value)"
                  placeholder="🔍  Search boards…" class="field !w-60 sm:!w-80 !py-2.5 !text-sm">
              </div>
            </div>

            @if (loading()) {
              <div class="flex items-center justify-center py-24" role="status" aria-label="Loading boards">
                <span class="w-10 h-10 rounded-full border-4 border-line border-t-violet animate-spin"></span>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <button type="button" (click)="openCreate()" class="group min-h-56 rounded-3xl border-2 border-dashed border-violet/30 bg-white/50 hover:bg-white hover:border-violet transition flex flex-col items-center justify-center gap-3 text-center p-6">
                  <span class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg group-hover:scale-110 transition" style="background:linear-gradient(135deg,#5a52f0,#a64df0)" aria-hidden="true">＋</span>
                  <span class="font-display font-extrabold text-lg">Create a new board</span>
                  <span class="text-xs text-muted max-w-[200px]">Invite your team and start collecting feedback in real time.</span>
                </button>

                @for (board of filteredBoards(); track board.id; let i = $index) {
                  <article class="panel group relative flex flex-col justify-between min-h-56 overflow-hidden transition hover:shadow-[0_2px_4px_rgba(21,23,46,.04),0_24px_48px_-16px_rgba(90,82,240,.35)] hover:-translate-y-1 !rounded-3xl">
                    <div class="h-1.5"
                      [class.stripe-0]="i % 4 === 0" [class.stripe-1]="i % 4 === 1" [class.stripe-2]="i % 4 === 2" [class.stripe-3]="i % 4 === 3"></div>
                    <div class="p-5 flex-1">
                      <div class="flex items-center justify-between mb-4">
                        <span class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" [style.background]="boardTints[i % 4]" aria-hidden="true">{{ boardIcons[i % 4] }}</span>
                        <div class="flex items-center gap-2">
                          <span class="pill !py-0.5 !text-[11px] uppercase tracking-wide !bg-mint">● {{ board.status }}</span>
                        </div>
                      </div>
                      <h3 class="text-xl font-extrabold leading-snug">
                        <a href="javascript:void(0)" (click)="navigateToBoard(board.id)" class="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{{ board.title }}</a>
                      </h3>
                      @if (board.description) {
                        <p class="text-sm text-muted mt-1.5 line-clamp-2">{{ board.description }}</p>
                      }
                    </div>
                    <div class="px-5 py-3.5 border-t border-line bg-paper/60 flex items-center justify-between gap-3 text-xs font-semibold text-muted">
                      <span class="flex items-center gap-3"><span>▦ {{ board.columnCount }}</span><span>🗒 {{ board.cardCount }}</span><span>{{ board.date }}</span></span>
                      <span class="flex items-center gap-1.5 truncate max-w-[130px]">
                        <span class="w-5 h-5 rounded-full bg-violet/15 text-violet text-[10px] font-bold flex items-center justify-center flex-shrink-0" aria-hidden="true">{{ (board.facilitator || '?').charAt(0).toUpperCase() }}</span>
                        <span class="truncate">{{ board.facilitator }}</span>
                      </span>
                    </div>
                    @if (boards().length > 1) {
                      <button type="button" (click)="requestDeleteBoard(board.id, board.title)"
                        class="icon-btn icon-btn-danger absolute top-6 right-16 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" title="Delete board" [attr.aria-label]="'Delete board ' + board.title">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    }
                  </article>
                }
              </div>
              @if (filteredBoards().length === 0 && search()) {
                <p class="text-center text-base text-muted py-12">No boards match “{{ search() }}”.</p>
              }
            }
          </section>
        </main>
      </div>

      @if (isCreateModalOpen()) {
        <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-title" (click)="isCreateModalOpen.set(false)">
          <div class="modal !max-w-lg" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h2 id="create-title" class="modal-title">Create a board</h2>
              <button type="button" (click)="isCreateModalOpen.set(false)" class="icon-btn text-xl" aria-label="Close">&times;</button>
            </div>

            <div>
              <label for="board-title" class="label">Title</label>
              <input id="board-title" type="text" #newTitleInput [value]="newTitle()" (input)="newTitle.set(newTitleInput.value)" placeholder="e.g. Sprint 43 — Payments" class="field">
            </div>
            <div>
              <label for="board-desc" class="label">Sprint goal / context (optional)</label>
              <input id="board-desc" type="text" #newDescInput [value]="newDescription()" (input)="newDescription.set(newDescInput.value)" placeholder="Velocity, friction, milestones…" class="field">
            </div>

            <div role="radiogroup" aria-label="Template">
              <span class="label">Template</span>
              <div class="grid grid-cols-2 gap-2.5">
                @for (t of templates; track t.id) {
                  <button type="button" role="radio" [attr.aria-checked]="selectedTemplate() === t.id" (click)="selectedTemplate.set(t.id)"
                    class="p-3 rounded-xl border border-line text-left transition hover:-translate-y-0.5"
                    [class.bg-violet]="selectedTemplate() === t.id" [class.text-white]="selectedTemplate() === t.id" [class.bg-surface]="selectedTemplate() !== t.id">
                    <p class="font-bold text-sm">{{ t.icon }} {{ t.name }}</p>
                    <p class="text-[11px] mt-0.5" [class.text-white]="selectedTemplate() === t.id" [class.text-muted]="selectedTemplate() !== t.id">{{ t.hint }}</p>
                  </button>
                }
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-1">
              <button type="button" (click)="isCreateModalOpen.set(false)" class="btn">Cancel</button>
              <button type="button" (click)="confirmCreateBoard()" [disabled]="!newTitle().trim()" class="btn btn-primary">Create board</button>
            </div>
          </div>
        </div>
      }

      @if (confirmingAccountDelete()) {
        <app-confirm-modal title="Delete your account?"
          message="This permanently deletes your account, the boards you created, and your cards and votes on other boards. This cannot be undone."
          confirmText="Delete my account" cancelText="Keep my account"
          [isDestructive]="true" (confirm)="deleteAccount()" (cancel)="confirmingAccountDelete.set(false)"></app-confirm-modal>
      }

      @if (boardToDelete(); as target) {
        <app-confirm-modal title="Delete board" [message]="deleteBoardMessage()" confirmText="Delete board" cancelText="Keep board"
          [isDestructive]="true" (confirm)="confirmDeleteBoard()" (cancel)="boardToDelete.set(null)"></app-confirm-modal>
      }
    </div>
  `
})
export class BoardListComponent implements OnInit {
  public authService = inject(AuthService);
  private boardState = inject(BoardStateService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  public boards = signal<BoardListItem[]>([]);
  public search = signal('');
  public templates: TemplateOption[] = [
    { id: 'classic', name: 'Classic Retro', hint: 'Went well, improve, actions, kudos', icon: '🎯', from: '#5a52f0', to: '#8a4df0', cols: ['Went well', 'Improve', 'Actions'] },
    { id: 'madsadglad', name: 'Mad Sad Glad', hint: 'Emotional pulse and blockers', icon: '🎭', from: '#f2457d', to: '#ff8a4c', cols: ['Glad', 'Mad', 'Sad'] },
    { id: 'startstop', name: 'Start Stop Continue', hint: 'Actionable habit changes', icon: '🚦', from: '#10b981', to: '#38bdf8', cols: ['Start', 'Stop', 'Continue'] },
    { id: '4ls', name: 'The 4 Ls', hint: 'Liked, learned, lacked, longed for', icon: '🧠', from: '#f59e0b', to: '#f2457d', cols: ['Liked', 'Learned', 'Lacked'] }
  ];
  public boardIcons = ['🚀', '🎯', '💡', '🌟'];
  public boardTints = ['#e6e4ff', '#d3f5e4', '#ffe9d1', '#dbeaff'];

  public filteredBoards = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.boards().filter(b => b.title.toLowerCase().includes(q) || (b.description ?? '').toLowerCase().includes(q))
      : this.boards();
  });
  public loading = signal<boolean>(true);

  public firstName = computed(() => (this.authService.currentUser()?.name ?? 'there').split(' ')[0]);
  public initial = computed(() => (this.authService.currentUser()?.name ?? '?').charAt(0).toUpperCase());
  public latest = computed(() => this.boards()[0] ?? null);
  public stats = computed(() => {
    const list = this.boards();
    const cards = list.reduce((n, b) => n + b.cardCount, 0);
    const cols = list.reduce((n, b) => n + b.columnCount, 0);
    return [
      { label: 'Total boards', value: list.length, icon: '🗂️', bg: '#e6e4ff' },
      { label: 'Ideas captured', value: cards, icon: '💡', bg: '#fff1c2' },
      { label: 'Columns created', value: cols, icon: '🧱', bg: '#d3f5e4' },
      { label: 'Avg cards / board', value: list.length ? Math.round(cards / list.length) : 0, icon: '📈', bg: '#ffe0ea' }
    ];
  });

  public greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();
  public today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  public isCreateModalOpen = signal<boolean>(false);
  public newTitle = signal<string>('Sprint ' + (42 + Math.floor(Math.random() * 10)) + ' Retrospective');
  public newDescription = signal<string>('Team retrospective on velocity, architecture milestones, and continuous improvements.');
  public selectedTemplate = signal<RetroTemplate>('classic');

  // State-driven confirmation dialog
  public boardToDelete = signal<{ id: string; title: string } | null>(null);

  public deleteBoardMessage = computed(() => {
    const target = this.boardToDelete();
    if (!target) return '';
    return `Are you sure you want to delete board "${target.title}"? This will permanently delete all columns, cards, and votes associated with this session.`;
  });

  ngOnInit(): void {
    this.refreshBoards();
  }

  public openCreate(template?: RetroTemplate): void {
    if (template) this.selectedTemplate.set(template);
    this.isCreateModalOpen.set(true);
  }

  public scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  public async refreshBoards(): Promise<void> {
    this.loading.set(true);
    const list = await this.boardState.getBoardsList();
    this.boards.set(list);
    this.loading.set(false);
  }

  public navigateToBoard(boardId: string): void {
    this.router.navigate(['/board', boardId]);
  }

  public async confirmCreateBoard(): Promise<void> {
    const title = this.newTitle().trim();
    if (!title) return;

    const boardId = await this.boardState.createBoard(title, this.newDescription(), this.selectedTemplate());
    this.toastService.show(`Board "${title}" created!`, 'success');
    this.isCreateModalOpen.set(false);
    this.router.navigate(['/board', boardId]);
  }

  public confirmingAccountDelete = signal(false);

  public async deleteAccount(): Promise<void> {
    this.confirmingAccountDelete.set(false);
    const { error } = await this.authService.deleteAccount();
    if (error) this.toastService.show(`Could not delete account: ${error.message}`, 'error');
    else this.toastService.show('Your account has been deleted.', 'success');
  }

  public requestDeleteBoard(boardId: string, title: string): void {
    this.boardToDelete.set({ id: boardId, title });
  }

  public async confirmDeleteBoard(): Promise<void> {
    const target = this.boardToDelete();
    if (!target) return;

    await this.boardState.deleteBoard(target.id);
    this.toastService.show(`Board "${target.title}" deleted`, 'info');
    this.boardToDelete.set(null);
    this.refreshBoards();
  }
}
