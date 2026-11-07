import { Component, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-md transition-all duration-300 animate-slide-in"
          [class.bg-emerald-950]="toast.type === 'success'"
          [class.border-emerald-500]="toast.type === 'success'"
          [class.text-emerald-100]="toast.type === 'success'"
          [class.bg-blue-950]="toast.type === 'info'"
          [class.border-blue-500]="toast.type === 'info'"
          [class.text-blue-100]="toast.type === 'info'"
          [class.bg-amber-950]="toast.type === 'warning'"
          [class.border-amber-500]="toast.type === 'warning'"
          [class.text-amber-100]="toast.type === 'warning'"
          [class.bg-rose-950]="toast.type === 'error'"
          [class.border-rose-500]="toast.type === 'error'"
          [class.text-rose-100]="toast.type === 'error'"
          role="status"
          aria-live="polite">
          <span>{{ toast.message }}</span>
          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            class="opacity-70 hover:opacity-100 p-1 transition-opacity text-base"
            aria-label="Dismiss notification">
            &times;
          </button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  public toastService = inject(ToastService);
}

