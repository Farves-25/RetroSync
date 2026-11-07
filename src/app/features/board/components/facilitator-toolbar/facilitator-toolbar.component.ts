import { Component, inject, signal, output } from '@angular/core';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-facilitator-toolbar',
  template: `
    <aside
      aria-label="Facilitator tools"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-2xl glass-panel shadow-2xl border border-slate-700/80 flex items-center gap-3 backdrop-blur-xl animate-fade-in select-none">

      <!-- Facilitator Label / Badge -->
      <div class="hidden md:flex items-center gap-1.5 pr-2 border-r border-slate-800 text-slate-400">
        <svg class="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Facilitator</span>
      </div>

      <!-- Stealth Mode (Blur Toggle) -->
      <button
        type="button"
        (click)="toggleStealthMode()"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-sm"
        [class.bg-amber-500/20]="boardState.isBlurred()"
        [class.border-amber-500/50]="boardState.isBlurred()"
        [class.text-amber-300]="boardState.isBlurred()"
        [class.bg-slate-800/80]="!boardState.isBlurred()"
        [class.border-slate-700]="!boardState.isBlurred()"
        [class.text-slate-300]="!boardState.isBlurred()"
        [title]="boardState.isBlurred() ? 'Reveal all cards to participants' : 'Hide cards to prevent bias during brainstorming'">
        @if (boardState.isBlurred()) {
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
          <span>Stealth: Active</span>
        } @else {
          <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Stealth Mode</span>
        }
      </button>

      <!-- Timer Controls -->
      <div class="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
        <span class="text-[11px] font-semibold text-slate-400 px-1.5 hidden sm:inline">Timer:</span>
        <button
          type="button"
          (click)="setTimer(3)"
          class="px-2 py-1 text-xs rounded-lg hover:bg-slate-700 text-slate-200 transition">
          3m
        </button>
        <button
          type="button"
          (click)="setTimer(5)"
          class="px-2 py-1 text-xs rounded-lg hover:bg-slate-700 text-slate-200 transition">
          5m
        </button>
        <button
          type="button"
          (click)="setTimer(10)"
          class="px-2 py-1 text-xs rounded-lg hover:bg-slate-700 text-slate-200 transition">
          10m
        </button>
        @if (boardState.currentBoard()?.timer_ends_at) {
          <button
            type="button"
            (click)="clearTimer()"
            class="px-2 py-1 text-xs rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 transition"
            title="Stop timer">
            Stop
          </button>
        }
      </div>

      <!-- Add Column Button -->
      <button
        type="button"
        (click)="openAddColumn.emit()"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition shadow-sm"
        title="Add a new column">
        <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Column</span>
      </button>
    </aside>
  `
})
export class FacilitatorToolbarComponent {
  public boardState = inject(BoardStateService);
  private toastService = inject(ToastService);

  public openAddColumn = output<void>();

  public toggleStealthMode(): void {
    const nextState = !this.boardState.isBlurred();
    this.boardState.toggleBlur(nextState);
    if (nextState) {
      this.toastService.show('Stealth mode activated: participant cards are hidden to avoid bias.', 'warning');
    } else {
      this.toastService.show('Stealth mode disabled: all cards are now revealed!', 'success');
    }
  }

  public setTimer(minutes: number): void {
    this.boardState.setTimer(minutes);
    this.toastService.show(`Sprint timer set for ${minutes} minutes.`, 'info');
  }

  public clearTimer(): void {
    this.boardState.setTimer(0);
    this.toastService.show('Timer stopped.', 'info');
  }
}

