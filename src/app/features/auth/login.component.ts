import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="min-h-screen w-screen flex items-center justify-center p-6 canvas-grid relative overflow-hidden select-none">
      <!-- Background glowing decorative orbs -->
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-700/80 shadow-2xl relative z-10 flex flex-col gap-6 backdrop-blur-2xl">
        <!-- Brand Header -->
        <div class="flex flex-col items-center text-center">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-600/30 mb-4">
            <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 class="text-2xl font-extrabold text-white tracking-tight">RetroSync</h1>
          <p class="text-xs text-slate-400 mt-1 max-w-xs">
            Live multi-user retrospectives with real-time cursor sync, presence, and stealth ideation.
          </p>
        </div>

        <!-- Portfolio Demo Quick-Start (Instant Access) -->
        <div class="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30 flex flex-col gap-3 shadow-inner">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Quick Portfolio Demo</span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">
            Jump directly into a live interactive session with simulated team collaborators, real-time drag-and-drop, and voting.
          </p>
          <div class="space-y-2">
            <input
              type="text"
              #nameInput
              [value]="demoName()"
              (input)="demoName.set(nameInput.value)"
              placeholder="Your Name (e.g. Alex Rivera)"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <button
              type="button"
              (click)="loginDemo()"
              class="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2">
              <span>Enter Retro Board as Facilitator</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Divider -->
        <div class="relative flex items-center justify-center">
          <div class="border-t border-slate-800 w-full"></div>
          <span class="bg-slate-900/90 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-widest absolute">
            Or Live Supabase
          </span>
        </div>

        <!-- Magic Link Sign In -->
        <div class="space-y-3">
          <div>
            <label for="email" class="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
            <input
              id="email"
              type="email"
              #emailInput
              [value]="email()"
              (input)="email.set(emailInput.value)"
              (keydown.enter)="signInWithEmail()"
              placeholder="developer@company.com"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <button
            type="button"
            (click)="signInWithEmail()"
            [disabled]="loading() || !email().trim()"
            class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs border border-slate-700 transition">
            {{ loading() ? 'Sending Magic Link...' : 'Send Magic Link' }}
          </button>
        </div>

        <!-- Feature Highlights Footer -->
        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-around text-[10px] text-slate-400">
          <span class="flex items-center gap-1">⚡ Angular 22 Signals</span>
          <span class="flex items-center gap-1">🖱️ Cursors</span>
          <span class="flex items-center gap-1">🔒 Stealth Mode</span>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  public email = signal<string>('');
  public demoName = signal<string>('Alex Rivera');
  public loading = signal<boolean>(false);

  public loginDemo(): void {
    const user = this.authService.signInAsDemoUser(this.demoName());
    this.toastService.show(`Welcome to RetroSync, ${user.name}!`, 'success');
    this.router.navigate(['/board/sprint-42']);
  }

  public async signInWithEmail(): Promise<void> {
    const emailVal = this.email().trim();
    if (!emailVal) return;

    if (!this.supabaseService.isConfigured()) {
      this.toastService.show('Supabase is not configured yet. Using instant demo login.', 'info');
      this.loginDemo();
      return;
    }

    this.loading.set(true);
    const { error } = await this.authService.signInWithEmail(emailVal);
    this.loading.set(false);

    if (error) {
      this.toastService.show(error.message, 'error');
    } else {
      this.toastService.show('Magic link sent! Check your email inbox.', 'success');
    }
  }
}

