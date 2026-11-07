import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';

interface BoardSummary {
  id: string;
  title: string;
  date: string;
  columnCount: number;
  cardCount: number;
  facilitator: string;
  status: 'active' | 'completed';
}

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
            (click)="createNewBoard()"
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
          <h2 class="text-base font-semibold text-slate-300">Recent Retrospectives</h2>
          <span class="text-xs text-slate-500 font-mono">{{ boards().length }} boards total</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (board of boards(); track board.id) {
            <div
              (click)="navigateToBoard(board.id)"
              class="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer transition-all duration-200 group flex flex-col justify-between h-56">

              <div>
                <div class="flex items-center justify-between mb-3">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                    [class.bg-emerald-500/10]="board.status === 'active'"
                    [class.border-emerald-500/30]="board.status === 'active'"
                    [class.text-emerald-300]="board.status === 'active'"
                    [class.bg-slate-800]="board.status === 'completed'"
                    [class.border-slate-700]="board.status === 'completed'"
                    [class.text-slate-400]="board.status === 'completed'">
                    {{ board.status }}
                  </span>
                  <span class="text-xs text-slate-500">{{ board.date }}</span>
                </div>

                <h3 class="text-base font-bold text-white group-hover:text-indigo-300 transition tracking-tight">
                  {{ board.title }}
                </h3>
              </div>

              <div class="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
                <div class="flex items-center gap-3">
                  <span>{{ board.columnCount }} columns</span>
                  <span>&bull;</span>
                  <span>{{ board.cardCount }} cards</span>
                </div>
                <span class="text-[11px] font-medium text-slate-500">By {{ board.facilitator }}</span>
              </div>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class BoardListComponent {
  public authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  public boards = signal<BoardSummary[]>([
    {
      id: 'sprint-42',
      title: 'Sprint 42 Retrospective — The Velocity Leap',
      date: 'Active Now',
      columnCount: 4,
      cardCount: 6,
      facilitator: 'Alex Rivera',
      status: 'active'
    },
    {
      id: 'q4-architecture',
      title: 'Q4 Architectural Roadmap & Tech Debt Review',
      date: '3 days ago',
      columnCount: 4,
      cardCount: 14,
      facilitator: 'Maya Lin',
      status: 'completed'
    },
    {
      id: 'mobile-app-release',
      title: 'v2.4 Mobile App Launch Post-Mortem',
      date: '2 weeks ago',
      columnCount: 3,
      cardCount: 9,
      facilitator: 'Sam Chen',
      status: 'completed'
    }
  ]);

  public navigateToBoard(boardId: string): void {
    this.router.navigate(['/board', boardId]);
  }

  public createNewBoard(): void {
    const newId = 'sprint-' + Math.floor(43 + Math.random() * 20);
    this.toastService.show('New retro canvas generated!', 'success');
    this.router.navigate(['/board', newId]);
  }
}

