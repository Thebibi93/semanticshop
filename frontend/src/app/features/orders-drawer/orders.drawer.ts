import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { EurosPipe } from "../../core/euros.pipe";
import { Order } from "../../core/models";
import { OrdersApi } from "../../core/orders.api";
import { UiStore } from "../../core/ui.store";

@Component({
  selector: "app-orders-drawer",
  imports: [EurosPipe],
  templateUrl: "./orders.drawer.html",
  styleUrl: "./orders.drawer.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersDrawer {
  readonly ui = inject(UiStore);
  private readonly ordersApi = inject(OrdersApi);

  readonly orders = signal<Order[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.orders() === null && this.error() === null);

  constructor() {
    this.load();
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  }

  private async load(): Promise<void> {
    try {
      const data = await this.ordersApi.list();
      this.orders.set(data.results);
    } catch {
      this.error.set("Impossible de charger les commandes. Vérifie que tu es connecté.");
    }
  }
}
