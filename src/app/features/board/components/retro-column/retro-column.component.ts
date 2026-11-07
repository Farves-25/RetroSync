import { Component, input, output, computed, inject } from '@angular/core';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragPlaceholder, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Column, Card } from '../../../../core/models/board.model';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { RetroCardComponent } from '../retro-card/retro-card.component';

@Component({
  selector: 'app-retro-column',
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, RetroCardComponent],
  template: `
    <div class="flex flex-col w-80 md:w-88 flex-shrink-0 max-h-full rounded-2xl bg-slate-900/60 border border-slate-800/90 shadow-2xl backdrop-blur-xl flex-1">
      <!-- Column Header -->
      <div class="p-4 border-b border-slate-800/80 flex items-center justify-between select-none">
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

        <button
          type="button"
          (click)="onAddCardClick()"
          class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 transition shadow-sm group"
          title="Add idea to this column">
          <svg class="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </button>
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

  public cards = computed(() => {
    return this.boardState.columnCardMap().get(this.column().id) || [];
  });

  public onAddCardClick(): void {
    this.addCardRequested.emit(this.column().id);
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

