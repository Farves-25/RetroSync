import { Component, inject, signal, ElementRef } from '@angular/core';
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
  host: {
    'class': 'relative z-50 block',
    '(document:click)': 'onDocumentClick($event)'
  },
  template: `
    <header class="relative z-50 min-h-16 px-4 sm:px-8 py-3 glass border-b border-white/10 flex flex-wrap items-center justify-between gap-3 select-none">
      <div class="flex items-center gap-3 min-w-0">
        <a routerLink="/dashboard" class="icon-btn !border-line bg-surface" title="Back to all boards" aria-label="Back to all boards">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </a>
        <span class="logo-mark" aria-hidden="true">R</span>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold truncate">{{ boardState.currentBoard()?.title || 'RetroSync' }}</h1>
            @if (boardState.isBlurred()) {
              <span class="pill !bg-lemon !py-0.5">🔒 Stealth</span>
            }
          </div>
          <p class="text-xs text-muted hidden lg:block truncate max-w-md">{{ boardState.currentBoard()?.description || 'Live collaborative retrospective' }}</p>
        </div>
      </div>

      @if (boardState.currentBoard()?.timer_ends_at) {
        <div class="pill !px-4 !py-2 !text-sm"
          [class.!bg-lemon]="boardState.isTimerRunning()" [class.!bg-pink]="!boardState.isTimerRunning()" role="timer">
          <span aria-hidden="true">⏱</span>
          <span class="font-display text-base font-bold tabular-nums">{{ boardState.timerRemainingDisplay() }}</span>
          @if (!boardState.isTimerRunning()) {
            <button type="button" (click)="boardState.setTimer(0)" class="text-xs underline font-bold">Dismiss</button>
          }
        </div>
      }

      <div class="flex items-center gap-2">
        <app-presence-bar></app-presence-bar>

        <div class="relative">
          <button type="button" (click)="$event.stopPropagation(); isPersonaMenuOpen.set(!isPersonaMenuOpen()); isExportMenuOpen.set(false)"
            class="btn btn-sm" title="Switch user persona for this tab" aria-haspopup="menu" [attr.aria-expanded]="isPersonaMenuOpen()">
            <span class="w-3 h-3 rounded-full border border-line" [style.background-color]="authService.currentUser()?.color || '#6366f1'"></span>
            <span class="max-w-[90px] truncate">{{ authService.currentUser()?.name }}</span>
            <span class="pill !py-0.5 !px-2 !text-[10px]" [class.!bg-violet]="boardState.isFacilitator()" [class.!text-white]="boardState.isFacilitator()">{{ boardState.isFacilitator() ? 'Facilitator' : 'Participant' }}</span>
            <span aria-hidden="true">▾</span>
          </button>

          @if (isPersonaMenuOpen()) {
            <div (click)="$event.stopPropagation()" role="menu" class="absolute right-0 top-full mt-2 w-60 panel !rounded-xl p-2 z-50 text-sm flex flex-col gap-1 animate-fade-in">
              <span class="label !mb-0 px-2 pt-1">Switch identity (this tab)</span>
              @for (preset of presetCollaborators; track preset.name) {
                <button type="button" role="menuitem" (click)="switchUser(preset.name, preset.role, preset.color)"
                  class="flex items-center justify-between px-2.5 py-2 rounded-lg text-left font-semibold hover:bg-white/10"
                  [class.bg-white/10]="authService.currentUser()?.name === preset.name">
                  <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full border border-line" [style.background-color]="preset.color"></span>{{ preset.name }}</span>
                  <span class="text-[11px] text-muted font-medium">{{ preset.role.split('/')[0] }}</span>
                </button>
              }
            </div>
          }
        </div>

        <button type="button" (click)="openSecondTab()" class="btn btn-sm !bg-mint hidden md:inline-flex" title="Open a second tab to test multi-user real-time sync">
          + 2nd tab
        </button>

        <div class="relative">
          <button type="button" (click)="$event.stopPropagation(); isExportMenuOpen.set(!isExportMenuOpen()); isPersonaMenuOpen.set(false)"
            class="btn btn-sm" title="Export retrospective" aria-haspopup="menu" [attr.aria-expanded]="isExportMenuOpen()">
            Export <span aria-hidden="true">▾</span>
          </button>
          @if (isExportMenuOpen()) {
            <div (click)="$event.stopPropagation()" role="menu" class="absolute right-0 top-full mt-2 w-56 panel !rounded-xl p-2 z-50 text-sm flex flex-col gap-1 animate-fade-in">
              <button type="button" role="menuitem" (click)="exportMarkdown(); isExportMenuOpen.set(false)" class="w-full text-left px-3 py-2 rounded-lg font-semibold hover:bg-white/10 flex justify-between"><span>Markdown</span><span class="text-[11px] text-muted">.md</span></button>
              <button type="button" role="menuitem" (click)="exportJson(); isExportMenuOpen.set(false)" class="w-full text-left px-3 py-2 rounded-lg font-semibold hover:bg-white/10 flex justify-between"><span>JSON</span><span class="text-[11px] text-muted">.json</span></button>
              <button type="button" role="menuitem" (click)="copySlackFormat(); isExportMenuOpen.set(false)" class="w-full text-left px-3 py-2 rounded-lg font-semibold hover:bg-white/10 flex justify-between"><span>Copy for Slack / Teams</span><span class="text-[11px] text-muted">clipboard</span></button>
            </div>
          }
        </div>

        <button type="button" (click)="copyShareLink()" class="btn btn-sm btn-primary">Share</button>

        <button type="button" (click)="signOut()" class="icon-btn !border-line bg-surface" title="Sign out" aria-label="Sign out">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
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
  private elementRef = inject(ElementRef);
  public presetCollaborators = PRESET_COLLABORATORS;
  public isPersonaMenuOpen = signal<boolean>(false);
  public isExportMenuOpen = signal<boolean>(false);

  public onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isPersonaMenuOpen.set(false);
      this.isExportMenuOpen.set(false);
    }
  }

  public copyShareLink(): void {
    navigator.clipboard.writeText(window.location.href);
    this.toastService.show('Retro invite URL copied! Open it in another tab/browser to test.', 'success');
  }

  public openSecondTab(): void {
    const onlineNames = new Set(this.presenceService.onlineUsers().map(u => u.name.replace(' (You)', '')));
    const nextPreset = this.presetCollaborators.find(p => !onlineNames.has(p.name)) || this.presetCollaborators[1];
    const newUid = 'user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const url = new URL(window.location.href);
    url.searchParams.set('user', nextPreset.name);
    url.searchParams.set('uid', newUid);
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
