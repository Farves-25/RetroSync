import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CursorState } from '../models/board.model';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  avatar_url?: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimePresenceService {
  private supabase = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;
  private simInterval: ReturnType<typeof setInterval> | null = null;

  public readonly remoteCursors = signal<CursorState[]>([]);
  public readonly onlineUsers = signal<PresenceUser[]>([]);

  public initChannel(
    boardId: string,
    currentUser: { id: string; name: string; color: string; avatar_url?: string },
    isDemo = false
  ): void {
    this.leave();

    if (this.supabase.isConfigured() && !isDemo) {
      this.initSupabasePresence(boardId, currentUser);
    } else {
      this.initSimulatedCollaborators(currentUser);
    }
  }

  private initSupabasePresence(
    boardId: string,
    currentUser: { id: string; name: string; color: string; avatar_url?: string }
  ): void {
    try {
      this.channel = this.supabase.client.channel(`board:${boardId}`, {
        config: { presence: { key: currentUser.id } }
      });

      this.channel
        .on('presence', { event: 'sync' }, () => {
          if (!this.channel) return;
          const state = this.channel.presenceState();
          const cursors: CursorState[] = [];
          const users: PresenceUser[] = [
            {
              id: currentUser.id,
              name: `${currentUser.name} (You)`,
              color: currentUser.color,
              avatar_url: currentUser.avatar_url,
              role: 'Host'
            }
          ];

          Object.keys(state).forEach((key) => {
            if (key !== currentUser.id) {
              const userState = state[key]?.[0] as unknown as (CursorState & { role?: string }) | undefined;
              if (userState) {
                if (userState.x !== undefined && userState.y !== undefined) {
                  cursors.push(userState);
                }
                users.push({
                  id: userState.user_id || key,
                  name: userState.user_name || 'Collaborator',
                  color: userState.color || '#ec4899',
                  avatar_url: userState.avatar_url,
                  role: userState.role || 'Member'
                });
              }
            }
          });

          this.remoteCursors.set(cursors);
          this.onlineUsers.set(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && this.channel) {
            await this.channel.track({
              user_id: currentUser.id,
              user_name: currentUser.name,
              color: currentUser.color,
              avatar_url: currentUser.avatar_url,
              x: 0,
              y: 0,
              last_active: Date.now()
            });
          }
        });
    } catch (err) {
      console.warn('Realtime Supabase Presence error, falling back to simulated:', err);
      this.initSimulatedCollaborators(currentUser);
    }
  }

  private initSimulatedCollaborators(currentUser: { id: string; name: string; color: string; avatar_url?: string }): void {
    const mockUsers: PresenceUser[] = [
      { id: currentUser.id, name: `${currentUser.name} (You)`, color: currentUser.color, role: 'Host' },
      { id: 'sim-maya', name: 'Maya Lin (UX)', color: '#ec4899', role: 'Designer' },
      { id: 'sim-alex', name: 'Alex Rivera (Staff Eng)', color: '#06b6d4', role: 'Facilitator' },
      { id: 'sim-sam', name: 'Sam Chen (Fullstack)', color: '#10b981', role: 'Engineer' }
    ];
    this.onlineUsers.set(mockUsers);

    // Initial simulated cursors
    let simCursors: CursorState[] = [
      {
        user_id: 'sim-maya',
        user_name: 'Maya Lin (UX)',
        color: '#ec4899',
        x: 420,
        y: 280,
        last_active: Date.now()
      },
      {
        user_id: 'sim-alex',
        user_name: 'Alex Rivera',
        color: '#06b6d4',
        x: 780,
        y: 340,
        last_active: Date.now()
      }
    ];
    this.remoteCursors.set(simCursors);

    // Smooth organic wandering for demo showcase
    this.simInterval = setInterval(() => {
      const now = Date.now();
      const t = now / 1000;
      simCursors = [
        {
          user_id: 'sim-maya',
          user_name: 'Maya Lin (UX)',
          color: '#ec4899',
          x: Math.max(120, Math.min(window.innerWidth - 180, 420 + Math.sin(t * 0.9) * 220 + Math.cos(t * 0.4) * 80)),
          y: Math.max(180, Math.min(window.innerHeight - 150, 320 + Math.cos(t * 1.1) * 160)),
          last_active: now
        },
        {
          user_id: 'sim-alex',
          user_name: 'Alex Rivera',
          color: '#06b6d4',
          x: Math.max(150, Math.min(window.innerWidth - 200, 720 + Math.cos(t * 0.7) * 280)),
          y: Math.max(200, Math.min(window.innerHeight - 160, 420 + Math.sin(t * 0.8) * 140)),
          last_active: now
        }
      ];
      this.remoteCursors.set(simCursors);
    }, 60);
  }

  public broadcastCursor(x: number, y: number): void {
    if (this.channel) {
      this.channel.track({ x, y, last_active: Date.now() });
    }
  }

  public leave(): void {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.remoteCursors.set([]);
    this.onlineUsers.set([]);
  }
}
