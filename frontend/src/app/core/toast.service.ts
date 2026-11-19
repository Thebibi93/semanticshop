import { Injectable, signal } from "@angular/core";

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "success" | "warn" | "error";
}

@Injectable({ providedIn: "root" })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, kind: Toast["kind"] = "info"): void {
    const id = ++this.counter;
    this.toasts.update((current) => [...current, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), 3200);
  }

  dismiss(id: number): void {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}
