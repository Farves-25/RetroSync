import { Component, inject, output, signal } from '@angular/core';
import { BoardStateService } from '../../../../core/services/board-state.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { PresenceBarComponent } from './presence-bar.component';
import { TimeRemainingPipe } from '../../../../shared/pipes/time-remaining.pipe';
import { SupabaseService } from '../../../../core/services/supabase.service';

@Component({
  selector: 'app-board-header',
  imports: [PresenceBarComponent, TimeRemainingPipe],
  template: `
    <header class="h-16 px-6 glass-panel border-b border-slate-800/80 flex items-center justify-between z-30 select-none">
      <!-- Left: Logo & Board Title -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold text-white tracking-tight">
                {{ boardState.currentBoard()?.title || 'RetroSync' }}
              </h1>
              @if (boardState.isBlurred()) {
                <span class="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Stealth Mode
                </span>
              }
            </div>
            <p class="text-xs text-slate-400 hidden md:block">
              {{ boardState.currentBoard()?.description || 'Live Collaborative Retrospective' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Center: Synchronized Timer Display -->
      @if (boardState.currentBoard()?.timer_ends_at) {
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-indigo-500/40 text-indigo-300 shadow-md">
          <svg class="w-4 h-4 text-indigo-400 animate-spin" style="animation-duration: 3s;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2" stroke="currentColor" stroke-dasharray="32" stroke-dashoffset="10"/>
          </svg>
          <span class="text-xs font-mono font-bold tracking-wider">
            {{ boardState.currentBoard()?.timer_ends_at | timeRemaining }}
          </span>
        </div>
      }

      <!-- Right: Collaborators & Actions -->
      <div class="flex items-center gap-3">
        <app-presence-bar></app-presence-bar>

        <div class="h-5 w-px bg-slate-800 mx-1"></div>

        <!-- Export Summary Button -->
        <button
          type="button"
          (click)="exportSummary()"
          class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition shadow-sm"
          title="Export Markdown Summary">
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>

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
  public toastService = inject(ToastService);

  public openSettings = output<void>();

  public copyShareLink(): void {
    navigator.clipboard.writeText(window.location.href);
    this.toastService.show('Retro invite URL copied to clipboard!', 'success');
  }

  public exportSummary(): void {
    const md = this.boardState.exportMarkdownSummary();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RetroSync-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.show('Retrospective summary downloaded!', 'info');
  }

  public signOut(): void {
    this.authService.signOut();
  }
}

