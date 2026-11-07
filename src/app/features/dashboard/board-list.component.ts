import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BoardStateService, BoardListItem, RetroTemplate } from '../../core/services/board-state.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-board-list',
  template: `
    <div class="min-h-screen w-screen canvas-grid p-6 md:p-12 text-slate-100 flex flex-col select-none">
      <!-- Top Navigation -->
      <header class="flex items-center justify-between max-w-6xl w-full mx-auto mb-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-white">RetroSync Workspaces</h1>
            <p class="text-xs text-slate-400">Team agile retrospective canvas hub</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="isCreateModalOpen.set(true)"
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Retro Board</span>
          </button>

          <button
            type="button"
            (click)="authService.signOut()"
            class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition">
            Sign Out
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-6xl w-full mx-auto flex-1">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-base font-semibold text-slate-300">Your Retrospectives</h2>
          <span class="text-xs text-slate-500 font-mono">{{ boards().length }} boards available</span>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-24">
            <svg class="w-8 h-8 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2" stroke="currentColor" stroke-dasharray="32" stroke-dashoffset="10"/>
            </svg>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (board of boards(); track board.id) {
              <div
                class="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer transition-all duration-200 group flex flex-col justify-between h-60 relative"
                (click)="navigateToBoard(board.id)">

                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                      {{ board.status }}
                    </span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-slate-500">{{ board.date }}</span>
                      @if (boards().length > 1) {
                        <button
                          type="button"
                          (click)="$event.stopPropagation(); deleteBoard(board.id, board.title)"
                          class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition"
                          title="Delete Board">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      }
                    </div>
                  </div>

                  <h3 class="text-base font-bold text-white group-hover:text-indigo-300 transition tracking-tight">
                    {{ board.title }}
                  </h3>
                  @if (board.description) {
                    <p class="text-xs text-slate-400 mt-1 line-clamp-2">
                      {{ board.description }}
                    </p>
                  }
                </div>

                <div class="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
                  <div class="flex items-center gap-3">
                    <span>{{ board.columnCount }} columns</span>
                    <span>&bull;</span>
                    <span>{{ board.cardCount }} cards</span>
                  </div>
                  <span class="text-[11px] font-medium text-slate-500 truncate max-w-[100px]">By {{ board.facilitator }}</span>
                </div>
              </div>
            }
          </div>
        }
      </main>

      <!-- Real New Board Creator Modal -->
      @if (isCreateModalOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          (click)="isCreateModalOpen.set(false)">

          <div
            class="w-full max-w-lg glass-panel rounded-2xl shadow-2xl border border-slate-700 p-6 flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()">

            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 class="text-base font-bold text-white tracking-tight">Create Retrospective Board</h2>
              <button
                type="button"
                (click)="isCreateModalOpen.set(false)"
                class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
                &times;
              </button>
            </div>

            <!-- Title Input -->
            <div>
              <label for="board-title" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Board Title
              </label>
              <input
                id="board-title"
                type="text"
                #newTitleInput
                [value]="newTitle()"
                (input)="newTitle.set(newTitleInput.value)"
                placeholder="e.g., Sprint 43 — Payment Gateway Integration"
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <!-- Description -->
            <div>
              <label for="board-desc" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Sprint Goal / Context (Optional)
              </label>
              <input
                id="board-desc"
                type="text"
                #newDescInput
                [value]="newDescription()"
                (input)="newDescription.set(newDescInput.value)"
                placeholder="Reviewing velocity, cross-team friction, and delivery milestone."
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <!-- Template Picker -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Retrospective Template
              </label>
              <div class="grid grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  (click)="selectedTemplate.set('classic')"
                  class="p-3 rounded-xl border text-left transition"
                  [class.border-indigo-500]="selectedTemplate() === 'classic'"
                  [class.bg-indigo-950/40]="selectedTemplate() === 'classic'"
                  [class.border-slate-800]="selectedTemplate() !== 'classic'">
                  <p class="font-bold text-white">Classic Retro</p>
                  <p class="text-[11px] text-slate-400 mt-1">Went Well, Improve, Actions, Kudos</p>
                </button>

                <button
                  type="button"
                  (click)="selectedTemplate.set('madsadglad')"
                  class="p-3 rounded-xl border text-left transition"
                  [class.border-indigo-500]="selectedTemplate() === 'madsadglad'"
                  [class.bg-indigo-950/40]="selectedTemplate() === 'madsadglad'"
                  [class.border-slate-800]="selectedTemplate() !== 'madsadglad'">
                  <p class="font-bold text-white">Mad Sad Glad</p>
                  <p class="text-[11px] text-slate-400 mt-1">Emotional pulse & team blockers</p>
                </button>

                <button
                  type="button"
                  (click)="selectedTemplate.set('startstop')"
                  class="p-3 rounded-xl border text-left transition"
                  [class.border-indigo-500]="selectedTemplate() === 'startstop'"
                  [class.bg-indigo-950/40]="selectedTemplate() === 'startstop'"
                  [class.border-slate-800]="selectedTemplate() !== 'startstop'">
                  <p class="font-bold text-white">Start Stop Continue</p>
                  <p class="text-[11px] text-slate-400 mt-1">Actionable habit changes</p>
                </button>

                <button
                  type="button"
                  (click)="selectedTemplate.set('4ls')"
                  class="p-3 rounded-xl border text-left transition"
                  [class.border-indigo-500]="selectedTemplate() === '4ls'"
                  [class.bg-indigo-950/40]="selectedTemplate() === '4ls'"
                  [class.border-slate-800]="selectedTemplate() !== '4ls'">
                  <p class="font-bold text-white">The 4 Ls</p>
                  <p class="text-[11px] text-slate-400 mt-1">Liked, Learned, Lacked, Longed For</p>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                (click)="isCreateModalOpen.set(false)"
                class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                Cancel
              </button>
              <button
                type="button"
                (click)="confirmCreateBoard()"
                [disabled]="!newTitle().trim()"
                class="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition">
                Generate Board
              </button>
            </div>
          </div>
        </div>
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
  public loading = signal<boolean>(true);

  public isCreateModalOpen = signal<boolean>(false);
  public newTitle = signal<string>('Sprint ' + (42 + Math.floor(Math.random() * 10)) + ' Retrospective');
  public newDescription = signal<string>('Team retrospective on velocity, architecture milestones, and continuous improvements.');
  public selectedTemplate = signal<RetroTemplate>('classic');

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

  public async deleteBoard(boardId: string, title: string): Promise<void> {
    if (confirm(`Are you sure you want to delete board "${title}"?`)) {
      await this.boardState.deleteBoard(boardId);
      this.toastService.show('Board deleted', 'info');
      this.refreshBoards();
    }
  }
}
