import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { AuthStore } from "./core/auth.store";
import { CartStore } from "./core/cart.store";
import { ToastService } from "./core/toast.service";
import { UiStore } from "./core/ui.store";
import { Toasts } from "./core/toasts";
import { CartDrawer } from "./features/cart-drawer/cart.drawer";
import { OrdersDrawer } from "./features/orders-drawer/orders.drawer";
import { RecommendationsModal } from "./features/recommendations/recommendations.modal";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink, Toasts, CartDrawer, OrdersDrawer, RecommendationsModal],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(document:keydown.escape)": "onEscape()" },
})
export class App {
  readonly auth = inject(AuthStore);
  readonly cart = inject(CartStore);
  readonly ui = inject(UiStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  onEscape(): void {
    this.ui.closeAll();
  }

  async openOrders(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.toast.show("Connecte-toi pour voir tes commandes", "warn");
      await this.router.navigate(["/connexion"]);
      return;
    }
    this.ui.openOrders();
  }

  logout(): void {
    this.auth.logout();
    this.ui.closeAll();
    this.toast.show("Déconnecté", "info");
    this.router.navigate(["/"]);
  }
}
