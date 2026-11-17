import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { BoardViewService, SortMode } from '../../board-view.service';

@Component({
  selector: 'app-board-insights',
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <section aria-label="Board overview and filters" class="relative z-40 px-4 sm:px-8 pt-4 flex flex-wrap items-center gap-2.5 select-none">
      <dl class="flex items-center gap-2 m-0">
        <div class="stat"><dt>Cards</dt><dd class="m-0"><b class="tabular-nums">{{ view.stats().cards }}</b></dd></div>
        <div class="stat"><dt>Votes</dt><dd class="m-0"><b class="tabular-nums">{{ view.stats().votes }}</b></dd></div>
        <div class="stat"><dt>People</dt><dd class="m-0"><b class="tabular-nums">{{ view.stats().contributors }}</b></dd></div>
      </dl>

      <div class="flex-1"></div>

      <div class="relative">
        <label for="card-search" class="sr-only">Search cards</label>
        <svg class="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input #search id="card-search" type="search" autocomplete="off" [value]="view.query()" (input)="view.query.set(search.value)"
          placeholder="Search cards   /" class="field !w-56 sm:!w-64 !pl-9 !py-2 !text-xs">
      </div>

      <div role="group" aria-label="Sort cards" class="flex items-center gap-1">
        @for (opt of sortOptions; track opt.value) {
          <button type="button" (click)="view.sort.set(opt.value)" [attr.aria-pressed]="view.sort() === opt.value"
            class="pill" [class.pill-on]="view.sort() === opt.value">{{ opt.label }}</button>
        }
      </div>

      <button type="button" (click)="view.onlyMine.set(!view.onlyMine())" [attr.aria-pressed]="view.onlyMine()" class="pill" [class.pill-on]="view.onlyMine()">My cards</button>
      <button type="button" (click)="view.onlyVoted.set(!view.onlyVoted())" [attr.aria-pressed]="view.onlyVoted()" class="pill" [class.pill-on]="view.onlyVoted()">I voted</button>

      @if (view.isCustomView()) {
        <button type="button" (click)="view.reset()" class="text-xs font-bold text-accent underline underline-offset-2">Clear</button>
      }
    </section>
  `
})
export class BoardInsightsComponent {
  public view = inject(BoardViewService);
  private searchEl = viewChild.required<ElementRef<HTMLInputElement>>('search');

  public sortOptions: { value: SortMode; label: string }[] = [
    { value: 'manual', label: 'Manual' },
    { value: 'votes', label: 'Top voted' },
    { value: 'newest', label: 'Newest' }
  ];

  public onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.searchEl().nativeElement.focus();
    }
  }
}
