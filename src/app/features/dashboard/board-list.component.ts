import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BoardStateService, BoardListItem, RetroTemplate } from '../../core/services/board-state.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';

@Component({
  selector: 'app-board-list',
  imports: [ConfirmModalComponent],
  template: `
    <div class="h-screen w-screen overflow-y-auto canvas-grid p-5 md:p-10 flex flex-col">
      <header class="flex flex-wrap items-center justify-between gap-4 max-w-6xl w-full mx-auto mb-10">
        <div class="flex items-center gap-3">
          <span class="logo-mark !w-11 !h-11" aria-hidden="true">R</span>
          <div>
            <h1 class="text-2xl font-bold leading-none">RetroSync</h1>
            <p class="text-xs text-muted mt-1">Hi {{ authService.currentUser()?.name }} 👋 pick up where your team left off</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" (click)="isCreateModalOpen.set(true)" class="btn btn-primary">+ New board</button>
          <button type="button" (click)="authService.signOut()" class="btn">Sign out</button>
          <button type="button" (click)="confirmingAccountDelete.set(true)" class="btn btn-danger">Delete account</button>
        </div>
      </header>

      <main class="max-w-6xl w-full mx-auto flex-1">
        <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 class="text-3xl font-bold">Your <span class="gradient-text">retrospectives</span></h2>
          <div class="flex items-center gap-3">
            <label for="board-search" class="sr-only">Search boards</label>
            <input id="board-search" type="search" autocomplete="off" #boardSearch [value]="search()" (input)="search.set(boardSearch.value)"
              placeholder="Search boards…" class="field !w-52 sm:!w-64 !py-2 !text-xs">
            <span class="pill tabular-nums">{{ filteredBoards().length }} / {{ boards().length }}</span>
          </div>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-24" role="status" aria-label="Loading boards">
            <span class="w-10 h-10 rounded-full border-4 border-line border-t-accent animate-spin"></span>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            @for (board of filteredBoards(); track board.id; let i = $index) {
              <article class="panel group relative flex flex-col justify-between min-h-56 overflow-hidden transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_rgba(124,92,255,.55)] hover:border-white/25">
                <div class="h-1 border-line"
                  [class.stripe-0]="i % 4 === 0" [class.stripe-1]="i % 4 === 1" [class.stripe-2]="i % 4 === 2" [class.stripe-3]="i % 4 === 3"></div>
                <div class="p-5 flex-1">
                  <div class="flex items-center justify-between mb-3">
                    <span class="pill !py-0.5 !text-[11px] uppercase tracking-wide">{{ board.status }}</span>
                    <span class="text-xs text-muted font-medium">{{ board.date }}</span>
                  </div>
                  <h3 class="text-xl font-bold leading-snug">
                    <a href="javascript:void(0)" (click)="navigateToBoard(board.id)" class="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{{ board.title }}</a>
                  </h3>
                  @if (board.description) {
                    <p class="text-sm text-muted mt-1.5 line-clamp-2">{{ board.description }}</p>
                  }
                </div>
                <div class="px-5 py-3 border-t border-dashed border-white/10 flex items-center justify-between text-xs font-semibold text-muted">
                  <span>{{ board.columnCount }} columns · {{ board.cardCount }} cards</span>
                  <span class="truncate max-w-[110px]">by {{ board.facilitator }}</span>
                </div>
                @if (boards().length > 1) {
                  <button type="button" (click)="requestDeleteBoard(board.id, board.title)"
                    class="icon-btn icon-btn-danger absolute top-6 right-3 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" title="Delete board" [attr.aria-label]="'Delete board ' + board.title">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                }
              </article>
            }
          </div>
          @if (filteredBoards().length === 0) {
            <p class="text-center text-base text-muted py-16">No boards match “{{ search() }}”.</p>
          }
        }
      </main>

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
                    <p class="font-bold text-sm">{{ t.name }}</p>
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
  public templates: { id: RetroTemplate; name: string; hint: string }[] = [
    { id: 'classic', name: 'Classic Retro', hint: 'Went well, improve, actions, kudos' },
    { id: 'madsadglad', name: 'Mad Sad Glad', hint: 'Emotional pulse and blockers' },
    { id: 'startstop', name: 'Start Stop Continue', hint: 'Actionable habit changes' },
    { id: '4ls', name: 'The 4 Ls', hint: 'Liked, learned, lacked, longed for' }
  ];
  public filteredBoards = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.boards().filter(b => b.title.toLowerCase().includes(q) || (b.description ?? '').toLowerCase().includes(q))
      : this.boards();
  });
  public loading = signal<boolean>(true);

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
