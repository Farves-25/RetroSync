import { Component, output, signal, inject } from '@angular/core';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { ToastService } from '../../../../shared/services/toast.service';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f97316'  // Orange
];

@Component({
  selector: 'app-add-column-modal',
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      (click)="close.emit()">

      <div
        class="w-full max-w-md glass-panel rounded-2xl shadow-2xl border border-slate-700/80 p-6 flex flex-col gap-4 text-slate-100"
        (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 class="text-base font-bold text-white tracking-tight">Add Retrospective Column</h2>
          <button
            type="button"
            (click)="close.emit()"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close add column modal">
            &times;
          </button>
        </div>

        <!-- Title Input -->
        <div>
          <label for="column-title" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Column Title
          </label>
          <input
            #titleInput
            id="column-title"
            type="text"
            [value]="title()"
            (input)="title.set(titleInput.value)"
            (keydown.enter)="createColumn()"
            placeholder="e.g., Tech Debt & Refactoring 🧹"
            class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
        </div>

        <!-- Color Swatches -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Theme Color
          </label>
          <div class="flex items-center gap-2">
            @for (color of presetColors; track color) {
              <button
                type="button"
                (click)="selectedColor.set(color)"
                class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                [style.background-color]="color"
                [class.border-white]="selectedColor() === color"
                [class.border-transparent]="selectedColor() !== color"
                [class.scale-110]="selectedColor() === color"
                [title]="color">
                @if (selectedColor() === color) {
                  <span class="w-2 h-2 rounded-full bg-white"></span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            Cancel
          </button>
          <button
            type="button"
            (click)="createColumn()"
            [disabled]="!title().trim()"
            class="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition">
            Create Column
          </button>
        </div>
      </div>
    </div>
  `
})
export class AddColumnModalComponent {
  public close = output<void>();

  private boardState = inject(BoardStateService);
  private toastService = inject(ToastService);

  public presetColors = PRESET_COLORS;
  public title = signal<string>('');
  public selectedColor = signal<string>(PRESET_COLORS[0]);

  public async createColumn(): Promise<void> {
    const text = this.title().trim();
    if (!text) return;

    await this.boardState.addColumn(text, this.selectedColor());
    this.toastService.show(`Column "${text}" added!`, 'success');
    this.close.emit();
  }
}

