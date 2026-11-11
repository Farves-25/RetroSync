import { Component, input, inject, signal } from '@angular/core';
import { Card } from '../../../../core/models/board.model';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component';

@Component({
  selector: 'app-retro-card',
  imports: [ConfirmModalComponent],
  template: `
    <div
      class="group relative rounded-xl p-4 transition-all duration-200 border shadow-lg glass-card hover:border-slate-600/80 hover:shadow-xl hover:-translate-y-0.5"
      [class.border-slate-800]="!card().has_voted"
      [class.border-pink-500/40]="card().has_voted"
      [class.bg-gradient-to-br]="card().has_voted"
      [class.from-slate-900/90]="card().has_voted"
      [class.to-pink-950/20]="card().has_voted">

      <!-- Card Content -->
      @if (isEditing()) {
        <div class="flex flex-col gap-2">
          <textarea
            #editTextarea
            [value]="card().content"
            (keydown.enter)="$event.preventDefault(); saveEdit(editTextarea.value)"
            (keydown.escape)="isEditing.set(false)"
            rows="3"
            class="w-full bg-slate-950/90 border border-indigo-500 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none">
          </textarea>
          <div class="flex justify-end gap-1.5">
            <button
              type="button"
              (click)="isEditing.set(false)"
              class="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
              Cancel
            </button>
            <button
              type="button"
              (click)="saveEdit(editTextarea.value)"
              class="px-2 py-1 text-[11px] rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
              Save
            </button>
          </div>
        </div>
      } @else {
        <p
          class="text-xs sm:text-sm text-slate-100 font-normal leading-relaxed break-words transition-all duration-300"
          [style.filter]="shouldBlurContent() ? 'blur(6px)' : 'none'"
          [style.user-select]="shouldBlurContent() ? 'none' : 'text'">
          {{ card().content }}
        </p>
      }

      @if (shouldBlurContent()) {
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span class="px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-[11px] font-medium text-amber-300 backdrop-blur-sm shadow-md">
            🔒 Hidden in Stealth Mode
          </span>
        </div>
      }

      <!-- Footer: Author & Actions -->
      <div class="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        <div class="flex items-center gap-1.5 text-slate-400">
          <div class="w-4 h-4 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-200">
            {{ (card().author_name || 'U').charAt(0).toUpperCase() }}
          </div>
          <span class="truncate max-w-[100px] font-medium">{{ card().author_name || 'Collaborator' }}</span>
        </div>

        <div class="flex items-center gap-1.5">
          <!-- Edit / Delete (shown on hover if author or facilitator) -->
          @if (canModify()) {
            <button
              type="button"
              (click)="$event.stopPropagation(); isEditing.set(true)"
              class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Edit card">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              type="button"
              (click)="$event.stopPropagation(); isConfirmDeleteOpen.set(true)"
              class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition"
              title="Delete card">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          }

          <!-- Live Voting Button -->
          <button
            type="button"
            (click)="$event.stopPropagation(); vote()"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all duration-150"
            [class.bg-pink-500/20]="card().has_voted"
            [class.border-pink-500/60]="card().has_voted"
            [class.text-pink-300]="card().has_voted"
            [class.bg-slate-800/80]="!card().has_voted"
            [class.border-slate-700/80]="!card().has_voted"
            [class.text-slate-400]="!card().has_voted"
            [class.hover:border-pink-500/40]="!card().has_voted"
            [class.hover:text-pink-300]="!card().has_voted"
            title="Vote for this card">
            <svg
              class="w-3 h-3 transition-transform"
              [class.scale-125]="card().has_voted"
              [class.fill-current]="card().has_voted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="font-bold font-mono text-[11px]">{{ card().votes_count || 0 }}</span>
          </button>
        </div>
      </div>

      <!-- Custom Confirmation Dialog for Card Deletion -->
      @if (isConfirmDeleteOpen()) {
        <app-confirm-modal
          title="Delete Card"
          message="Are you sure you want to delete this retrospective card? This action cannot be undone."
          confirmText="Delete Card"
          cancelText="Keep Card"
          [isDestructive]="true"
          (confirm)="confirmDeleteCard()"
          (cancel)="isConfirmDeleteOpen.set(false)">
        </app-confirm-modal>
      }
    </div>
  `
})
export class RetroCardComponent {
  public card = input.required<Card>();
  public isBlurred = input<boolean>(false);

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
