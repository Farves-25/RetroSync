import { Component, inject, output, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { AuthService, PRESET_COLLABORATORS } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { PresenceBarComponent } from './presence-bar.component';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { RealtimePresenceService } from '../../../../core/services/realtime-presence.service';

@Component({
  selector: 'app-board-header',
  imports: [PresenceBarComponent, RouterLink],
  template: `
    <header class="h-16 px-4 sm:px-6 glass-panel border-b border-slate-800/80 flex items-center justify-between z-30 select-none">
      <!-- Left: Navigation, Logo & Board Title -->
      <div class="flex items-center gap-3">
        <!-- Back to Dashboard -->
        <a
          routerLink="/dashboard"
          class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition shadow-sm flex items-center justify-center"
          title="Back to All Boards">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </a>

        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-sm sm:text-base font-bold text-white tracking-tight">
                {{ boardState.currentBoard()?.title || 'RetroSync' }}
              </h1>
              @if (boardState.isBlurred()) {
                <span class="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Stealth Mode
                </span>
              }
            </div>
            <p class="text-xs text-slate-400 hidden lg:block truncate max-w-sm">
              {{ boardState.currentBoard()?.description || 'Live Collaborative Retrospective' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Center: Synchronized Active Timer Display -->
      @if (boardState.currentBoard()?.timer_ends_at) {
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors shadow-md"
          [class.bg-slate-800]="boardState.isTimerRunning()"
          [class.border-indigo-500]="boardState.isTimerRunning()"
          [class.text-indigo-300]="boardState.isTimerRunning()"
          [class.bg-rose-950]="!boardState.isTimerRunning()"
          [class.border-rose-500]="!boardState.isTimerRunning()"
          [class.text-rose-200]="!boardState.isTimerRunning()">
          <svg class="w-4 h-4" [class.animate-spin]="boardState.isTimerRunning()" style="animation-duration: 3s;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2" stroke="currentColor" stroke-dasharray="32" stroke-dashoffset="10"/>
          </svg>
          <span class="text-xs font-mono font-bold tracking-wider">
            {{ boardState.timerRemainingDisplay() }}
          </span>
          @if (!boardState.isTimerRunning()) {
            <button
              type="button"
              (click)="boardState.setTimer(0)"
              class="ml-1 text-[11px] underline text-rose-300 hover:text-white">
              Dismiss
            </button>
          }
        </div>
      }

      <!-- Right: Collaborators & Actions -->
      <div class="flex items-center gap-2 sm:gap-2.5">
        <!-- Live Presence Bar -->
        <app-presence-bar></app-presence-bar>

        <!-- Current User Identity & Switcher -->
        <div class="relative">
          <button
            type="button"
            (click)="isPersonaMenuOpen.set(!isPersonaMenuOpen())"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-xs text-slate-200 transition shadow-sm"
            title="Switch User Persona for this tab">
            <span
              class="w-2.5 h-2.5 rounded-full ring-1 ring-slate-900"
              [style.background-color]="authService.currentUser()?.color || '#6366f1'">
            </span>
            <span class="font-semibold max-w-[80px] sm:max-w-[120px] truncate">
              {{ authService.currentUser()?.name }}
            </span>
            <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          @if (isPersonaMenuOpen()) {
            <div
              class="absolute right-0 mt-2 w-52 glass-panel rounded-2xl shadow-2xl border border-slate-700/80 p-2 z-50 text-xs flex flex-col gap-1 backdrop-blur-2xl">
              <span class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Identity (This Tab)
              </span>
              @for (preset of presetCollaborators; track preset.name) {
                <button
                  type="button"
                  (click)="switchUser(preset.name, preset.role, preset.color)"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition hover:bg-slate-800 text-slate-200"
                  [class.bg-slate-800]="authService.currentUser()?.name === preset.name">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" [style.background-color]="preset.color"></span>
                    <span class="font-medium">{{ preset.name }}</span>
                  </div>
                  <span class="text-[10px] text-slate-400">{{ preset.role.split('/')[0] }}</span>
                </button>
              }
            </div>
          }
        </div>

        <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

        <!-- Open 2nd Tab for Real-Time Testing -->
        <button
          type="button"
          (click)="openSecondTab()"
          class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 text-xs font-semibold shadow-sm transition"
          title="Open a second tab to test multi-user real-time cursors and card syncing">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>Open 2nd Tab</span>
        </button>

        <!-- Export Dropdown -->
        <div class="relative">
          <button
            type="button"
            (click)="isExportMenuOpen.set(!isExportMenuOpen())"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            title="Export Retrospective Insights">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span class="hidden sm:inline">Export</span>
            <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          @if (isExportMenuOpen()) {
            <div
              class="absolute right-0 mt-2 w-48 glass-panel rounded-2xl shadow-2xl border border-slate-700 p-2 z-50 text-xs flex flex-col gap-1 backdrop-blur-2xl">
              <button
                type="button"
                (click)="exportMarkdown(); isExportMenuOpen.set(false)"
                class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center justify-between">
                <span>Markdown (.md)</span>
                <span class="text-[10px] text-slate-400 font-mono">FILE</span>
              </button>
              <button
                type="button"
                (click)="exportJson(); isExportMenuOpen.set(false)"
                class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center justify-between">
                <span>JSON (.json)</span>
                <span class="text-[10px] text-slate-400 font-mono">DATA</span>
              </button>
              <button
                type="button"
                (click)="copySlackFormat(); isExportMenuOpen.set(false)"
                class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center justify-between">
                <span>Copy for Slack / Teams</span>
                <span class="text-[10px] text-indigo-400 font-mono">CLIPBOARD</span>
              </button>
            </div>
          }
        </div>

        <!-- Share Invite Link -->
        <button
          type="button"
          (click)="copyShareLink()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span class="hidden sm:inline">Share</span>
        </button>

        <!-- Backend Config / Settings Button -->
        <button
          type="button"
          (click)="openSettings.emit()"
          class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          [title]="supabaseService.isConfigured() ? 'Supabase Connected' : 'Connect Live Supabase'">
          <div class="relative">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            @if (!supabaseService.isConfigured()) {
              <span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"></span>
            } @else {
              <span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
            }
          </div>
        </button>

        <!-- User Logout / Switch -->
        <button
          type="button"
          (click)="signOut()"
          class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
          title="Sign Out">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  `
})
export class BoardHeaderComponent {
  public boardState = inject(BoardStateService);
  public authService = inject(AuthService);
  public supabaseService = inject(SupabaseService);
  public presenceService = inject(RealtimePresenceService);
  public toastService = inject(ToastService);
  private route = inject(ActivatedRoute);

  public openSettings = output<void>();
  public presetCollaborators = PRESET_COLLABORATORS;
  public isPersonaMenuOpen = signal<boolean>(false);
  public isExportMenuOpen = signal<boolean>(false);

  public copyShareLink(): void {
    navigator.clipboard.writeText(window.location.href);
    this.toastService.show('Retro invite URL copied! Open it in another tab/browser to test.', 'success');
  }

  public openSecondTab(): void {
    const onlineNames = new Set(this.presenceService.onlineUsers().map(u => u.name.replace(' (You)', '')));
    const nextPreset = this.presetCollaborators.find(p => !onlineNames.has(p.name)) || this.presetCollaborators[1];
    const url = new URL(window.location.href);
    url.searchParams.set('user', nextPreset.name);
    window.open(url.toString(), '_blank');
    this.toastService.show(`Opening 2nd tab as ${nextPreset.name}! Move mouse in either tab to see real cursor sync.`, 'info');
  }

  public switchUser(name: string, role: string, color: string): void {
    const updated = this.authService.switchPersona(name, role, color);
    this.isPersonaMenuOpen.set(false);

    const boardId = this.route.snapshot.paramMap.get('id') || 'demo-board';
    this.presenceService.initChannel(boardId, {
      id: updated.id,
      name: updated.name,
      color: updated.color,
      role: updated.role,
      avatar_url: updated.avatar_url
    }, updated.isDemo);

    this.toastService.show(`Switched tab identity to ${name}!`, 'info');
  }

  public exportMarkdown(): void {
    const md = this.boardState.exportMarkdownSummary();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RetroSync-${this.boardState.currentBoard()?.title || 'Retro'}.md`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.show('Retrospective Markdown downloaded!', 'success');
  }

  public exportJson(): void {
    const json = this.boardState.exportJsonSummary();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RetroSync-${this.boardState.currentBoard()?.title || 'Retro'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.show('Retrospective JSON dataset downloaded!', 'success');
  }

  public copySlackFormat(): void {
    const md = this.boardState.exportMarkdownSummary();
    navigator.clipboard.writeText(md);
    this.toastService.show('Retrospective summary copied for Slack/Teams!', 'success');
  }

  public signOut(): void {
    this.authService.signOut();
  }
}
