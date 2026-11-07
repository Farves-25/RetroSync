import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Board, Column, Card } from '../models/board.model';
import { RealtimeChannel } from '@supabase/supabase-js';

const DEFAULT_DEMO_COLUMNS: Column[] = [
  { id: 'col-1', board_id: 'demo-board', title: 'What Went Well 🎉', position: 0, color_hex: '#10b981', created_at: new Date().toISOString() },
  { id: 'col-2', board_id: 'demo-board', title: 'What Could Be Better 🛠️', position: 1, color_hex: '#f59e0b', created_at: new Date().toISOString() },
  { id: 'col-3', board_id: 'demo-board', title: 'Action Items 🚀', position: 2, color_hex: '#6366f1', created_at: new Date().toISOString() },
  { id: 'col-4', board_id: 'demo-board', title: 'Kudos & Props 💖', position: 3, color_hex: '#ec4899', created_at: new Date().toISOString() }
];

const DEFAULT_DEMO_CARDS: Card[] = [
  { id: 'card-1', column_id: 'col-1', board_id: 'demo-board', author_id: 'demo-1', author_name: 'Alex Rivera', content: 'Zero downtime deployment pipeline reached 99.98% reliability!', position: 0, created_at: new Date().toISOString(), votes_count: 5, has_voted: false },
  { id: 'card-2', column_id: 'col-1', board_id: 'demo-board', author_id: 'demo-2', author_name: 'Maya Lin', content: 'Design token migration finished smoothly ahead of sprint deadline.', position: 1, created_at: new Date().toISOString(), votes_count: 3, has_voted: true },
  { id: 'card-3', column_id: 'col-2', board_id: 'demo-board', author_id: 'demo-3', author_name: 'Sam Chen', content: 'PR reviews took longer than 48 hours for complex database migration scripts.', position: 0, created_at: new Date().toISOString(), votes_count: 7, has_voted: true },
  { id: 'card-4', column_id: 'col-2', board_id: 'demo-board', author_id: 'demo-1', author_name: 'Alex Rivera', content: 'Need clearer acceptance criteria for micro-frontend integration tests.', position: 1, created_at: new Date().toISOString(), votes_count: 2, has_voted: false },
  { id: 'card-5', column_id: 'col-3', board_id: 'demo-board', author_id: 'demo-2', author_name: 'Maya Lin', content: 'Schedule a weekly 30-min architecture design sync every Tuesday.', position: 0, created_at: new Date().toISOString(), votes_count: 4, has_voted: false },
  { id: 'card-6', column_id: 'col-4', board_id: 'demo-board', author_id: 'demo-3', author_name: 'Sam Chen', content: 'Huge kudos to the frontend team for delivering real-time WebSockets effortlessly! 🌟', position: 0, created_at: new Date().toISOString(), votes_count: 8, has_voted: true }
];

