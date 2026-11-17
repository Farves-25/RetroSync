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
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="col-modal-title" (click)="close.emit()">
      <div class="modal !max-w-md" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between">
          <h2 id="col-modal-title" class="modal-title">New column</h2>
          <button type="button" (click)="close.emit()" class="icon-btn text-xl" aria-label="Close">&times;</button>
        </div>

        <div>
          <label for="column-title" class="label">Title</label>
          <input #titleInput id="column-title" type="text" [value]="title()" (input)="title.set(titleInput.value)"
            (keydown.enter)="createColumn()" placeholder="e.g. Tech debt 🧹" class="field">
        </div>

        <div role="radiogroup" aria-label="Column colour">
          <span class="label">Colour</span>
          <div class="flex items-center gap-2.5">
            @for (color of presetColors; track color) {
              <button type="button" role="radio" [attr.aria-checked]="selectedColor() === color" [attr.aria-label]="color"
                (click)="selectedColor.set(color)"
                class="w-9 h-9 rounded-full border border-line transition-transform hover:scale-110 flex items-center justify-center"
                [style.background-color]="color" [class.scale-110]="selectedColor() === color"
                [style.box-shadow]="selectedColor() === color ? '0 0 0 3px #fffdf8, 0 0 0 5px #17140f' : 'none'">
                @if (selectedColor() === color) { <span class="text-white font-bold text-sm">✓</span> }
              </button>
            }
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-1">
          <button type="button" (click)="close.emit()" class="btn">Cancel</button>
          <button type="button" (click)="createColumn()" [disabled]="!title().trim()" class="btn btn-primary">Create column</button>
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

