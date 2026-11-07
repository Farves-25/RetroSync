import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { SoundService } from '../../shared/services/sound.service';
import { Board, Column, Card } from '../models/board.model';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface BoardListItem {
  id: string;
  title: string;
  description?: string;
  columnCount: number;
  cardCount: number;
  facilitator: string;
  facilitator_id: string;
  date: string;
  created_at: string;
  status: 'active' | 'completed';
}

export type RetroTemplate = 'classic' | 'madsadglad' | 'startstop' | '4ls' | 'blank';

const TEMPLATES: Record<RetroTemplate, Array<{ title: string; color: string }>> = {
  classic: [
    { title: 'What Went Well 🎉', color: '#10b981' },
    { title: 'What Could Be Better 🛠️', color: '#f59e0b' },
    { title: 'Action Items 🚀', color: '#6366f1' },
    { title: 'Kudos & Props 💖', color: '#ec4899' }
  ],
  madsadglad: [
    { title: 'Glad 😊', color: '#10b981' },
    { title: 'Mad 😡', color: '#ef4444' },
    { title: 'Sad 😢', color: '#3b82f6' },
    { title: 'Action Items 🚀', color: '#6366f1' }
  ],
  startstop: [
    { title: 'Start Doing 🟢', color: '#10b981' },
    { title: 'Stop Doing 🔴', color: '#ef4444' },
    { title: 'Continue Doing 🟡', color: '#f59e0b' },
    { title: 'New Ideas 💡', color: '#8b5cf6' }
  ],
  '4ls': [
    { title: 'Liked 👍', color: '#10b981' },
    { title: 'Learned 🧠', color: '#06b6d4' },
    { title: 'Lacked ⚠️', color: '#f59e0b' },
    { title: 'Longed For 🌟', color: '#ec4899' }
  ],
  blank: [
    { title: 'Feedback Column 📝', color: '#6366f1' }
  ]
};

