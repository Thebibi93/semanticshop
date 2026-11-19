import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import { AuthStore } from "../../core/auth.store";
import { CartStore } from "../../core/cart.store";
import { EurosPipe } from "../../core/euros.pipe";
import { Order } from "../../core/models";
import { OrdersApi } from "../../core/orders.api";
import { ToastService } from "../../core/toast.service";
import { UiStore } from "../../core/ui.store";

@Component({
  selector: "app-cart-drawer",
  imports: [EurosPipe],
  templateUrl: "./cart.drawer.html",
  styleUrl: "./cart.drawer.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawer {
  readonly ui = inject(UiStore);
  readonly cart = inject(CartStore);
  private readonly auth = inject(AuthStore);
  private readonly ordersApi = inject(OrdersApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);

  async checkout(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.toast.show("Connecte-toi pour commander", "warn");
      await this.router.navigate(["/connexion"]);
      return;
    }
    this.submitting.set(true);
    try {
      const order = await this.ordersApi.checkout(this.cart.items());
      this.cart.clear();
      this.ui.openOrders();
      this.toast.show(`Commande #${order.id} confirmée — ${order.total.toFixed(2)} €`, "success");
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.toast.show("Session expirée, reconnecte-toi", "warn");
        await this.router.navigate(["/connexion"]);
      } else {
        this.toast.show(this.detailMessage(error), "error");
      }
    } finally {
      this.submitting.set(false);
    }
  }

  private detailMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error as { detail?: string } | null)?.detail;
      if (detail) return detail;
    }
    return "Commande refusée";
  }
}
