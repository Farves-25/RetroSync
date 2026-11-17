import { Component, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="fixed bottom-6 right-6 z-[70] flex flex-col gap-3 max-w-sm pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-center justify-between gap-3 pl-3 pr-2 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink animate-slide-in"
          style="box-shadow: 0 16px 40px -12px rgba(0,0,0,.8)"
          [class.bg-mint]="toast.type === 'success'"
          [class.bg-sky]="toast.type === 'info'"
          [class.bg-lemon]="toast.type === 'warning'"
          [class.bg-pink]="toast.type === 'error'"
          role="status"
          aria-live="polite">
          <span aria-hidden="true">{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'warning' ? '!' : 'i' }}</span>
          <span class="flex-1">{{ toast.message }}</span>
          <button type="button" (click)="toastService.dismiss(toast.id)" class="icon-btn !w-7 !h-7 text-lg" aria-label="Dismiss notification">&times;</button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  public toastService = inject(ToastService);
}

