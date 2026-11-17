import { Component, input, inject, signal } from '@angular/core';
import { Card } from '../../../../core/models/board.model';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component';

@Component({
  selector: 'app-retro-card',
  imports: [ConfirmModalComponent],
  template: `
    <article class="note group relative p-4" [style.--note]="color()">
      @if (isTop()) {
        <span class="absolute -top-3 right-3 pill !bg-lemon !py-0.5 !text-[11px] rotate-2">⭐ Top voted</span>
      }

      @if (isEditing()) {
        <div class="flex flex-col gap-2">
          <label class="sr-only" [attr.for]="'edit-' + card().id">Edit card</label>
          <textarea #editTextarea [id]="'edit-' + card().id" [value]="card().content"
            (keydown.enter)="$event.preventDefault(); saveEdit(editTextarea.value)" (keydown.escape)="isEditing.set(false)"
            rows="3" class="field !text-sm resize-none"></textarea>
          <div class="flex justify-end gap-2">
            <button type="button" (click)="isEditing.set(false)" class="btn btn-sm">Cancel</button>
            <button type="button" (click)="saveEdit(editTextarea.value)" class="btn btn-sm btn-dark">Save</button>
          </div>
        </div>
      } @else {
        <p class="text-[15px] leading-relaxed font-medium break-words transition-all duration-300"
          [style.filter]="shouldBlurContent() ? 'blur(7px)' : 'none'"
          [style.user-select]="shouldBlurContent() ? 'none' : 'text'"
          [attr.aria-hidden]="shouldBlurContent()">{{ card().content }}</p>
      }

      @if (shouldBlurContent()) {
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span class="pill !bg-lemon">🔒 Hidden in stealth mode</span>
        </div>
      }

      <div class="mt-3 pt-2.5 border-t border-dashed border-ink/10 flex items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-1.5 min-w-0 text-muted">
          <span class="w-6 h-6 flex-shrink-0 rounded-full border border-line flex items-center justify-center text-[10px] font-bold text-ink bg-ink/10" aria-hidden="true">
            {{ (card().author_name || 'U').charAt(0).toUpperCase() }}
          </span>
          <span class="truncate font-bold text-ink max-w-[80px]">{{ card().author_name || 'Collaborator' }}</span>
          <span aria-hidden="true">·</span>
          <span class="whitespace-nowrap">{{ ago() }}</span>
        </div>

        <div class="flex items-center gap-0.5">
          @if (canModify()) {
            <button type="button" (click)="$event.stopPropagation(); isEditing.set(true)"
              class="icon-btn !w-7 !h-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" title="Edit card" aria-label="Edit card">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button type="button" (click)="$event.stopPropagation(); isConfirmDeleteOpen.set(true)"
              class="icon-btn icon-btn-danger !w-7 !h-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" title="Delete card" aria-label="Delete card">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          }
          <button type="button" (click)="$event.stopPropagation(); vote()"
            class="pill ml-1 !py-0.5" [class.!bg-accent]="card().has_voted" [class.!text-white]="card().has_voted"
            [attr.aria-pressed]="!!card().has_voted"
            [attr.aria-label]="(card().has_voted ? 'Remove your vote. ' : 'Vote for this card. ') + (card().votes_count || 0) + ' votes'">
            <svg class="w-3.5 h-3.5" [class.fill-current]="card().has_voted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            <span class="tabular-nums">{{ card().votes_count || 0 }}</span>
          </button>
        </div>
      </div>

      @if (isConfirmDeleteOpen()) {
        <app-confirm-modal title="Delete card" message="Are you sure you want to delete this card? This can't be undone."
          confirmText="Delete card" cancelText="Keep card" [isDestructive]="true"
          (confirm)="confirmDeleteCard()" (cancel)="isConfirmDeleteOpen.set(false)"></app-confirm-modal>
      }
    </article>
  `
})
export class RetroCardComponent {
  public card = input.required<Card>();
  public isBlurred = input<boolean>(false);
  public isTop = input<boolean>(false);
  public color = input<string>('#ffe27a');

  public authorColor(): string {
    const name = this.card().author_name || 'U';
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${h} 70% 45%)`;
  }

  public ago(): string {
    const diff = Date.now() - new Date(this.card().created_at).getTime();
    if (isNaN(diff)) return '';
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  }

  private boardState = inject(BoardStateService);
  private authService = inject(AuthService);

  public isEditing = signal<boolean>(false);
  public isConfirmDeleteOpen = signal<boolean>(false);

  public shouldBlurContent(): boolean {
    if (!this.isBlurred()) return false;
    const currentUserId = this.authService.currentUser()?.id;
    return this.card().author_id !== currentUserId;
  }

  public canModify(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    return this.card().author_id === user.id || this.boardState.isFacilitator();
  }

  public vote(): void {
    this.boardState.toggleVote(this.card().id);
  }

  public confirmDeleteCard(): void {
    this.boardState.deleteCard(this.card().id);
    this.isConfirmDeleteOpen.set(false);
  }

  public saveEdit(newContent: string): void {
    if (newContent.trim()) {
      this.boardState.updateCardContent(this.card().id, newContent);
      this.isEditing.set(false);
    }
  }
}
