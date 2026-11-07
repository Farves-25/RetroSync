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
  role?: string;
  isDemo?: boolean;
}

export const PRESET_COLLABORATORS = [
  { name: 'Alex Rivera', role: 'Staff Eng / Host', color: '#6366f1' },
  { name: 'Maya Lin', role: 'UX Designer', color: '#ec4899' },
  { name: 'Sam Chen', role: 'Fullstack Dev', color: '#10b981' },
  { name: 'Jordan Lee', role: 'Product Manager', color: '#f59e0b' }
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

  private getStoredUser(): AppUser | null {
    const sessionRaw = sessionStorage.getItem('RETROSYNC_TAB_USER');
    if (sessionRaw) {
      try {
        return JSON.parse(sessionRaw);
      } catch {
        // continue
      }
    }

    const localRaw = localStorage.getItem('RETROSYNC_USER');
    if (localRaw) {
      try {
        const parsed = JSON.parse(localRaw);
        sessionStorage.setItem('RETROSYNC_TAB_USER', JSON.stringify(parsed));
        return parsed;
      } catch {
        return null;
      }
    }

    return null;
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
      color: existing?.color || '#6366f1',
      avatar_url: user.user_metadata?.['avatar_url'],
      role: user.user_metadata?.['role'] || 'Engineer',
      isDemo: false
    };
    this.currentUser.set(appUser);
    sessionStorage.setItem('RETROSYNC_TAB_USER', JSON.stringify(appUser));
    localStorage.setItem('RETROSYNC_USER', JSON.stringify(appUser));
    return appUser;
  }

  public async signInWithEmail(email: string): Promise<{ error: Error | null }> {
    if (!this.supabase.isConfigured()) {
      return { error: new Error('Supabase is not configured. Please supply keys in Settings or login with Guest mode.') };
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

  public async signInWithPassword(email: string, password: string): Promise<{ error: Error | null }> {
    if (!this.supabase.isConfigured()) {
      return { error: new Error('Supabase is not configured yet.') };
    }
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
      if (data.user) {
        this.setAppUserFromSupabase(data.user);
      }
      return { error };
    } catch (err: unknown) {
      return { error: err as Error };
    }
  }

  public async signUpWithPassword(email: string, password: string, name: string): Promise<{ error: Error | null }> {
    if (!this.supabase.isConfigured()) {
      return { error: new Error('Supabase is not configured yet.') };
    }
    try {
      const { data, error } = await this.supabase.client.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      if (data.user) {
        this.setAppUserFromSupabase(data.user);
      }
      return { error };
    } catch (err: unknown) {
      return { error: err as Error };
    }
  }

  public signInAsDemoUser(customName?: string): AppUser {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const personaIndex = Math.floor(Math.random() * PRESET_COLLABORATORS.length);
    const persona = PRESET_COLLABORATORS[personaIndex];

    const chosenName = customName?.trim() || persona.name;
    const chosenColor = persona.color;

    const demoUser: AppUser = {
      id: 'user-' + randomSuffix,
      email: `${chosenName.toLowerCase().replace(/[^a-z]/g, '')}@retrosync.demo`,
      name: chosenName,
      color: chosenColor,
      role: persona.role,
      isDemo: true
    };

    this.currentUser.set(demoUser);
    sessionStorage.setItem('RETROSYNC_TAB_USER', JSON.stringify(demoUser));
    return demoUser;
  }

  public switchPersona(name: string, role: string, color: string): AppUser {
    const existing = this.currentUser();
    const updated: AppUser = {
      id: existing?.id || ('user-' + Math.random().toString(36).substring(2, 7)),
      email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@retrosync.demo`,
      name,
      role,
      color,
      isDemo: existing?.isDemo ?? true
    };
    this.currentUser.set(updated);
    sessionStorage.setItem('RETROSYNC_TAB_USER', JSON.stringify(updated));
    return updated;
  }

  public updateUserProfile(name: string, role: string, color: string): void {
    this.switchPersona(name, role, color);
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
    sessionStorage.removeItem('RETROSYNC_TAB_USER');
    localStorage.removeItem('RETROSYNC_USER');
    this.router.navigate(['/auth/login']);
  }
}
