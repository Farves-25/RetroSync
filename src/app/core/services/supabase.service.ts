import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private clientInstance: SupabaseClient | null = null;
  public readonly isConfigured = signal<boolean>(false);

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const url = localStorage.getItem('RETROSYNC_SUPABASE_URL') || environment.supabaseUrl;
    const key = localStorage.getItem('RETROSYNC_SUPABASE_KEY') || environment.supabaseKey;

    if (url && key && url.startsWith('http')) {
      try {
        this.clientInstance = createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        this.isConfigured.set(true);
      } catch (err) {
        console.warn('Supabase initialization failed:', err);
        this.isConfigured.set(false);
      }
    } else {
      this.isConfigured.set(false);
    }
  }

  public get client(): SupabaseClient {
    if (!this.clientInstance) {
      const url = localStorage.getItem('RETROSYNC_SUPABASE_URL') || environment.supabaseUrl;
      const key = localStorage.getItem('RETROSYNC_SUPABASE_KEY') || environment.supabaseKey;
      if (url && key && url.startsWith('http')) {
        this.clientInstance = createClient(url, key);
        this.isConfigured.set(true);
        return this.clientInstance;
      }
      throw new Error('Supabase is not configured. Please supply your Supabase URL and Anon Key.');
    }
    return this.clientInstance;
  }

  public updateConfig(url: string, key: string): boolean {
    if (!url || !key) return false;
    try {
      this.clientInstance = createClient(url, key);
      localStorage.setItem('RETROSYNC_SUPABASE_URL', url);
      localStorage.setItem('RETROSYNC_SUPABASE_KEY', key);
      this.isConfigured.set(true);
      return true;
    } catch {
      return false;
    }
  }
}

