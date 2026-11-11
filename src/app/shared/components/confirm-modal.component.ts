import { Component, input, output, HostListener } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  host: {
    '(keydown.escape)': 'cancel.emit()'
  },
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      (click)="cancel.emit()">

      <div
        class="w-full max-w-md glass-panel rounded-2xl shadow-2xl border border-slate-700/80 p-6 flex flex-col gap-4 text-slate-100"
        (click)="$event.stopPropagation()">

        <!-- Header with Icon -->
        <div class="flex items-start gap-3.5">
          @if (isDestructive()) {
            <div class="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-950/30">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          } @else {
            <div class="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-950/30">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          }

          <div class="flex-1">
            <h3 class="text-base font-bold text-white tracking-tight">
              {{ title() }}
            </h3>
            <p class="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {{ message() }}
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80 mt-1">
          <button
            type="button"
            (click)="cancel.emit()"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            {{ cancelText() }}
          </button>

          <button
            type="button"
            (click)="confirm.emit()"
            class="px-4 py-2 text-xs font-semibold rounded-xl transition shadow-lg"
            [class.bg-rose-600]="isDestructive()"
            [class.hover:bg-rose-500]="isDestructive()"
            [class.text-white]="isDestructive()"
            [class.shadow-rose-600/30]="isDestructive()"
            [class.bg-indigo-600]="!isDestructive()"
            [class.hover:bg-indigo-500]="!isDestructive()"
            [class.text-white]="!isDestructive()">
            {{ confirmText() }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmModalComponent {
  public title = input<string>('Confirm Action');
  public message = input<string>('Are you sure you want to proceed?');
  public confirmText = input<string>('Delete');
  public cancelText = input<string>('Cancel');
  public isDestructive = input<boolean>(true);

  public confirm = output<void>();
  public cancel = output<void>();
}

