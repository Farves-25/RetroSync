import { Component, inject, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { RealtimePresenceService } from '../../../../core/services/realtime-presence.service';

@Component({
  selector: 'app-cursor-canvas',
  template: `
    <div class="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      @for (cursor of presenceService.remoteCursors(); track cursor.user_id) {
        <div
          class="absolute top-0 left-0 transition-transform duration-75 ease-out will-change-transform flex items-start gap-1.5"
          [style.transform]="'translate3d(' + cursor.x + 'px, ' + cursor.y + 'px, 0)'">

          <!-- SVG Cursor Arrow -->
          <svg
            class="w-5 h-5 drop-shadow-md"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
              [style.fill]="cursor.color"
              stroke="#0f172a"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>

          <!-- User Name Tag -->
          <div
            class="px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-lg whitespace-nowrap select-none backdrop-blur-sm -mt-1 ml-1"
            [style.background-color]="cursor.color">
            {{ cursor.user_name }}
          </div>
        </div>
      }
    </div>
  `
})
export class CursorCanvasComponent implements OnInit, OnDestroy {
  public presenceService = inject(RealtimePresenceService);
  private mouseMoveSub: Subscription | null = null;

  ngOnInit(): void {
    // Audit mouse movements at 35ms (approx 28fps) to optimize network bandwidth while keeping cursor smooth
    this.mouseMoveSub = fromEvent<MouseEvent>(window, 'mousemove')
      .pipe(auditTime(35))
      .subscribe((e: MouseEvent) => {
        this.presenceService.broadcastCursor(e.clientX, e.clientY);
      });
  }

  ngOnDestroy(): void {
    if (this.mouseMoveSub) {
      this.mouseMoveSub.unsubscribe();
    }
  }
}

