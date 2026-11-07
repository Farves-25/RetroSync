import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BoardStateService } from '../../core/services/board-state.service';
import { RealtimePresenceService } from '../../core/services/realtime-presence.service';
import { AuthService } from '../../core/services/auth.service';
import { BoardHeaderComponent } from './components/board-header/board-header.component';
import { RetroColumnComponent } from './components/retro-column/retro-column.component';
import { CursorCanvasComponent } from './components/cursor-canvas/cursor-canvas.component';
import { FacilitatorToolbarComponent } from './components/facilitator-toolbar/facilitator-toolbar.component';
import { AddCardModalComponent } from './components/card-modal/add-card-modal.component';
import { AddColumnModalComponent } from './components/column-modal/add-column-modal.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';

@Component({
  selector: 'app-board',
  imports: [
    BoardHeaderComponent,
    RetroColumnComponent,
    CursorCanvasComponent,
    FacilitatorToolbarComponent,
    AddCardModalComponent,
    AddColumnModalComponent,
    SettingsModalComponent
  ],
  template: `
    <div class="relative w-screen h-screen flex flex-col overflow-hidden canvas-grid">
      <!-- Live SVG Cursor Layer -->
      <app-cursor-canvas></app-cursor-canvas>

      <!-- Board Navigation & Presence Header -->
      <app-board-header
        (openSettings)="isSettingsModalOpen.set(true)">
      </app-board-header>

      <!-- Main Columns Scroll Canvas -->
      <main class="flex-1 overflow-x-auto overflow-y-hidden p-6 md:p-8 flex items-start gap-6 pb-28">
        @for (column of boardState.columns(); track column.id) {
          <app-retro-column
            [column]="column"
            [connectedColumnIds]="connectedColumnIds()"
            (addCardRequested)="openAddCard($event)">
          </app-retro-column>
        }
      </main>

      <!-- Facilitator Floating Controls -->
      <app-facilitator-toolbar
        (openAddColumn)="isAddColumnModalOpen.set(true)">
      </app-facilitator-toolbar>

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

      @if (isSettingsModalOpen()) {
        <app-settings-modal
          (close)="isSettingsModalOpen.set(false)">
        </app-settings-modal>
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
  public isSettingsModalOpen = signal<boolean>(false);
  public activeColumnId = signal<string>('');

  public connectedColumnIds = computed(() => {
    return this.boardState.columns().map(c => c.id);
  });

  ngOnInit(): void {
    const boardId = this.route.snapshot.paramMap.get('id') || 'demo-board';
    const user = this.authService.currentUser() || this.authService.signInAsDemoUser('Alex Rivera');

    this.boardState.loadBoard(boardId);
    this.presenceService.initChannel(boardId, {
      id: user.id,
      name: user.name,
      color: user.color,
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

