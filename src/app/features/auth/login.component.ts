import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, PRESET_COLLABORATORS } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-login',
  host: { '(window:pageshow)': 'onPageShow($event)' },
  template: `
    <div class="min-h-screen w-screen canvas-grid overflow-x-hidden overflow-y-auto grid lg:grid-cols-[1.25fr_1fr] relative select-none">
      <div class="orb w-96 h-96 bg-violet -top-24 -left-24" aria-hidden="true"></div>
      <div class="orb w-80 h-80 bg-accent bottom-0 right-1/4" style="animation-delay:-5s; opacity:.3" aria-hidden="true"></div>

      <!-- Showcase side -->
      <div class="hidden lg:flex flex-col justify-between gap-8 p-12 xl:p-14 relative z-10">
        <div class="flex items-center gap-3.5">
          <span class="logo-mark !w-12 !h-12" aria-hidden="true">R</span>
          <span class="font-display text-2xl font-extrabold tracking-tight">Retro<span class="gradient-text">Sync</span></span>
        </div>

        <div>
          <span class="pill !bg-ink/5 mb-5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live · real-time · multiplayer</span>
          <h1 class="font-display text-5xl xl:text-6xl font-bold leading-[1.05]">Retros your team<br>will <span class="shine-text">actually love.</span></h1>
          <p class="mt-5 text-base xl:text-lg text-muted max-w-xl leading-relaxed">Run sprint retrospectives on one shared board with live cursors, stealth brainstorming, voting and timers.</p>
          <ul class="mt-6 flex flex-wrap gap-2.5 text-sm font-semibold" aria-label="Features">
            <li class="pill !py-1.5">👆 Live cursors</li>
            <li class="pill !py-1.5">🙈 Stealth mode</li>
            <li class="pill !py-1.5">❤️ Voting</li>
            <li class="pill !py-1.5">⏱ Shared timer</li>
            <li class="pill !py-1.5">📤 Export</li>
          </ul>
        </div>

        <!-- Live board preview -->
        <div class="tilt-stage" aria-hidden="true">
          <div class="tilt relative rounded-2xl border border-line bg-white overflow-hidden max-w-[720px]"
               style="box-shadow: 0 50px 90px -30px rgba(21,23,46,.35), 0 0 80px -30px rgba(90,82,240,.35)">
            <!-- window chrome -->
            <div class="flex items-center gap-2 px-4 py-2.5 border-b border-ink/10 bg-ink/[.03]">
              <span class="w-2.5 h-2.5 rounded-full bg-[#ff5f57]"></span><span class="w-2.5 h-2.5 rounded-full bg-[#febc2e]"></span><span class="w-2.5 h-2.5 rounded-full bg-[#28c840]"></span>
              <span class="ml-3 text-xs font-semibold text-muted">Sprint 42 · Retrospective</span>
              <span class="ml-auto pill !py-0.5 !text-[11px] !bg-lemon animate-tick">⏱ 04:12</span>
              <span class="flex -space-x-1.5 ml-2">
                <span class="w-5 h-5 rounded-full border-2 border-white bg-[#7c5cff] text-[9px] font-bold text-white flex items-center justify-center">A</span>
                <span class="w-5 h-5 rounded-full border-2 border-white bg-[#ff5c8a] text-[9px] font-bold text-white flex items-center justify-center">M</span>
                <span class="w-5 h-5 rounded-full border-2 border-white bg-[#10b981] text-[9px] font-bold text-white flex items-center justify-center">S</span>
              </span>
            </div>

            <div class="grid grid-cols-3 gap-3 p-4 relative">
              <div class="rounded-xl border border-ink/10 p-2.5 flex flex-col gap-2.5" style="background: linear-gradient(180deg, rgba(16,185,129,.22), rgba(255,255,255,.6))">
                <p class="text-xs font-bold flex items-center justify-between">What went well 🎉<span class="pill !py-0 !px-1.5 !text-[10px]">2</span></p>
                <div class="mini-note" style="--c:#10b981">Zero-downtime deploy pipeline hit 99.98%<p class="text-[10px] text-muted mt-1.5 flex justify-between"><span>Alex</span><span>♥ 5</span></p></div>
                <div class="mini-note" style="--c:#10b981">Design tokens shipped early<p class="text-[10px] text-muted mt-1.5 flex justify-between"><span>Maya</span><span>♥ 3</span></p></div>
              </div>

              <div class="rounded-xl border border-ink/10 p-2.5 flex flex-col gap-2.5" style="background: linear-gradient(180deg, rgba(245,158,11,.24), rgba(255,255,255,.6))">
                <p class="text-xs font-bold flex items-center justify-between">Could be better 🛠<span class="pill !py-0 !px-1.5 !text-[10px]">2</span></p>
                <div class="mini-note" style="--c:#f59e0b">
                  <span class="absolute -top-2.5 right-2 pill !py-0 !px-2 !text-[9px] !bg-lemon">⭐ Top voted</span>
                  PR reviews take longer than 48 hours<p class="text-[10px] text-muted mt-1.5 flex justify-between"><span>Sam</span><span class="text-accent font-bold">♥ 7</span></p></div>
                <div class="mini-note" style="--c:#f59e0b"><span class="blur-[4px]">Clearer acceptance criteria please</span><p class="text-[10px] text-muted mt-1.5">🔒 Hidden in stealth</p></div>
              </div>

              <div class="rounded-xl border border-ink/10 p-2.5 flex flex-col gap-2.5" style="background: linear-gradient(180deg, rgba(124,92,255,.2), rgba(255,255,255,.6))">
                <p class="text-xs font-bold flex items-center justify-between">Action items 🚀<span class="pill !py-0 !px-1.5 !text-[10px]">1</span></p>
                <div class="mini-note" style="--c:#7c5cff">Weekly 30-min architecture sync every Tuesday<p class="text-[10px] text-muted mt-1.5 flex justify-between"><span>Maya</span><span>♥ 4</span></p></div>
                <div class="rounded-[11px] border border-dashed border-ink/15 py-3 text-center text-[11px] text-muted">+ Add card</div>
              </div>

              <div class="live-cursor cur-a" style="left:18%; top:30%">
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#ff5c8a" stroke="#0b0c12" stroke-width="1.5" stroke-linejoin="round"/></svg>
                <span style="background:#ff5c8a">Maya</span>
              </div>
              <div class="live-cursor cur-b" style="left:62%; top:44%">
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#10b981" stroke="#0b0c12" stroke-width="1.5" stroke-linejoin="round"/></svg>
                <span style="background:#10b981">Sam</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form side -->
      <div class="flex flex-col items-center justify-center p-6 gap-6 relative z-10">
        <div class="flex items-center gap-3 lg:hidden">
          <span class="logo-mark !w-12 !h-12" aria-hidden="true">R</span>
          <span class="font-display text-2xl font-extrabold tracking-tight">Retro<span class="gradient-text">Sync</span></span>
        </div>

        <div class="gborder w-full max-w-md rounded-[26px]">
          <div class="panel !rounded-[26px] p-8 flex flex-col gap-5 animate-fade-in ">
            <div>
              <h2 class="text-3xl font-bold">Welcome back <span aria-hidden="true">👋</span></h2>
              <p class="text-sm text-muted mt-1.5">Sign in to open your boards and sync with your team.</p>
            </div>

            @if (supabaseService.isConfigured()) {
              @if (linkSentTo(); as sentTo) {
                <div class="rounded-2xl border border-ink/10 bg-ink/5 p-5 text-center flex flex-col items-center gap-2" role="status" aria-live="polite">
                  <span class="text-3xl" aria-hidden="true">📬</span>
                  <h3 class="font-bold text-lg">Check your inbox</h3>
                  <p class="text-sm text-muted">
                    @switch (sentKind()) {
                      @case ('reset') { We sent a password reset link to <b class="text-ink">{{ sentTo }}</b>. It also works if you signed up with Google. }
                      @case ('confirm') { We sent a confirmation link to <b class="text-ink">{{ sentTo }}</b>. Open it to finish creating your account. }
                      @default { We sent a sign-in link to <b class="text-ink">{{ sentTo }}</b>. Open it on this device to continue. }
                    }
                  </p>
                  <button type="button" (click)="resend()" [disabled]="resendIn() > 0 || resending()"
                    class="text-xs font-semibold text-violet underline underline-offset-2 mt-1 disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed">
                    {{ resending() ? 'Sending…' : resendIn() > 0 ? 'Resend link in ' + resendIn() + 's' : 'Resend link' }}
                  </button>
                  @if (resendNotice()) {
                    <p class="text-xs text-muted" role="status" aria-live="polite">{{ resendNotice() }}</p>
                  }
                  <button type="button" (click)="linkSentTo.set(null)" class="text-xs font-semibold text-violet underline underline-offset-2">Use a different email</button>
                </div>
              } @else {
                <button type="button" (click)="google()" [disabled]="loading() !== null" class="btn !py-3 !text-sm">
                  @if (loading() === 'google') {
                    <span class="w-4 h-4 rounded-full border-2 border-ink/25 border-t-white animate-spin" aria-hidden="true"></span>
                  } @else {
                  <svg class="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                  </svg>
                  }
                  {{ loading() === 'google' ? 'Redirecting to Google…' : 'Continue with Google' }}
                </button>

                <div class="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
                  <span class="h-px flex-1 bg-ink/10"></span>or use email<span class="h-px flex-1 bg-ink/10"></span>
                </div>

                <form (submit)="$event.preventDefault(); submit()" class="flex flex-col gap-3" novalidate>
                  @if (mode() === 'signup') {
                    <div>
                      <label for="acct-name" class="label">Name</label>
                      <input id="acct-name" type="text" autocomplete="name" #acctName [value]="accountName()" (input)="accountName.set(acctName.value)" class="field">
                    </div>
                  }
                  <div>
                    <label for="email" class="label">Email</label>
                    <input id="email" type="email" autocomplete="email" #emailInput [value]="email()" (input)="email.set(emailInput.value); error.set('')"
                      placeholder="you@company.com" class="field" [attr.aria-invalid]="error() ? 'true' : null" [attr.aria-describedby]="error() ? 'login-error' : null">
                  </div>
                  @if (mode() === 'signin' || mode() === 'signup') {
                    <div>
                      <label for="password" class="label">Password</label>
                      <input id="password" type="password" [attr.autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'"
                        #pwInput [value]="password()" (input)="password.set(pwInput.value); error.set('')" class="field">
                    </div>
                  }
                  <button type="submit" [disabled]="loading() !== null" class="btn btn-primary !py-3.5 !text-sm">
                    {{ loading() === 'email' ? 'Working…' : submitLabel() }}
                  </button>
                </form>

                <div class="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs font-semibold">
                  @if (mode() !== 'signin') {
                    <button type="button" (click)="setMode('signin')" class="text-violet underline underline-offset-2">Sign in with password</button>
                  }
                  @if (mode() !== 'signup') {
                    <button type="button" (click)="setMode('signup')" class="text-violet underline underline-offset-2">Create account</button>
                  }
                  @if (mode() !== 'forgot') {
                    <button type="button" (click)="setMode('forgot')" class="text-violet underline underline-offset-2">Forgot password?</button>
                  }
                  @if (mode() !== 'link') {
                    <button type="button" (click)="setMode('link')" class="text-violet underline underline-offset-2">Email me a sign-in link</button>
                  }
                </div>
              }

              @if (error()) {
                <p id="login-error" role="alert" class="text-sm text-[#b3261e] bg-[#ff5a4e]/10 border border-[#b3261e]/40 rounded-xl px-3.5 py-2.5">{{ error() }}</p>
              }

              <div class="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
                <span class="h-px flex-1 bg-ink/10"></span>or<span class="h-px flex-1 bg-ink/10"></span>
              </div>

              <button type="button" (click)="showDemo.set(!showDemo())" [attr.aria-expanded]="showDemo()" class="btn !py-3 !text-sm">
                {{ showDemo() ? 'Hide demo options' : '✨ Try the demo, no account needed' }}
              </button>
            }

            @if (showDemo() || !supabaseService.isConfigured()) {
              <div class="flex flex-col gap-4 animate-fade-in rounded-2xl border border-ink/10 bg-ink/[.03] p-4">
                <div>
                  <label for="user-name" class="label">Display name</label>
                  <input id="user-name" type="text" #nameInput [value]="userName()" (input)="userName.set(nameInput.value)" (keydown.enter)="enterDemo()" placeholder="e.g. Alex Rivera" class="field">
                </div>

                <div role="group" aria-label="Role">
                  <span class="label">Role</span>
                  <div class="grid grid-cols-2 gap-2">
                    @for (preset of presetCollaborators; track preset.name) {
                      <button type="button" (click)="selectPreset(preset)" [attr.aria-pressed]="selectedRole() === preset.role"
                        class="px-3 py-2.5 rounded-xl border text-left text-sm font-semibold flex items-center gap-2.5 transition hover:-translate-y-0.5"
                        [class.border-violet]="selectedRole() === preset.role" [class.bg-violet/20]="selectedRole() === preset.role"
                        [class.border-ink/10]="selectedRole() !== preset.role" [class.bg-ink/5]="selectedRole() !== preset.role">
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" [style.background-color]="preset.color" [style.box-shadow]="'0 0 10px ' + preset.color"></span>
                        <span class="truncate">{{ preset.role.split('/')[0] }}</span>
                      </button>
                    }
                  </div>
                </div>

                <button type="button" (click)="enterDemo()" class="btn btn-primary !py-3.5 !text-sm">Enter demo →</button>
              </div>
            }
          </div>
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
  private route = inject(ActivatedRoute);

  public presetCollaborators = PRESET_COLLABORATORS;
  public userName = signal<string>('Alex Rivera');
  public selectedRole = signal<string>('Staff Eng / Host');
  public selectedColor = signal<string>('#6366f1');

  public mode = signal<'signin' | 'signup' | 'forgot' | 'link'>('signin');
  public password = signal('');
  public accountName = signal('');
  public resendIn = signal(0);
  public resending = signal(false);
  public resendNotice = signal('');
  public sentKind =signal<'link' | 'reset' | 'confirm'>('link');
  public email = signal('');
  public loading = signal<'google' | 'email' | null>(null);
  public error = signal('');
  public linkSentTo = signal<string | null>(null);
  public showDemo = signal(false);
  private emailValid = computed(() => EMAIL_RE.test(this.email().trim()));

  /** Back/forward navigation can restore this page from the bfcache mid-redirect; clear any stuck loading state. */
  public onPageShow(event: PageTransitionEvent): void {
    if (event.persisted) this.loading.set(null);
  }

  public selectPreset(preset: { name: string; role: string; color: string }): void {
    this.userName.set(preset.name);
    this.selectedRole.set(preset.role);
    this.selectedColor.set(preset.color);
  }

  public submitLabel = computed(() => ({
    signin: 'Sign in',
    signup: 'Create account',
    forgot: 'Email me a reset link',
    link: 'Email me a sign-in link'
  })[this.mode()]);

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  private startCooldown(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.resendIn.set(30);
    this.cooldownTimer = setInterval(() => {
      this.resendIn.update(n => n - 1);
      if (this.resendIn() <= 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }

  public async resend(): Promise<void> {
    const address = this.linkSentTo();
    if (!address || this.resendIn() > 0 || this.resending()) return;
    this.resending.set(true);
    this.resendNotice.set('');
    const kind = this.sentKind();
    const { error } = kind === 'reset' ? await this.authService.requestPasswordReset(address)
      : kind === 'confirm' ? await this.authService.resendConfirmation(address)
      : await this.authService.signInWithEmail(address);
    this.resending.set(false);
    if (error) {
      this.resendNotice.set(error.message || 'Could not resend the link. Please try again.');
    } else {
      this.resendNotice.set('Link sent again. Check your inbox and spam folder.');
      this.startCooldown();
    }
  }

  public setMode(mode: 'signin' | 'signup' | 'forgot' | 'link'): void {
    this.mode.set(mode);
    this.error.set('');
  }

  public async submit(): Promise<void> {
    if (!this.emailValid()) {
      this.error.set('Please enter a valid email address.');
      return;
    }
    const mode = this.mode();
    if ((mode === 'signin' || mode === 'signup') && this.password().length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }
    this.loading.set('email');
    this.error.set('');
    const address = this.email().trim();

    let failure: Error | null = null;
    let sent: 'link' | 'reset' | 'confirm' | null = null;
    if (mode === 'signin') {
      failure = (await this.authService.signInWithPassword(address, this.password())).error;
    } else if (mode === 'signup') {
      const res = await this.authService.signUpWithPassword(address, this.password(), this.accountName().trim() || address.split('@')[0]);
      failure = res.error;
      if (!failure && res.needsConfirmation) sent = 'confirm';
    } else if (mode === 'forgot') {
      failure = (await this.authService.requestPasswordReset(address)).error;
      sent = 'reset';
    } else {
      failure = (await this.authService.signInWithEmail(address)).error;
      sent = 'link';
    }
    this.loading.set(null);

    if (failure) {
      this.error.set(failure.message || 'Something went wrong. Please try again.');
    } else if (sent) {
      this.sentKind.set(sent);
      this.linkSentTo.set(address);
      this.resendNotice.set('');
      this.startCooldown();
    } else {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard');
    }
  }

  public async google(): Promise<void> {
    this.loading.set('google');
    this.error.set('');
    const { error } = await this.authService.signInWithGoogle();
    if (error) {
      this.loading.set(null);
      this.error.set(error.message || 'Google sign-in is unavailable right now.');
    }
    // On success the browser is redirected to Google, so there is nothing more to do here.
  }

  public enterDemo(): void {
    const name = this.userName().trim() || 'Alex Rivera';
    const user = this.authService.switchPersona(name, this.selectedRole(), this.selectedColor());
    this.toastService.show(`Welcome to RetroSync, ${user.name}!`, 'success');
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard');
  }
}
