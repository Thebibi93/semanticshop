import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class UiStore {
  readonly cartOpen = signal(false);
  readonly ordersOpen = signal(false);
  readonly recommendationsProductId = signal<number | null>(null);

  openCart(): void {
    this.cartOpen.set(true);
    this.ordersOpen.set(false);
  }

  openOrders(): void {
    this.ordersOpen.set(true);
    this.cartOpen.set(false);
  }

  openRecommendations(productId: number): void {
    this.recommendationsProductId.set(productId);
  }

  closeAll(): void {
    this.cartOpen.set(false);
    this.ordersOpen.set(false);
    this.recommendationsProductId.set(null);
  }
}
