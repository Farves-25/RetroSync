import { Component, inject } from '@angular/core';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { RealtimePresenceService } from '../../../../core/services/realtime-presence.service';

@Component({
  selector: 'app-presence-bar',
  template: `
    <div class="flex items-center gap-2">
      <div class="flex items-center -space-x-2 py-1">
        @for (user of presenceService.onlineUsers(); track user.id) {
          <div class="relative inline-flex items-center justify-center w-8 h-8 rounded-full border border-line text-[11px] font-bold text-white transition-transform hover:-translate-y-0.5 hover:z-10"
            [style.background-color]="user.color"
            [title]="user.name + (user.role ? ' (' + user.role + ')' : '') + (user.id === boardState.currentBoard()?.facilitator_id ? ' · Facilitator' : '')">
            <span class="drop-shadow-[0_1px_2px_rgba(0,0,0,.6)]">{{ user.name.slice(0, 2).toUpperCase() }}</span>
            @if (user.id === boardState.currentBoard()?.facilitator_id) {
              <span class="absolute -top-2 -right-1 text-xs" aria-label="Facilitator" role="img">👑</span>
            }
          </div>
        }
      </div>
      <span class="pill hidden sm:inline-flex !bg-mint">
        <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
        {{ presenceService.onlineUsers().length }} live
      </span>
    </div>
  `
})
export class PresenceBarComponent {
  public presenceService = inject(RealtimePresenceService);
  public boardState = inject(BoardStateService);
}

