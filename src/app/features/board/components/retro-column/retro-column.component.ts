import { Component, input, output, computed, inject, signal } from '@angular/core';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragPlaceholder, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Column, Card } from '../../../../core/models/board.model';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { RetroCardComponent } from '../retro-card/retro-card.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { BoardViewService } from '../../board-view.service';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component';

@Component({
  selector: 'app-retro-column',
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, RetroCardComponent, ConfirmModalComponent],
  template: `
    <section class="flex flex-col w-80 md:w-[22rem] flex-shrink-0 max-h-full rounded-[20px] border border-line overflow-hidden animate-fade-in"
      [style.background]="'linear-gradient(180deg, color-mix(in srgb, ' + column().color_hex + ' 9%, #0d0e16), #0a0b12)'"
      [attr.aria-label]="column().title + ' column'">
      <div class="px-4 py-3 border-b border-line flex items-center justify-between gap-2 select-none"
        [style.background]="'linear-gradient(180deg, color-mix(in srgb, ' + column().color_hex + ' 26%, #14151f), color-mix(in srgb, ' + column().color_hex + ' 8%, #10111a))'">
        @if (isEditingTitle()) {
          <div class="flex items-center gap-1.5 flex-1">
            <label [attr.for]="'col-title-' + column().id" class="sr-only">Column title</label>
            <input #titleInput [id]="'col-title-' + column().id" type="text" [value]="column().title"
              (keydown.enter)="saveColumnTitle(titleInput.value)" (keydown.escape)="isEditingTitle.set(false)"
              class="field !py-1.5 !text-sm">
            <button type="button" (click)="saveColumnTitle(titleInput.value)" class="btn btn-sm btn-dark">Save</button>
          </div>
        } @else {
          <div class="flex items-center gap-2 min-w-0">
            <h2 class="text-base font-bold leading-tight">{{ column().title }}</h2>
            <span class="pill !px-2 !py-0.5 tabular-nums" [attr.aria-label]="cards().length + ' cards'">{{ cards().length }}</span>
          </div>
        }

        <div class="flex items-center gap-0.5 flex-shrink-0">
          @if (!isEditingTitle() && boardState.isFacilitator()) {
            <button type="button" (click)="isEditingTitle.set(true)" class="icon-btn" title="Rename column" [attr.aria-label]="'Rename column ' + column().title">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button type="button" (click)="isConfirmDeleteOpen.set(true)" class="icon-btn icon-btn-danger" title="Delete column" [attr.aria-label]="'Delete column ' + column().title">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          }
          <button type="button" (click)="onAddCardClick()" class="btn btn-sm !px-2.5 ml-1" title="Add card to this column" [attr.aria-label]="'Add card to ' + column().title">
            <span class="text-base leading-none" aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <div cdkDropList [id]="column().id" [cdkDropListData]="cards()" [cdkDropListConnectedTo]="connectedColumnIds()"
        [cdkDropListDisabled]="view.isCustomView()" (cdkDropListDropped)="onCardDrop($event)"
        class="flex-1 p-3 overflow-y-auto space-y-4 min-h-[200px]">

        @if (view.isCustomView()) {
          <p class="text-[11px] font-semibold text-muted text-center">Filtered view · drag &amp; drop paused</p>
        }

        @for (card of cards(); track card.id) {
          <div cdkDrag [cdkDragData]="card" [cdkDragDisabled]="view.isCustomView()"
            [class.cursor-grab]="!view.isCustomView()" class="active:cursor-grabbing">
            <div *cdkDragPlaceholder class="rounded-xl border border-dashed border-white/20 bg-white/5 h-24"></div>
            <app-retro-card [card]="card" [color]="column().color_hex" [isBlurred]="boardState.isBlurred()" [isTop]="card.id === view.stats().topCardId"></app-retro-card>
          </div>
        } @empty {
          @if (view.isCustomView()) {
            <p class="p-6 text-center text-sm text-muted">No cards match the current filters.</p>
          } @else {
            <button type="button" (click)="onAddCardClick()"
              class="w-full flex flex-col items-center justify-center gap-1 p-6 border border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:border-line hover:bg-surface/60 transition">
              <span class="text-2xl" aria-hidden="true">📝</span>
              <span class="text-sm font-bold">Nothing here yet</span>
              <span class="text-xs text-muted">Click to add the first card</span>
            </button>
          }
        }
      </div>

      @if (isConfirmDeleteOpen()) {
        <app-confirm-modal title="Delete column" [message]="deleteColumnMessage()" confirmText="Delete column" cancelText="Keep column"
          [isDestructive]="true" (confirm)="confirmDeleteColumn()" (cancel)="isConfirmDeleteOpen.set(false)"></app-confirm-modal>
      }
    </section>
  `
})
export class RetroColumnComponent {
  public column = input.required<Column>();
  public connectedColumnIds = input.required<string[]>();
  public addCardRequested = output<string>();

  public boardState = inject(BoardStateService);
  public view = inject(BoardViewService);
  private toastService = inject(ToastService);

  public isEditingTitle = signal<boolean>(false);
  public isConfirmDeleteOpen = signal<boolean>(false);

  public deleteColumnMessage = computed(() => {
    return `Are you sure you want to delete column "${this.column().title}" and all ${this.boardState.columnCardMap().get(this.column().id)?.length ?? 0} cards in it? This action cannot be undone.`;
  });

  public cards = computed(() => {
    return this.view.filteredCardMap().get(this.column().id) || [];
  });

  public onAddCardClick(): void {
    this.addCardRequested.emit(this.column().id);
  }

  public saveColumnTitle(newTitle: string): void {
    if (newTitle.trim()) {
      this.boardState.updateColumn(this.column().id, newTitle, this.column().color_hex);
      this.isEditingTitle.set(false);
      this.toastService.show(`Column renamed to "${newTitle}"`, 'info');
    }
  }

  public confirmDeleteColumn(): void {
    this.boardState.deleteColumn(this.column().id);
    this.toastService.show(`Column "${this.column().title}" removed`, 'warning');
    this.isConfirmDeleteOpen.set(false);
  }

  public onCardDrop(event: CdkDragDrop<Card[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.boardState.reorderCard(event.item.data.id, event.container.id, event.currentIndex);
  }
}
