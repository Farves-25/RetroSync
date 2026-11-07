import { Component, input, output, signal, inject, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { Column } from '../../../../core/models/board.model';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-add-card-modal',
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      (click)="onBackdropClick($event)">

      <div
        class="w-full max-w-lg glass-panel rounded-2xl shadow-2xl border border-slate-700/80 p-6 flex flex-col gap-4 text-slate-100"
        (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
            <h2 id="modal-title" class="text-base font-bold text-white tracking-tight">Add Retrospective Card</h2>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close modal">
            &times;
          </button>
        </div>

        <!-- Target Column Selector -->
        <div>
          <label for="column-select" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Select Column
          </label>
          <select
            id="column-select"
            [value]="selectedColumnId()"
            (change)="onColumnChange($event)"
            class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
            @for (col of columns(); track col.id) {
              <option [value]="col.id">{{ col.title }}</option>
            }
          </select>
        </div>

        <!-- Content Area -->
        <div>
          <label for="card-content" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Card Content / Feedback
          </label>
          <textarea
            #contentInput
            id="card-content"
            rows="4"
            [value]="content()"
            (input)="content.set(contentInput.value)"
            (keydown)="handleKeyDown($event)"
            placeholder="Share your thought, friction point, or team win... (Press Ctrl+Enter to submit)"
            class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition">
          </textarea>
        </div>

        <!-- Quick Tags / Prompts -->
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="text-slate-500 text-[11px] font-medium mr-1">Suggestions:</span>
          <button
            type="button"
            (click)="appendPrompt('Great collaboration on ')"
            class="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition">
            🎉 Great collaboration
          </button>
          <button
            type="button"
            (click)="appendPrompt('Friction with ')"
            class="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition">
            ⚠️ Friction with
          </button>
          <button
            type="button"
            (click)="appendPrompt('Action item: ')"
            class="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition">
            🚀 Action item
          </button>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-slate-800 pt-3 mt-1">
          <span class="text-[11px] text-slate-500 hidden sm:inline">
            <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">Ctrl</kbd> +
            <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">Enter</kbd> to save
          </span>

          <div class="flex items-center gap-2 ml-auto">
            <button
              type="button"
              (click)="close.emit()"
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
              Cancel
            </button>
            <button
              type="button"
              (click)="submitCard()"
              [disabled]="!content().trim()"
              class="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white shadow-lg shadow-indigo-600/30 transition">
              Post Card
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AddCardModalComponent {
  public columns = input.required<Column[]>();
  public initialColumnId = input<string>('');

  public close = output<void>();

  private boardState = inject(BoardStateService);
  private toastService = inject(ToastService);

  public selectedColumnId = signal<string>('');
  public content = signal<string>('');

  private contentInputRef = viewChild<ElementRef<HTMLTextAreaElement>>('contentInput');

  constructor() {
    afterNextRender(() => {
      this.selectedColumnId.set(this.initialColumnId() || this.columns()[0]?.id || '');
      this.contentInputRef()?.nativeElement.focus();
    });
  }

  public onColumnChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedColumnId.set(target.value);
  }

  public appendPrompt(text: string): void {
    this.content.update(c => c ? `${c} ${text}` : text);
    this.contentInputRef()?.nativeElement.focus();
  }

  public handleKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.submitCard();
    } else if (event.key === 'Escape') {
      this.close.emit();
    }
  }

  public onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  public async submitCard(): Promise<void> {
    const text = this.content().trim();
    const colId = this.selectedColumnId() || this.columns()[0]?.id;
    if (!text || !colId) return;

    await this.boardState.createCard(colId, text);
    this.toastService.show('Card posted to board!', 'success');
    this.close.emit();
  }
}

