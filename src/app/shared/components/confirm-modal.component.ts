import { Component, input, output, inject, ElementRef, DestroyRef, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  host: {
    '(keydown.escape)': 'cancel.emit()'
  },
  template: `
    <div class="modal-backdrop select-none" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" (click)="cancel.emit()">
      <div class="modal !max-w-md" (click)="$event.stopPropagation()">
        <div class="flex items-start gap-4">
          <div class="w-11 h-11 flex-shrink-0 rounded-xl border border-line flex items-center justify-center text-xl"
               [class.bg-pink]="isDestructive()" [class.bg-sky]="!isDestructive()" aria-hidden="true">
            {{ isDestructive() ? '🗑' : '?' }}
          </div>
          <div class="flex-1">
            <h3 id="confirm-title" class="text-lg font-bold">{{ title() }}</h3>
            <p class="text-sm text-muted mt-1 leading-relaxed">{{ message() }}</p>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 pt-1">
          <button type="button" (click)="cancel.emit()" class="btn">{{ cancelText() }}</button>
          <button type="button" (click)="confirm.emit()" class="btn" [class.btn-danger]="isDestructive()" [class.btn-primary]="!isDestructive()">{{ confirmText() }}</button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmModalComponent {
  constructor() {
    // Render at <body> level so transformed / clipped ancestors (cards, columns)
    // can't trap or cut off the fixed-position dialog.
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => document.body.appendChild(el));
    inject(DestroyRef).onDestroy(() => el.remove());
  }

  public title = input<string>('Confirm Action');
  public message = input<string>('Are you sure you want to proceed?');
  public confirmText = input<string>('Delete');
  public cancelText = input<string>('Cancel');
  public isDestructive = input<boolean>(true);

  public confirm = output<void>();
  public cancel = output<void>();
}

