import { Injectable, computed, inject, signal } from '@angular/core';
import { Card } from '../../core/models/board.model';
import { BoardStateService } from '../../core/services/board-state.service';
import { AuthService } from '../../core/services/auth.service';

export type SortMode = 'manual' | 'votes' | 'newest';

/** Per-session view preferences (search, sort, filters) layered over the shared board state. */
@Injectable({ providedIn: 'root' })
export class BoardViewService {
  private boardState = inject(BoardStateService);
  private authService = inject(AuthService);

  public readonly query = signal('');
  public readonly sort = signal<SortMode>('manual');
  public readonly onlyMine = signal(false);
  public readonly onlyVoted = signal(false);

  /** True when any view option changes card order/visibility; manual drag & drop is disabled then. */
  public readonly isCustomView = computed(
    () => !!this.query().trim() || this.sort() !== 'manual' || this.onlyMine() || this.onlyVoted()
  );

  public readonly filteredCardMap = computed(() => {
    const base = this.boardState.columnCardMap();
    if (!this.isCustomView()) return base;

    const q = this.query().trim().toLowerCase();
    const me = this.authService.currentUser()?.id;
    const sort = this.sort();
    const map = new Map<string, Card[]>();

    base.forEach((cards, colId) => {
      let list = cards.filter(c => {
        if (q && !(c.content.toLowerCase().includes(q) || (c.author_name ?? '').toLowerCase().includes(q))) return false;
        if (this.onlyMine() && c.author_id !== me) return false;
        if (this.onlyVoted() && !c.has_voted) return false;
        return true;
      });
      if (sort === 'votes') list = [...list].sort((a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0));
      else if (sort === 'newest') list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
      map.set(colId, list);
    });
    return map;
  });

  public readonly stats = computed(() => {
    const cards = this.boardState.cards();
    const votes = cards.reduce((n, c) => n + (c.votes_count ?? 0), 0);
    const contributors = new Set(cards.map(c => c.author_id)).size;
    let top: Card | null = null;
    for (const c of cards) {
      if ((c.votes_count ?? 0) > 0 && (!top || (c.votes_count ?? 0) > (top.votes_count ?? 0))) top = c;
    }
    return { cards: cards.length, votes, contributors, topCardId: top?.id ?? null };
  });

  public reset(): void {
    this.query.set('');
    this.sort.set('manual');
    this.onlyMine.set(false);
    this.onlyVoted.set(false);
  }
}
