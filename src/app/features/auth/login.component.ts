import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, PRESET_COLLABORATORS } from '../../core/services/auth.service';
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

        <!-- Role & Name Setup -->
        <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 flex flex-col gap-3 shadow-inner">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Join Workspace</span>
            <span class="text-[10px] text-emerald-400 font-mono">⚡ Real-time Active</span>
          </div>

          <div class="space-y-2.5">
            <div>
              <label for="user-name" class="block text-[11px] font-medium text-slate-400 mb-1">Your Full Name</label>
              <input
                id="user-name"
                type="text"
                #nameInput
                [value]="userName()"
                (input)="userName.set(nameInput.value)"
                placeholder="e.g. Alex Rivera"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400">
            </div>

            <div>
              <label class="block text-[11px] font-medium text-slate-400 mb-1">Role in Retrospective</label>
              <div class="grid grid-cols-2 gap-1.5 text-xs">
                @for (preset of presetCollaborators; track preset.name) {
                  <button
                    type="button"
                    (click)="selectPreset(preset)"
                    class="px-2.5 py-2 rounded-lg border text-left transition flex items-center gap-2"
                    [class.border-indigo-500]="selectedRole() === preset.role"
                    [class.bg-indigo-950/40]="selectedRole() === preset.role"
                    [class.border-slate-800]="selectedRole() !== preset.role">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background-color]="preset.color"></span>
                    <span class="truncate font-medium text-slate-200">{{ preset.role.split('/')[0] }}</span>
                  </button>
                }
              </div>
            </div>

            <button
              type="button"
              (click)="enterWorkspace()"
              class="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2">
              <span>Enter Workspace</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Supabase Cloud Connection Indicator -->
        <div class="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full"
              [class.bg-emerald-400]="supabaseService.isConfigured()"
              [class.bg-amber-400]="!supabaseService.isConfigured()">
            </span>
            <span class="text-slate-300">
              {{ supabaseService.isConfigured() ? 'Supabase Postgres Connected' : 'Local Realtime Broadcast Active' }}
            </span>
          </div>
          <span class="text-[10px] text-slate-500 font-mono">
            {{ supabaseService.isConfigured() ? 'ONLINE' : 'PEER-TO-PEER' }}
          </span>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  public authService = inject(AuthService);
  public supabaseService = inject(SupabaseService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  public presetCollaborators = PRESET_COLLABORATORS;
  public userName = signal<string>('Alex Rivera');
  public selectedRole = signal<string>('Staff Eng / Host');
  public selectedColor = signal<string>('#6366f1');

  public selectPreset(preset: { name: string; role: string; color: string }): void {
    this.userName.set(preset.name);
    this.selectedRole.set(preset.role);
    this.selectedColor.set(preset.color);
  }

  public enterWorkspace(): void {
    const name = this.userName().trim() || 'Alex Rivera';
    const user = this.authService.switchPersona(name, this.selectedRole(), this.selectedColor());
    this.toastService.show(`Welcome to RetroSync, ${user.name}!`, 'success');
    this.router.navigate(['/dashboard']);
  }
}
