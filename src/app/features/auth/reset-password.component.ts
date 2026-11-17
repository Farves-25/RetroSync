import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-reset-password',
  imports: [RouterLink],
  template: `
    <main class="min-h-screen w-screen canvas-grid flex items-center justify-center p-6">
      <div class="panel !rounded-[26px] p-8 w-full max-w-md flex flex-col gap-5">
        <h1 class="text-2xl font-bold">Set a new password</h1>

        @if (hasSession() === null) {
          <p class="text-sm text-muted" role="status">Checking your reset link…</p>
        } @else if (hasSession() === false) {
          <p class="text-sm text-muted">This reset link is invalid or has expired.</p>
          <a routerLink="/auth/login" class="btn btn-primary !py-3 !text-sm text-center">Back to sign in</a>
        } @else {
          <form (submit)="$event.preventDefault(); save()" class="flex flex-col gap-3" novalidate>
            <div>
              <label for="new-password" class="label">New password</label>
              <input id="new-password" type="password" autocomplete="new-password" #pw [value]="password()"
                (input)="password.set(pw.value); error.set('')" class="field"
                [attr.aria-invalid]="error() ? 'true' : null" [attr.aria-describedby]="error() ? 'reset-error' : null">
              <p class="text-xs text-muted mt-1">At least 6 characters.</p>
            </div>
            @if (error()) {
              <p id="reset-error" role="alert" class="text-sm text-[#ff8a95] bg-[#d63b4a]/10 border border-[#d63b4a]/30 rounded-xl px-3.5 py-2.5">{{ error() }}</p>
            }
            <button type="submit" [disabled]="saving()" class="btn btn-primary !py-3.5 !text-sm">
              {{ saving() ? 'Saving…' : 'Save password' }}
            </button>
          </form>
        }
      </div>
    </main>
  `
})
export class ResetPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  public hasSession = signal<boolean | null>(null);
  public password = signal('');
  public error = signal('');
  public saving = signal(false);

  constructor() {
    // Supabase exchanges the recovery link for a session on load; wait for it before checking.
    this.auth.ready.then(() => this.auth.hasSession()).then(ok => this.hasSession.set(ok));
  }

  public async save(): Promise<void> {
    if (this.password().length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }
    this.saving.set(true);
    const { error } = await this.auth.updatePassword(this.password());
    this.saving.set(false);
    if (error) {
      this.error.set(error.message || 'Could not update your password. Please try again.');
      return;
    }
    this.toast.show('Password updated. You can now sign in with Google or your password.', 'success');
    this.router.navigateByUrl('/dashboard');
  }
}
