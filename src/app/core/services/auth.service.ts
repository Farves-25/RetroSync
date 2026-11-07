import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  color: string;
  avatar_url?: string;
  isDemo?: boolean;
}

const COLLABORATOR_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#14b8a6'  // Teal
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  public readonly currentUser = signal<AppUser | null>(this.getStoredUser());
  public readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    this.checkInitialSession();
  }

  private getRandomColor(): string {
    return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
  }

  private getStoredUser(): AppUser | null {
    const raw = localStorage.getItem('RETROSYNC_USER');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async checkInitialSession() {
    if (this.supabase.isConfigured()) {
      try {
        const { data } = await this.supabase.client.auth.getSession();
        if (data.session?.user) {
          this.setAppUserFromSupabase(data.session.user);
        }
      } catch (err) {
        console.warn('Session check error:', err);
      }
    }
  }

  private setAppUserFromSupabase(user: User): AppUser {
    const existing = this.currentUser();
    const appUser: AppUser = {
      id: user.id,
      email: user.email || 'developer@retrosync.io',
      name: user.user_metadata?.['name'] || user.email?.split('@')[0] || 'Team Member',
      color: existing?.color || this.getRandomColor(),
      avatar_url: user.user_metadata?.['avatar_url'],
      isDemo: false
    };
    this.currentUser.set(appUser);
    localStorage.setItem('RETROSYNC_USER', JSON.stringify(appUser));
    return appUser;
  }

  public async signInWithEmail(email: string): Promise<{ error: Error | null }> {
    if (!this.supabase.isConfigured()) {
      return { error: new Error('Supabase is not configured yet. Use Demo Mode or set keys.') };
    }
    try {
      const { error } = await this.supabase.client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      return { error };
    } catch (err: unknown) {
      return { error: err as Error };
    }
  }

  public signInAsDemoUser(customName?: string): AppUser {
    const name = customName?.trim() || `Facilitator (${Math.floor(100 + Math.random() * 900)})`;
    const demoUser: AppUser = {
      id: 'demo-user-' + Math.random().toString(36).substring(2, 9),
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@retrosync.demo`,
      name: name,
      color: this.getRandomColor(),
      isDemo: true
    };
    this.currentUser.set(demoUser);
    localStorage.setItem('RETROSYNC_USER', JSON.stringify(demoUser));
    return demoUser;
  }

  public async signOut(): Promise<void> {
    if (this.supabase.isConfigured() && !this.currentUser()?.isDemo) {
      try {
        await this.supabase.client.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    this.currentUser.set(null);
    localStorage.removeItem('RETROSYNC_USER');
    this.router.navigate(['/auth/login']);
  }
}

