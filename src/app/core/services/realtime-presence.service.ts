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

interface PeerState {
  user: PresenceUser;
  lastSeen: number;
}

@Injectable({ providedIn: 'root' })
export class RealtimePresenceService {
  private supabase = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private currentBoardId: string | null = null;
  private currentUser: PresenceUser | null = null;

  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // Active remote users indexed by ID
  private activePeers = new Map<string, PeerState>();

  public readonly remoteCursors = signal<CursorState[]>([]);
  public readonly onlineUsers = signal<PresenceUser[]>([]);

  public initChannel(
    boardId: string,
    currentUser: { id: string; name: string; color: string; avatar_url?: string; role?: string },
    isDemo = false
  ): void {
    this.leave();

    this.currentBoardId = boardId;
    this.currentUser = {
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
      avatar_url: currentUser.avatar_url,
      role: currentUser.role || 'Member'
    };

    // Initialize local tab user in the presence list
    this.onlineUsers.set([{ ...this.currentUser, name: `${this.currentUser.name} (You)` }]);

    // 1. Cross-tab communication via BroadcastChannel
    this.initBroadcastChannel(boardId);

    // 2. Cross-device communication via Supabase Realtime if configured
    if (this.supabase.isConfigured() && !isDemo) {
      this.initSupabasePresence(boardId, currentUser);
    }

    // 3. Setup periodic presence ping & cleanup of stale peers
    this.startHeartbeat();
  }

  private initBroadcastChannel(boardId: string): void {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
      this.broadcastChannel = new BroadcastChannel(`retrosync_presence_${boardId}`);

      this.broadcastChannel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || !this.currentUser || data.userId === this.currentUser.id) {
          return;
        }

