import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ToastService } from "./toast.service";

@Component({
  selector: "app-toasts",
  template: `
    <div class="toast-zone">
      @for (toast of toastService.toasts(); track toast.id) {
        <button class="toast {{ toast.kind }}" type="button" (click)="toastService.dismiss(toast.id)">
          {{ toast.message }}
        </button>
      }
    </div>
  `,
  styles: `
    .toast-zone {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: min(360px, calc(100vw - 40px));
    }

    .toast {
      border: 1px solid var(--line);
      border-left-width: 4px;
      background: var(--surface);
      color: var(--ink);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
      text-align: left;
      box-shadow: var(--shadow);
      animation: toast-in 0.2s ease;
    }

    .toast.success {
      border-left-color: var(--teal);
    }

    .toast.warn {
      border-left-color: var(--amber);
    }

    .toast.error {
      border-left-color: var(--danger);
    }

    .toast.info {
      border-left-color: var(--primary);
    }

    @keyframes toast-in {
      from {
        transform: translateY(8px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toasts {
  readonly toastService = inject(ToastService);
}
