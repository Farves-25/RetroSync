import { Component, ElementRef, computed, inject, input, model, signal } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

let nextId = 0;

/** Accessible custom dropdown (combobox + listbox) with keyboard support. */
@Component({
  selector: 'app-select',
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)'
  },
  template: `
    <button
      type="button"
      role="combobox"
      class="field flex items-center justify-between gap-3 text-left cursor-pointer"
      [class.!border-violet]="open()"
      [attr.id]="uid + '-btn'"
      [attr.aria-label]="label()"
      aria-haspopup="listbox"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="uid + '-list'"
      [attr.aria-activedescendant]="open() ? uid + '-opt-' + activeIndex() : null"
      (click)="toggle()"
      (keydown)="onKeydown($event)">
      <span class="flex items-center gap-2.5 min-w-0">
        @if (selected()?.color; as c) {
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" [style.background-color]="c" [style.box-shadow]="'0 0 10px ' + c"></span>
        }
        <span class="truncate">{{ selected()?.label ?? placeholder() }}</span>
      </span>
      <svg class="w-4 h-4 text-muted flex-shrink-0 transition-transform duration-200" [class.rotate-180]="open()"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    @if (open()) {
      <ul
        role="listbox"
        [attr.id]="uid + '-list'"
        [attr.aria-labelledby]="uid + '-btn'"
        class="absolute left-0 right-0 top-full mt-2 z-50 max-h-56 overflow-y-auto p-1.5 rounded-2xl border border-line bg-white shadow-[0_20px_40px_-12px_rgba(21,23,46,.25)] animate-fade-in"
        style="box-shadow: 0 24px 60px -12px rgba(0,0,0,.9), 0 0 0 1px rgba(124,92,255,.15)">
        @for (opt of options(); track opt.value; let i = $index) {
          <li
            role="option"
            [attr.id]="uid + '-opt-' + i"
            [attr.aria-selected]="opt.value === value()"
            (click)="choose(opt)"
            (mouseenter)="activeIndex.set(i)"
            class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
            [class.bg-ink/10]="i === activeIndex()">
            <span class="flex items-center gap-2.5 min-w-0">
              @if (opt.color) {
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" [style.background-color]="opt.color"></span>
              }
              <span class="truncate" [class.font-semibold]="opt.value === value()">{{ opt.label }}</span>
            </span>
            @if (opt.value === value()) {
              <svg class="w-4 h-4 text-violet flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" d="M5 13l4 4L19 7" />
              </svg>
            }
          </li>
        }
      </ul>
    }
  `
})
export class SelectComponent {
  public options = input.required<SelectOption[]>();
  public value = model<string>('');
  public label = input<string>('Select');
  public placeholder = input<string>('Select…');

  protected readonly uid = `sel-${nextId++}`;
  protected open = signal(false);
  protected activeIndex = signal(0);
  protected selected = computed(() => this.options().find(o => o.value === this.value()) ?? null);

  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected toggle(): void {
    this.open() ? this.close() : this.openList();
  }

  private openList(): void {
    const i = this.options().findIndex(o => o.value === this.value());
    this.activeIndex.set(Math.max(i, 0));
    this.open.set(true);
  }

  private close(): void {
    this.open.set(false);
  }

  protected choose(opt: SelectOption): void {
    this.value.set(opt.value);
    this.close();
    this.host.nativeElement.querySelector('button')?.focus();
  }

  protected onKeydown(e: KeyboardEvent): void {
    const n = this.options().length;
    if (!n) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.open()) this.openList();
        else this.activeIndex.update(i => (i + 1) % n);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!this.open()) this.openList();
        else this.activeIndex.update(i => (i - 1 + n) % n);
        break;
      case 'Home':
        if (this.open()) { e.preventDefault(); this.activeIndex.set(0); }
        break;
      case 'End':
        if (this.open()) { e.preventDefault(); this.activeIndex.set(n - 1); }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this.open()) this.choose(this.options()[this.activeIndex()]);
        else this.openList();
        break;
      case 'Escape':
        if (this.open()) { e.preventDefault(); e.stopPropagation(); this.close(); }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  protected onDocumentClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.close();
  }
}
