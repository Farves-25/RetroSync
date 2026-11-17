import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BoardStateService } from '../../core/services/board-state.service';
import { RealtimePresenceService } from '../../core/services/realtime-presence.service';
import { AuthService, PRESET_COLLABORATORS } from '../../core/services/auth.service';
import { BoardHeaderComponent } from './components/board-header/board-header.component';
import { BoardInsightsComponent } from './components/board-insights/board-insights.component';
import { RetroColumnComponent } from './components/retro-column/retro-column.component';
import { CursorCanvasComponent } from './components/cursor-canvas/cursor-canvas.component';
import { FacilitatorToolbarComponent } from './components/facilitator-toolbar/facilitator-toolbar.component';
import { AddCardModalComponent } from './components/card-modal/add-card-modal.component';
import { AddColumnModalComponent } from './components/column-modal/add-column-modal.component';

@Component({
  selector: 'app-board',
  imports: [
    BoardHeaderComponent,
    BoardInsightsComponent,
    RetroColumnComponent,
    CursorCanvasComponent,
    FacilitatorToolbarComponent,
    AddCardModalComponent,
    AddColumnModalComponent
  ],
  template: `
    <div class="relative w-screen h-screen flex flex-col overflow-hidden canvas-grid">
      <!-- Live SVG Cursor Layer (Real Remote Cursors Only) -->
      <app-cursor-canvas></app-cursor-canvas>

      <!-- Board Navigation & Presence Header -->
      <app-board-header></app-board-header>

      <app-board-insights></app-board-insights>

      <!-- Main Columns Scroll Canvas -->
      <main class="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-8 flex items-stretch gap-5 pb-28">
        @if (boardState.isLoading()) {
          <div class="m-auto flex flex-col items-center gap-3 text-muted" role="status" aria-live="polite">
            <span class="w-9 h-9 rounded-full border-4 border-white/10 border-t-violet animate-spin"></span>
            <span class="text-sm font-medium">Loading board…</span>
          </div>
        }
        @for (column of boardState.columns(); track column.id) {
          <app-retro-column
            [column]="column"
            [connectedColumnIds]="connectedColumnIds()"
            (addCardRequested)="openAddCard($event)">
          </app-retro-column>
        }
      </main>

      <!-- Facilitator Floating Controls -->
      @if (boardState.isFacilitator()) {
        <app-facilitator-toolbar
          (openAddColumn)="isAddColumnModalOpen.set(true)">
        </app-facilitator-toolbar>
      }

      <!-- Modals -->
      @if (isAddCardModalOpen()) {
        <app-add-card-modal
          [columns]="boardState.columns()"
          [initialColumnId]="activeColumnId()"
          (close)="isAddCardModalOpen.set(false)">
        </app-add-card-modal>
      }

      @if (isAddColumnModalOpen()) {
        <app-add-column-modal
          (close)="isAddColumnModalOpen.set(false)">
        </app-add-column-modal>
      }
    </div>
  `
})
export class BoardComponent implements OnInit, OnDestroy {
  public boardState = inject(BoardStateService);
  public presenceService = inject(RealtimePresenceService);
  public authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  public isAddCardModalOpen = signal<boolean>(false);
  public isAddColumnModalOpen = signal<boolean>(false);
  public activeColumnId = signal<string>('');

  public connectedColumnIds = computed(() => {
    return this.boardState.columns().map(c => c.id);
  });

  ngOnInit(): void {
    const boardId = this.route.snapshot.paramMap.get('id') || 'demo-board';
    const userParam = this.route.snapshot.queryParamMap.get('user');
    const uidParam = this.route.snapshot.queryParamMap.get('uid');

    let user = this.authService.currentUser();
    if (userParam || uidParam || !user) {
      if (userParam || uidParam) {
        const found = PRESET_COLLABORATORS.find(p => p.name.toLowerCase() === userParam?.toLowerCase());
        const role = found ? found.role : 'Team Member';
        const color = found ? found.color : '#ec4899';
        user = this.authService.createPersona(userParam || 'Maya Lin', role, color, uidParam || undefined);
      } else {
        user = this.authService.signInAsDemoUser('Alex Rivera');
      }
    }

    this.boardState.loadBoard(boardId);
    this.presenceService.initChannel(boardId, {
      id: user.id,
      name: user.name,
      color: user.color,
      role: user.role,
      avatar_url: user.avatar_url
    }, user.isDemo);
  }

  ngOnDestroy(): void {
    this.presenceService.leave();
  }

  public openAddCard(columnId: string): void {
    this.activeColumnId.set(columnId);
    this.isAddCardModalOpen.set(true);
  }
}