        switch (data.type) {
          case 'cursor':
            this.handleRemoteCursor(data);
            break;
          case 'join':
            this.handlePeerPing(data.user);
            // Respond with our own presence so the newcomer knows we exist
            this.broadcastChannel?.postMessage({
              type: 'announce',
              userId: this.currentUser.id,
              user: this.currentUser
            });
            break;
          case 'announce':
          case 'ping':
            this.handlePeerPing(data.user);
            break;
          case 'leave':
            this.handlePeerLeave(data.userId);
            break;
        }
      };

      // Announce arrival to all other open tabs
      this.broadcastChannel.postMessage({
        type: 'join',
        userId: this.currentUser!.id,
        user: this.currentUser
      });

      // Handle tab closing
      window.addEventListener('beforeunload', this.onBeforeUnload);
    } catch (err) {
      console.warn('BroadcastChannel initialization error:', err);
    }
  }

  private onBeforeUnload = (): void => {
    if (this.broadcastChannel && this.currentUser) {
      this.broadcastChannel.postMessage({
        type: 'leave',
        userId: this.currentUser.id
      });
    }
  };

  private initSupabasePresence(
    boardId: string,
    currentUser: { id: string; name: string; color: string; avatar_url?: string; role?: string }
  ): void {
    try {
      this.channel = this.supabase.client.channel(`board:${boardId}`, {
        config: { presence: { key: currentUser.id } }
      });

      this.channel
        .on('presence', { event: 'sync' }, () => {
          if (!this.channel || !this.currentUser) return;
          const state = this.channel.presenceState();

          Object.keys(state).forEach((key) => {
            if (key !== this.currentUser?.id) {
              const userState = state[key]?.[0] as unknown as (CursorState & { role?: string }) | undefined;
              if (userState && userState.user_id) {
                this.handlePeerPing({
                  id: userState.user_id,
                  name: userState.user_name || 'Collaborator',
                  color: userState.color || '#ec4899',
                  avatar_url: userState.avatar_url,
                  role: userState.role || 'Member'
                });
                if (userState.x !== undefined && userState.y !== undefined) {
                  this.handleRemoteCursor({
                    userId: userState.user_id,
                    user: {
                      id: userState.user_id,
                      name: userState.user_name,
                      color: userState.color
                    },
                    x: userState.x,
                    y: userState.y
                  });
                }
              }
            }
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && this.channel && this.currentUser) {
            await this.channel.track({
              user_id: this.currentUser.id,
              user_name: this.currentUser.name,
              color: this.currentUser.color,
              avatar_url: this.currentUser.avatar_url,
              role: this.currentUser.role,
              x: 0,
              y: 0,
              last_active: Date.now()
            });
          }
        });
    } catch (err) {
      console.warn('Realtime Supabase Presence error:', err);
    }
  }

  private startHeartbeat(): void {
    // Ping every 1.5s to maintain presence across tabs
    this.pingInterval = setInterval(() => {
      if (this.broadcastChannel && this.currentUser) {
        this.broadcastChannel.postMessage({
          type: 'ping',
          userId: this.currentUser.id,
          user: this.currentUser
        });
      }
    }, 1500);

    // Check every second for disconnected peers (older than 4.5s)
    this.cleanupInterval = setInterval(() => {
      const threshold = Date.now() - 4500;
      let changed = false;

      this.activePeers.forEach((peer, userId) => {
        if (peer.lastSeen < threshold) {
          this.activePeers.delete(userId);
          changed = true;
        }
      });

      if (changed) {
        this.syncOnlineUsers();
        this.cleanupStaleCursors(threshold);
      }
    }, 1000);
  }

  private handlePeerPing(user: PresenceUser): void {
    if (!user || !user.id || (this.currentUser && user.id === this.currentUser.id)) {
      return;
    }
    const isNew = !this.activePeers.has(user.id);
    this.activePeers.set(user.id, { user, lastSeen: Date.now() });

    if (isNew) {
      this.syncOnlineUsers();
    }
  }

  private handlePeerLeave(userId: string): void {
    if (this.activePeers.has(userId)) {
      this.activePeers.delete(userId);
      this.syncOnlineUsers();
      this.remoteCursors.update(cursors => cursors.filter(c => c.user_id !== userId));
    }
  }

  private handleRemoteCursor(data: { userId: string; user: PresenceUser; x: number; y: number }): void {
    if (!this.currentUser || data.userId === this.currentUser.id) return;

    // Refresh peer in online users
    this.handlePeerPing(data.user);

    // Update cursor position in remoteCursors signal
    this.remoteCursors.update(cursors => {
      const idx = cursors.findIndex(c => c.user_id === data.userId);
      const updatedCursor: CursorState = {
        user_id: data.userId,
        user_name: data.user.name,
        color: data.user.color,
        avatar_url: data.user.avatar_url,
        x: data.x,
        y: data.y,
        last_active: Date.now()
      };

      if (idx >= 0) {
        const next = [...cursors];
        next[idx] = updatedCursor;
        return next;
      } else {
        return [...cursors, updatedCursor];
      }
    });
  }

  private cleanupStaleCursors(threshold: number): void {
    this.remoteCursors.update(cursors => cursors.filter(c => c.last_active >= threshold));
  }

  private syncOnlineUsers(): void {
    if (!this.currentUser) return;

    const list: PresenceUser[] = [
      { ...this.currentUser, name: `${this.currentUser.name} (You)` }
    ];

    this.activePeers.forEach(peer => {
      list.push(peer.user);
    });

    this.onlineUsers.set(list);
  }

  public broadcastCursor(x: number, y: number): void {
    if (!this.currentUser) return;

    // 1. Cross-tab BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'cursor',
        userId: this.currentUser.id,
        user: this.currentUser,
        x,
        y
      });
    }

    // 2. Supabase Realtime channel
    if (this.channel) {
      this.channel.track({
        user_id: this.currentUser.id,
        user_name: this.currentUser.name,
        color: this.currentUser.color,
        avatar_url: this.currentUser.avatar_url,
        role: this.currentUser.role,
        x,
        y,
        last_active: Date.now()
      });
    }
  }

  public leave(): void {
    window.removeEventListener('beforeunload', this.onBeforeUnload);

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.broadcastChannel && this.currentUser) {
      this.broadcastChannel.postMessage({
        type: 'leave',
        userId: this.currentUser.id
      });
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    this.activePeers.clear();
    this.remoteCursors.set([]);
    this.onlineUsers.set([]);
  }
}
