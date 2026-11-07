import { Component, input, output, computed, inject, signal } from '@angular/core';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragPlaceholder, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Column, Card } from '../../../../core/models/board.model';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { RetroCardComponent } from '../retro-card/retro-card.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-retro-column',
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, RetroCardComponent],
  template: `
    <div class="flex flex-col w-80 md:w-88 flex-shrink-0 max-h-full rounded-2xl bg-slate-900/60 border border-slate-800/90 shadow-2xl backdrop-blur-xl flex-1">
      <!-- Column Header -->
      <div class="p-4 border-b border-slate-800/80 flex items-center justify-between select-none">
        @if (isEditingTitle()) {
          <div class="flex items-center gap-1.5 flex-1 mr-2">
            <input
              #titleInput
              type="text"
              [value]="column().title"
              (keydown.enter)="saveColumnTitle(titleInput.value)"
              (keydown.escape)="isEditingTitle.set(false)"
              class="w-full bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-xs text-white focus:outline-none">
            <button
              type="button"
              (click)="saveColumnTitle(titleInput.value)"
              class="px-2 py-1 text-[11px] rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
              Save
            </button>
          </div>
        } @else {
          <div class="flex items-center gap-2.5">
            <span
              class="w-3 h-3 rounded-full shadow-sm ring-2 ring-slate-800"
              [style.background-color]="column().color_hex">
            </span>
            <h2 class="text-sm font-bold text-white tracking-tight">
              {{ column().title }}
            </h2>
            <span class="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
              {{ cards().length }}
            </span>
          </div>
        }

        <div class="flex items-center gap-1">
          <!-- Column Options / Edit -->
          @if (!isEditingTitle() && boardState.isFacilitator()) {
            <button
              type="button"
              (click)="isEditingTitle.set(true)"
              class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Rename column">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              type="button"
              (click)="deleteColumn()"
              class="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition"
              title="Delete column">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          }

          <!-- Add Card Button -->
          <button
            type="button"
            (click)="onAddCardClick()"
            class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 transition shadow-sm group"
            title="Add card to this column">
            <svg class="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Drop List Container -->
      <div
        cdkDropList
        [id]="column().id"
        [cdkDropListData]="cards()"
        [cdkDropListConnectedTo]="connectedColumnIds()"
        (cdkDropListDropped)="onCardDrop($event)"
        class="flex-1 p-3 overflow-y-auto space-y-3 min-h-[300px]">

        @for (card of cards(); track card.id) {
          <div
            cdkDrag
            [cdkDragData]="card"
            class="cursor-grab active:cursor-grabbing transition-shadow">
            
            <!-- Drag Placeholder -->
            <div
              *cdkDragPlaceholder
              class="rounded-xl border-2 border-dashed border-indigo-500/40 bg-indigo-950/20 h-24 my-1">
            </div>

            <app-retro-card
              [card]="card"
              [isBlurred]="boardState.isBlurred()">
            </app-retro-card>
          </div>
        } @empty {
          <div
            (click)="onAddCardClick()"
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-xl text-center cursor-pointer hover:border-slate-700 hover:bg-slate-800/30 transition group">
            <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 mb-2 transition">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p class="text-xs font-medium text-slate-400 group-hover:text-slate-300">
              No items yet. Click to add one.
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class RetroColumnComponent {
  public column = input.required<Column>();
  public connectedColumnIds = input.required<string[]>();
  public addCardRequested = output<string>();

  public boardState = inject(BoardStateService);
  private toastService = inject(ToastService);

  public isEditingTitle = signal<boolean>(false);

  public cards = computed(() => {
    return this.boardState.columnCardMap().get(this.column().id) || [];
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

  public deleteColumn(): void {
    if (confirm(`Delete column "${this.column().title}" and all its cards?`)) {
      this.boardState.deleteColumn(this.column().id);
      this.toastService.show(`Column removed`, 'warning');
    }
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
