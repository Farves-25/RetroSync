import { Component, input, output, signal, computed, inject, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { SelectComponent, SelectOption } from '../../../../shared/components/select.component';
import { Column } from '../../../../core/models/board.model';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-add-card-modal',
  imports: [SelectComponent],
  template: `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title" (click)="onBackdropClick($event)">
      <div class="modal !max-w-lg" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between">
          <h2 id="modal-title" class="modal-title">New card</h2>
          <button type="button" (click)="close.emit()" class="icon-btn text-xl" aria-label="Close">&times;</button>
        </div>

        <div>
          <span class="label">Column</span>
          <app-select label="Column" [options]="columnOptions()" [(value)]="selectedColumnId"></app-select>
        </div>

        <div>
          <label for="card-content" class="label">What's on your mind?</label>
          <textarea #contentInput id="card-content" rows="4" [value]="content()" (input)="content.set(contentInput.value)"
            (keydown)="handleKeyDown($event)" placeholder="Share a win, a friction point or an idea…" class="field resize-none"></textarea>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold text-muted">Starters</span>
          <button type="button" (click)="appendPrompt('Great collaboration on ')" class="pill">🎉 Great collaboration</button>
          <button type="button" (click)="appendPrompt('Friction with ')" class="pill">⚠️ Friction with</button>
          <button type="button" (click)="appendPrompt('Action item: ')" class="pill">🚀 Action item</button>
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="text-xs text-muted hidden sm:inline"><kbd class="font-bold">Ctrl</kbd> + <kbd class="font-bold">Enter</kbd> to post</span>
          <div class="flex items-center gap-3 ml-auto">
            <button type="button" (click)="close.emit()" class="btn">Cancel</button>
            <button type="button" (click)="submitCard()" [disabled]="!content().trim()" class="btn btn-primary">Post card</button>
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
  public columnOptions = computed<SelectOption[]>(() =>
    this.columns().map(c => ({ value: c.id, label: c.title, color: c.color_hex })));
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

