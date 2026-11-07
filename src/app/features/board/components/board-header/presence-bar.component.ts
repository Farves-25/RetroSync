import { Component, inject } from '@angular/core';
import { RealtimePresenceService } from '../../../../core/services/realtime-presence.service';

@Component({
  selector: 'app-presence-bar',
  template: `
    <div class="flex items-center gap-2">
      <div class="flex items-center -space-x-2 overflow-hidden py-1">
        @for (user of presenceService.onlineUsers(); track user.id) {
          <div
            class="relative inline-flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-slate-900 text-xs font-bold text-white shadow-md cursor-pointer transition-transform hover:scale-110 hover:z-10"
            [style.background-color]="user.color"
            [title]="user.name + (user.role ? ' (' + user.role + ')' : '')">
            {{ user.name.slice(0, 2).toUpperCase() }}
            <span
              class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-1 ring-slate-900 bg-emerald-400"></span>
          </div>
        }
      </div>

      <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>{{ presenceService.onlineUsers().length }} Live</span>
      </div>
    </div>
  `
})
export class PresenceBarComponent {
  public presenceService = inject(RealtimePresenceService);
}