@Injectable({ providedIn: 'root' })
export class BoardStateService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);
  private soundService = inject(SoundService);

  public readonly currentBoard = signal<Board | null>(null);
  public readonly columns = signal<Column[]>([]);
  public readonly cards = signal<Card[]>([]);
  public readonly userVotedCardIds = signal<Set<string>>(new Set());
  public readonly isBlurred = computed(() => this.currentBoard()?.is_blurred ?? false);
  public readonly isFacilitator = computed(() => {
    const user = this.authService.currentUser();
    const board = this.currentBoard();
    if (!user || !board) return true;
    return user.id === board.facilitator_id || !!user.isDemo;
  });

  // Active real-time countdown display
  public readonly timerRemainingDisplay = signal<string>('--:--');
  public readonly isTimerRunning = signal<boolean>(false);

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
  private boardBroadcastChannel: BroadcastChannel | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private hasPlayedTimerChime = false;

  constructor() {
    this.initTimerTicker();
  }

  // --- Real-time Active Countdown Timer ---
  private initTimerTicker(): void {
    if (typeof window === 'undefined') return;

    this.timerInterval = setInterval(() => {
      const board = this.currentBoard();
      if (!board || !board.timer_ends_at) {
        this.timerRemainingDisplay.set('--:--');
        this.isTimerRunning.set(false);
        this.hasPlayedTimerChime = false;
        return;
      }

      const diff = new Date(board.timer_ends_at).getTime() - Date.now();
      if (diff <= 0) {
        this.timerRemainingDisplay.set("00:00 (Time's Up!)");
        this.isTimerRunning.set(false);

        if (!this.hasPlayedTimerChime) {
          this.hasPlayedTimerChime = true;
          this.soundService.playTimerFinishChime();
        }
      } else {
        this.isTimerRunning.set(true);
        this.hasPlayedTimerChime = false;
        const totalSeconds = Math.floor(diff / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        this.timerRemainingDisplay.set(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }
    }, 1000);
  }

  // --- Board Listing & Management ---

  public async getBoardsList(): Promise<BoardListItem[]> {
    if (this.supabase.isConfigured()) {
      try {
        const { data: boards, error } = await this.supabase.client
          .from('boards')
          .select('id, title, description, facilitator_id, created_at')
          .order('created_at', { ascending: false });

        if (!error && boards && boards.length > 0) {
          const list: BoardListItem[] = [];
          for (const b of boards) {
            const [cCount, kCount] = await Promise.all([
              this.supabase.client.from('columns').select('id', { count: 'exact', head: true }).eq('board_id', b.id),
              this.supabase.client.from('cards').select('id', { count: 'exact', head: true }).eq('board_id', b.id)
            ]);
            list.push({
              id: b.id,
              title: b.title,
              description: b.description,
              columnCount: cCount.count || 0,
              cardCount: kCount.count || 0,
              facilitator: 'Host',
              facilitator_id: b.facilitator_id,
              date: new Date(b.created_at).toLocaleDateString(),
              created_at: b.created_at,
              status: 'active'
            });
          }
          return list;
        }
      } catch (err) {
        console.warn('Error fetching boards from Supabase:', err);
      }
    }

    // Local / Persistent Storage
    const registryRaw = localStorage.getItem('RETROSYNC_BOARD_REGISTRY');
    let registry: string[] = registryRaw ? JSON.parse(registryRaw) : ['sprint-42'];
    if (!registry.includes('sprint-42')) registry.unshift('sprint-42');

    const result: BoardListItem[] = [];
    for (const bId of registry) {
      const dataRaw = localStorage.getItem(`RETROSYNC_BOARD_${bId}`);
      if (dataRaw) {
        try {
          const parsed = JSON.parse(dataRaw);
          result.push({
            id: parsed.board.id,
            title: parsed.board.title,
            description: parsed.board.description,
            columnCount: (parsed.columns || []).length,
            cardCount: (parsed.cards || []).length,
            facilitator: parsed.board.facilitator_name || 'Alex Rivera',
            facilitator_id: parsed.board.facilitator_id,
            date: new Date(parsed.board.created_at).toLocaleDateString(),
            created_at: parsed.board.created_at,
            status: 'active'
          });
        } catch {
          // continue
        }
      } else if (bId === 'sprint-42') {
        result.push({
          id: 'sprint-42',
          title: 'Sprint 42 Retrospective — The Velocity Leap',
          description: 'Reviewing our Q4 architecture goals, cross-team velocity, and DX enhancements.',
          columnCount: 4,
          cardCount: 6,
          facilitator: 'Alex Rivera',
          facilitator_id: 'host',
          date: new Date().toLocaleDateString(),
          created_at: new Date().toISOString(),
          status: 'active'
        });
      }
    }

    return result;
  }

  public async createBoard(title: string, description: string, template: RetroTemplate = 'classic'): Promise<string> {
    const user = this.authService.currentUser();
    const boardId = 'board-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const newBoard: Board & { facilitator_name?: string } = {
      id: boardId,
      title: title.trim(),
      description: description.trim(),
      facilitator_id: user?.id || 'host',
      facilitator_name: user?.name || 'Facilitator',
      is_blurred: false,
      timer_ends_at: null,
      created_at: now
    };

    const templateColumns = TEMPLATES[template] || TEMPLATES.classic;
    const initialColumns: Column[] = templateColumns.map((col, index) => ({
      id: `col-${boardId}-${index}`,
      board_id: boardId,
      title: col.title,
      position: index,
      color_hex: col.color,
      created_at: now
    }));

    // 1. Supabase persistence if connected
    if (this.supabase.isConfigured()) {
      try {
        await this.supabase.client.from('boards').insert({
          id: newBoard.id,
          title: newBoard.title,
          description: newBoard.description,
          facilitator_id: newBoard.facilitator_id,
          is_blurred: false
        });
        await this.supabase.client.from('columns').insert(
          initialColumns.map(c => ({
            id: c.id,
            board_id: c.board_id,
            title: c.title,
            position: c.position,
            color_hex: c.color_hex
          }))
        );
      } catch (err) {
        console.warn('Failed to insert board into Supabase:', err);
      }
    }

    // 2. Persistent storage registry
    localStorage.setItem(`RETROSYNC_BOARD_${boardId}`, JSON.stringify({
      board: newBoard,
      columns: initialColumns,
      cards: []
    }));

    const regRaw = localStorage.getItem('RETROSYNC_BOARD_REGISTRY');
    const registry: string[] = regRaw ? JSON.parse(regRaw) : [];
    if (!registry.includes(boardId)) {
      registry.unshift(boardId);
      localStorage.setItem('RETROSYNC_BOARD_REGISTRY', JSON.stringify(registry));
    }

    return boardId;
  }

  public async deleteBoard(boardId: string): Promise<void> {
    if (this.supabase.isConfigured()) {
      try {
        await this.supabase.client.from('boards').delete().eq('id', boardId);
      } catch (err) {
        console.warn('Error deleting board from Supabase:', err);
      }
    }

    localStorage.removeItem(`RETROSYNC_BOARD_${boardId}`);
    const regRaw = localStorage.getItem('RETROSYNC_BOARD_REGISTRY');
    if (regRaw) {
      try {
        const registry: string[] = JSON.parse(regRaw);
        const filtered = registry.filter(id => id !== boardId);
        localStorage.setItem('RETROSYNC_BOARD_REGISTRY', JSON.stringify(filtered));
      } catch {
        // continue
      }
    }
  }

  // --- Active Board Loading & Realtime Subscription ---

  public async loadBoard(boardId: string): Promise<void> {
    this.initBoardBroadcast(boardId);

    if (this.supabase.isConfigured()) {
      try {
        const { data: boardData, error } = await this.supabase.client
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .single();

        if (!error && boardData) {
          this.currentBoard.set(boardData);

          const [colsRes, cardsRes, votesRes] = await Promise.all([
            this.supabase.client.from('columns').select('*').eq('board_id', boardId).order('position'),
            this.supabase.client.from('cards').select('*').eq('board_id', boardId).order('position'),
            this.supabase.client.from('votes').select('*').eq('board_id', boardId)
          ]);

          const user = this.authService.currentUser();
          const votedIds = new Set<string>();
          const voteCounts = new Map<string, number>();

          if (votesRes.data) {
            votesRes.data.forEach((v: { card_id: string; user_id: string }) => {
              voteCounts.set(v.card_id, (voteCounts.get(v.card_id) || 0) + 1);
              if (v.user_id === user?.id) votedIds.add(v.card_id);
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
          return;
        }
      } catch (err) {
        console.warn('Supabase board load error, using persistent store:', err);
      }
    }

    // Load from local persistent storage
    this.loadFromPersistentStorage(boardId);
  }

  private loadFromPersistentStorage(boardId: string): void {
    const saved = localStorage.getItem(`RETROSYNC_BOARD_${boardId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.currentBoard.set(parsed.board);
        this.columns.set(parsed.columns || []);
        this.cards.set(parsed.cards || []);
        return;
      } catch {
        // continue
      }
    }

    // Default RetroSync Initial Board
    const initialBoard: Board = {
      id: boardId,
      title: 'Sprint 42 Retrospective — The Velocity Leap',
      description: 'Reviewing our Q4 architecture goals, cross-team velocity, and DX enhancements.',
      facilitator_id: this.authService.currentUser()?.id || 'host',
      is_blurred: false,
      timer_ends_at: null,
      created_at: new Date().toISOString()
    };

    const initialColumns: Column[] = [
      { id: 'col-1', board_id: boardId, title: 'What Went Well 🎉', position: 0, color_hex: '#10b981', created_at: new Date().toISOString() },
      { id: 'col-2', board_id: boardId, title: 'What Could Be Better 🛠️', position: 1, color_hex: '#f59e0b', created_at: new Date().toISOString() },
      { id: 'col-3', board_id: boardId, title: 'Action Items 🚀', position: 2, color_hex: '#6366f1', created_at: new Date().toISOString() },
      { id: 'col-4', board_id: boardId, title: 'Kudos & Props 💖', position: 3, color_hex: '#ec4899', created_at: new Date().toISOString() }
    ];

    const initialCards: Card[] = [
      { id: 'card-1', column_id: 'col-1', board_id: boardId, author_id: 'user-1', author_name: 'Alex Rivera', content: 'Zero downtime deployment pipeline reached 99.98% reliability!', position: 0, created_at: new Date().toISOString(), votes_count: 5, has_voted: false },
      { id: 'card-2', column_id: 'col-1', board_id: boardId, author_id: 'user-2', author_name: 'Maya Lin', content: 'Design token migration finished smoothly ahead of sprint deadline.', position: 1, created_at: new Date().toISOString(), votes_count: 3, has_voted: true },
      { id: 'card-3', column_id: 'col-2', board_id: boardId, author_id: 'user-3', author_name: 'Sam Chen', content: 'PR reviews took longer than 48 hours for complex database migration scripts.', position: 0, created_at: new Date().toISOString(), votes_count: 7, has_voted: true },
      { id: 'card-4', column_id: 'col-2', board_id: boardId, author_id: 'user-1', author_name: 'Alex Rivera', content: 'Need clearer acceptance criteria for micro-frontend integration tests.', position: 1, created_at: new Date().toISOString(), votes_count: 2, has_voted: false },
      { id: 'card-5', column_id: 'col-3', board_id: boardId, author_id: 'user-2', author_name: 'Maya Lin', content: 'Schedule a weekly 30-min architecture design sync every Tuesday.', position: 0, created_at: new Date().toISOString(), votes_count: 4, has_voted: false },
      { id: 'card-6', column_id: 'col-4', board_id: boardId, author_id: 'user-3', author_name: 'Sam Chen', content: 'Huge kudos to the frontend team for delivering real-time WebSockets effortlessly! 🌟', position: 0, created_at: new Date().toISOString(), votes_count: 8, has_voted: true }
    ];

    this.currentBoard.set(initialBoard);
    this.columns.set(initialColumns);
    this.cards.set(initialCards);
    this.userVotedCardIds.set(new Set(['card-2', 'card-3', 'card-6']));
    this.saveToStorage();
  }

  private initBoardBroadcast(boardId: string): void {
    if (typeof BroadcastChannel === 'undefined') return;
    if (this.boardBroadcastChannel) this.boardBroadcastChannel.close();

    this.boardBroadcastChannel = new BroadcastChannel(`retrosync_board_state_${boardId}`);
    this.boardBroadcastChannel.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'board_sync') {
        if (data.board) this.currentBoard.set(data.board);
        if (data.columns) this.columns.set(data.columns);
        if (data.cards) {
          const userVoted = this.userVotedCardIds();
          const enriched = data.cards.map((c: Card) => ({
            ...c,
            has_voted: userVoted.has(c.id)
          }));
          this.cards.set(enriched);
        }
      }
    };
  }

  private saveToStorage(): void {
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

    // Broadcast update across open tabs
    if (this.boardBroadcastChannel) {
      this.boardBroadcastChannel.postMessage({
        type: 'board_sync',
        board: this.currentBoard(),
        columns: this.columns(),
        cards: this.cards()
      });
    }
  }

  private setupRealtimeSubscription(boardId: string): void {
    if (this.realtimeChannel) this.realtimeChannel.unsubscribe();

    this.realtimeChannel = this.supabase.client
      .channel(`board-db:${boardId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` }, (payload) => {
        if (payload.new) {
          this.currentBoard.set(payload.new as Board);
          this.saveToStorage();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns', filter: `board_id=eq.${boardId}` }, async () => {
        const { data } = await this.supabase.client.from('columns').select('*').eq('board_id', boardId).order('position');
        if (data) {
          this.columns.set(data);
          this.saveToStorage();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` }, async () => {
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
          this.saveToStorage();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `board_id=eq.${boardId}` }, async () => {
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
        this.saveToStorage();
      })
      .subscribe();
  }

  // --- Real-time Mutating Operations ---

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

    this.cards.update(cards => [...cards, newCard]);
    this.saveToStorage();
    this.soundService.playPopSound();

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
    this.saveToStorage();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('cards').delete().eq('id', cardId);
    }
  }

  public async updateCardContent(cardId: string, content: string): Promise<void> {
    this.cards.update(cards =>
      cards.map(c => (c.id === cardId ? { ...c, content: content.trim() } : c))
    );
    this.saveToStorage();

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
    this.saveToStorage();

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
    this.saveToStorage();
    this.soundService.playPopSound();

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
    this.saveToStorage();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('boards').update({ is_blurred: isBlurred }).eq('id', board.id);
    }
  }

  public async setTimer(minutes: number): Promise<void> {
    const board = this.currentBoard();
    if (!board) return;

    const endsAt = minutes > 0 ? new Date(Date.now() + minutes * 60 * 1000).toISOString() : null;
    this.hasPlayedTimerChime = false;
    this.currentBoard.update(b => b ? { ...b, timer_ends_at: endsAt } : null);
    this.saveToStorage();

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
    this.saveToStorage();

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

  public async updateColumn(columnId: string, title: string, colorHex: string): Promise<void> {
    this.columns.update(cols =>
      cols.map(c => c.id === columnId ? { ...c, title: title.trim(), color_hex: colorHex } : c)
    );
    this.saveToStorage();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('columns').update({ title: title.trim(), color_hex: colorHex }).eq('id', columnId);
    }
  }

  public async deleteColumn(columnId: string): Promise<void> {
    this.columns.update(cols => cols.filter(c => c.id !== columnId));
    this.cards.update(cards => cards.filter(c => c.column_id !== columnId));
    this.saveToStorage();

    if (this.supabase.isConfigured() && !this.authService.currentUser()?.isDemo) {
      await this.supabase.client.from('columns').delete().eq('id', columnId);
    }
  }

  // --- Exporting ---

  public exportMarkdownSummary(): string {
    const board = this.currentBoard();
    if (!board) return '';

    let md = `# Retrospective Summary: ${board.title}\n`;
    if (board.description) md += `*${board.description}*\n\n`;
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

  public exportJsonSummary(): string {
    const board = this.currentBoard();
    if (!board) return '{}';

    const data = {
      board,
      columns: this.columns(),
      cards: this.cards(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }
}
