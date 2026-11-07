import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  public readonly toasts = signal<ToastMessage[]>([]);

  public show(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', duration = 3500): void {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, type, message };

    this.toasts.update(list => [...list, toast]);

    setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  public dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}