@Injectable({ providedIn: 'root' })
export class BoardStateService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  public readonly currentBoard = signal<Board | null>(null);
  public readonly columns = signal<Column[]>([]);
  public readonly cards = signal<Card[]>([]);
  public readonly userVotedCardIds = signal<Set<string>>(new Set(['card-2', 'card-3', 'card-6']));
  public readonly isBlurred = computed(() => this.currentBoard()?.is_blurred ?? false);
  public readonly isFacilitator = computed(() => {
    const user = this.authService.currentUser();
    const board = this.currentBoard();
    if (!user || !board) return true;
    return user.id === board.facilitator_id || !!user.isDemo;
  });

  public readonly columnCardMap = computed(() => {
    const map = new Map<string, Card[]>();
    const allCards = this.cards();
    this.columns().forEach(col => {
      const colCards = allCards
        .filter(c => c.column_id === col.id)
        .sort((a, b) => a.position - b.position);
      map.set(col.id, colCards);
    });
    return map;
  });

  private realtimeChannel: RealtimeChannel | null = null;

  public async loadBoard(boardId: string): Promise<void> {
    const isConfigured = this.supabase.isConfigured();
    const user = this.authService.currentUser();

    if (!isConfigured || user?.isDemo || boardId === 'demo') {
      this.loadDemoBoard(boardId);
      return;
    }

    try {
      const { data: boardData, error: boardError } = await this.supabase.client
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError || !boardData) {
        this.loadDemoBoard(boardId);
        return;
      }

      this.currentBoard.set(boardData);

      const [colsRes, cardsRes, votesRes] = await Promise.all([
        this.supabase.client.from('columns').select('*').eq('board_id', boardId).order('position'),
        this.supabase.client.from('cards').select('*').eq('board_id', boardId).order('position'),
        this.supabase.client.from('votes').select('*').eq('board_id', boardId)
      ]);

      const votedIds = new Set<string>();
      const voteCounts = new Map<string, number>();

      if (votesRes.data) {
        votesRes.data.forEach((v: { card_id: string; user_id: string }) => {
          voteCounts.set(v.card_id, (voteCounts.get(v.card_id) || 0) + 1);
          if (v.user_id === user?.id) {
            votedIds.add(v.card_id);
          }
        });
      }
      this.userVotedCardIds.set(votedIds);

      this.columns.set(colsRes.data || []);
      const enrichedCards: Card[] = (cardsRes.data || []).map((c: Card) => ({
        ...c,
        votes_count: voteCounts.get(c.id) || 0,
        has_voted: votedIds.has(c.id)
      }));
      this.cards.set(enrichedCards);

      this.setupRealtimeSubscription(boardId);
    } catch (err) {
      console.warn('Error loading board from Supabase, fallback to demo:', err);
      this.loadDemoBoard(boardId);
    }
  }

  private loadDemoBoard(boardId: string): void {
    const saved = localStorage.getItem(`RETROSYNC_BOARD_${boardId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.currentBoard.set(parsed.board);
        this.columns.set(parsed.columns);
        this.cards.set(parsed.cards);
        return;
      } catch {
        // Fallback below
      }
    }

    const demoBoard: Board = {
      id: boardId || 'demo-board',
      title: 'Sprint 42 Retrospective — The Velocity Leap',
      facilitator_id: this.authService.currentUser()?.id || 'demo-facilitator',
      is_blurred: false,
      timer_ends_at: null,
      created_at: new Date().toISOString(),
      description: 'Reviewing our Q4 architecture goals, cross-team velocity, and DX enhancements.'
    };

    this.currentBoard.set(demoBoard);
    this.columns.set(DEFAULT_DEMO_COLUMNS);
    this.cards.set(DEFAULT_DEMO_CARDS);
    this.saveToLocalCache();
  }

  private saveToLocalCache(): void {
    const board = this.currentBoard();
    if (!board) return;
    localStorage.setItem(
      `RETROSYNC_BOARD_${board.id}`,
      JSON.stringify({
        board: this.currentBoard(),
        columns: this.columns(),
        cards: this.cards()
      })
    );
  }

  private setupRealtimeSubscription(boardId: string): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = this.supabase.client
      .channel(`board-db:${boardId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` }, (payload) => {
        if (payload.new) {
          this.currentBoard.set(payload.new as Board);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns', filter: `board_id=eq.${boardId}` }, () => {
        this.reloadColumns(boardId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` }, () => {
        this.reloadCards(boardId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `board_id=eq.${boardId}` }, () => {
        this.reloadVotes(boardId);
      })
      .subscribe();
  }

  private async reloadColumns(boardId: string): Promise<void> {
    const { data } = await this.supabase.client.from('columns').select('*').eq('board_id', boardId).order('position');
    if (data) this.columns.set(data);
  }

  private async reloadCards(boardId: string): Promise<void> {
    const { data } = await this.supabase.client.from('cards').select('*').eq('board_id', boardId).order('position');
    if (data) {
      const voted = this.userVotedCardIds();
      const updated = data.map((c: Card) => {
        const existing = this.cards().find(x => x.id === c.id);
        return {
          ...c,
          votes_count: existing?.votes_count ?? 0,
          has_voted: voted.has(c.id)
        };
      });
      this.cards.set(updated);
    }
  }

  private async reloadVotes(boardId: string): Promise<void> {
    const user = this.authService.currentUser();
    const { data } = await this.supabase.client.from('votes').select('*').eq('board_id', boardId);
    if (!data) return;

    const votedIds = new Set<string>();
    const counts = new Map<string, number>();

    data.forEach((v: { card_id: string; user_id: string }) => {
      counts.set(v.card_id, (counts.get(v.card_id) || 0) + 1);
      if (v.user_id === user?.id) votedIds.add(v.card_id);
    });

    this.userVotedCardIds.set(votedIds);
    this.cards.update(cards =>
      cards.map(c => ({
        ...c,
        votes_count: counts.get(c.id) || 0,
        has_voted: votedIds.has(c.id)
      }))
    );
  }

  // --- CRUD Operations with Optimistic Signals ---

  public async createCard(columnId: string, content: string): Promise<void> {
    const board = this.currentBoard();
    const user = this.authService.currentUser();
    if (!board || !user) return;

    const columnCards = this.cards().filter(c => c.column_id === columnId);
    const newCard: Card = {
      id: 'card-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      column_id: columnId,
      board_id: board.id,
      author_id: user.id,
      author_name: user.name,
      content: content.trim(),
      position: columnCards.length,
      created_at: new Date().toISOString(),
      votes_count: 0,
      has_voted: false
    };

    // Optimistic update
    this.cards.update(cards => [...cards, newCard]);
    this.saveToLocalCache();

    if (this.supabase.isConfigured() && !user.isDemo) {
      await this.supabase.client.from('cards').insert({
        id: newCard.id,
        column_id: columnId,
        board_id: board.id,
        author_id: user.id,
        content: newCard.content,
        position: newCard.position
      });
    }
  }

  public async deleteCard(cardId: string): Promise<void> {
    this.cards.update(cards => cards.filter(c => c.id !== cardId));
    this.saveToLocalCache();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('cards').delete().eq('id', cardId);
    }
  }

  public async updateCardContent(cardId: string, content: string): Promise<void> {
    this.cards.update(cards =>
      cards.map(c => (c.id === cardId ? { ...c, content: content.trim() } : c))
    );
    this.saveToLocalCache();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('cards').update({ content: content.trim() }).eq('id', cardId);
    }
  }

  public async reorderCard(cardId: string, targetColumnId: string, newPosition: number): Promise<void> {
    this.cards.update(cards => {
      const card = cards.find(c => c.id === cardId);
      if (!card) return cards;

      const otherCards = cards.filter(c => c.id !== cardId);
      const targetCards = otherCards.filter(c => c.column_id === targetColumnId);
      targetCards.splice(newPosition, 0, { ...card, column_id: targetColumnId, position: newPosition });

      const nonTargetCards = otherCards.filter(c => c.column_id !== targetColumnId);
      const reindexedTarget = targetCards.map((c, index) => ({ ...c, position: index }));

      return [...nonTargetCards, ...reindexedTarget];
    });
    this.saveToLocalCache();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('cards').update({
        column_id: targetColumnId,
        position: newPosition
      }).eq('id', cardId);
    }
  }

  public async toggleVote(cardId: string): Promise<void> {
    const user = this.authService.currentUser();
    const board = this.currentBoard();
    if (!user || !board) return;

    const hasVoted = this.userVotedCardIds().has(cardId);
    const updatedVotes = new Set(this.userVotedCardIds());

    if (hasVoted) {
      updatedVotes.delete(cardId);
    } else {
      updatedVotes.add(cardId);
    }
    this.userVotedCardIds.set(updatedVotes);

    this.cards.update(cards =>
      cards.map(c => {
        if (c.id === cardId) {
          const delta = hasVoted ? -1 : 1;
          return {
            ...c,
            votes_count: Math.max(0, (c.votes_count || 0) + delta),
            has_voted: !hasVoted
          };
        }
        return c;
      })
    );
    this.saveToLocalCache();

    if (this.supabase.isConfigured() && !user.isDemo) {
      if (hasVoted) {
        await this.supabase.client.from('votes').delete().match({ card_id: cardId, user_id: user.id });
      } else {
        await this.supabase.client.from('votes').insert({
          card_id: cardId,
          user_id: user.id,
          board_id: board.id
        });
      }
    }
  }

  public async toggleBlur(isBlurred: boolean): Promise<void> {
    const board = this.currentBoard();
    if (!board) return;

    this.currentBoard.update(b => b ? { ...b, is_blurred: isBlurred } : null);
    this.saveToLocalCache();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('boards').update({ is_blurred: isBlurred }).eq('id', board.id);
    }
  }

  public async setTimer(minutes: number): Promise<void> {
    const board = this.currentBoard();
    if (!board) return;

    const endsAt = minutes > 0 ? new Date(Date.now() + minutes * 60 * 1000).toISOString() : null;
    this.currentBoard.update(b => b ? { ...b, timer_ends_at: endsAt } : null);
    this.saveToLocalCache();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('boards').update({ timer_ends_at: endsAt }).eq('id', board.id);
    }
  }

  public async addColumn(title: string, colorHex: string): Promise<void> {
    const board = this.currentBoard();
    if (!board) return;

    const newCol: Column = {
      id: 'col-' + Date.now().toString(36),
      board_id: board.id,
      title: title.trim(),
      position: this.columns().length,
      color_hex: colorHex,
      created_at: new Date().toISOString()
    };

    this.columns.update(cols => [...cols, newCol]);
    this.saveToLocalCache();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('columns').insert({
        id: newCol.id,
        board_id: board.id,
        title: newCol.title,
        position: newCol.position,
        color_hex: newCol.color_hex
      });
    }
  }

  public exportMarkdownSummary(): string {
    const board = this.currentBoard();
    if (!board) return '';

    let md = `# Retrospective Summary: ${board.title}\n`;
    md += `*Generated by RetroSync on ${new Date().toLocaleDateString()}*\n\n`;

    this.columns().forEach(col => {
      const cards = this.columnCardMap().get(col.id) || [];
      md += `## ${col.title} (${cards.length})\n\n`;
      if (cards.length === 0) {
        md += `*No items logged.*\n\n`;
      } else {
        cards.forEach(c => {
          md += `- **[+${c.votes_count || 0} votes]** ${c.content} *(by ${c.author_name || 'Anonymous'})*\n`;
        });
        md += `\n`;
      }
    });

    return md;
  }
}

