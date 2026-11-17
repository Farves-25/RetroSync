import { Component, inject, signal, output } from '@angular/core';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-facilitator-toolbar',
  template: `
    <aside aria-label="Facilitator tools"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-1.5rem)] panel !rounded-2xl px-3 py-2.5 flex items-center gap-2.5 animate-fade-in select-none overflow-x-auto">
      <span class="hidden md:inline-flex pill !bg-violet !text-white">Facilitator</span>

      <button type="button" (click)="toggleStealthMode()" class="btn btn-sm"
        [class.!bg-lemon]="boardState.isBlurred()" [attr.aria-pressed]="boardState.isBlurred()"
        [title]="boardState.isBlurred() ? 'Reveal all cards to participants' : 'Hide cards to prevent bias during brainstorming'">
        <span aria-hidden="true">{{ boardState.isBlurred() ? '🙈' : '👁' }}</span>
        {{ boardState.isBlurred() ? 'Stealth on' : 'Stealth mode' }}
      </button>

      <div class="flex items-center gap-1.5 pl-2.5 border-l border-white/10" role="group" aria-label="Timer">
        <span class="text-xs font-bold text-muted hidden sm:inline">Timer</span>
        @for (m of [3, 5, 10]; track m) {
          <button type="button" (click)="setTimer(m)" class="btn btn-sm !px-2.5">{{ m }}m</button>
        }
        @if (boardState.currentBoard()?.timer_ends_at) {
          <button type="button" (click)="clearTimer()" class="btn btn-sm btn-danger" title="Stop timer">Stop</button>
        }
      </div>

      <button type="button" (click)="openAddColumn.emit()" class="btn btn-sm btn-dark" title="Add a new column">
        <span aria-hidden="true" class="text-base leading-none">+</span> Column
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

