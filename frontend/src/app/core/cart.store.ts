import { Injectable, computed, signal } from "@angular/core";
import { CartItem, Product } from "./models";

const CART_KEY = "ss_cart";

@Injectable({ providedIn: "root" })
export class CartStore {
  readonly items = signal<CartItem[]>(this.restore());
  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  private restore(): CartItem[] {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(CART_KEY, JSON.stringify(this.items()));
  }

  add(product: Product): void {
    const existing = this.items().some((item) => item.productId === product.id);
    this.items.update((items) =>
      existing
        ? items.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [
            ...items,
            { productId: product.id, title: product.title, price: product.price, quantity: 1 },
          ]
    );
    this.persist();
  }

  increment(productId: number): void {
    this.items.update((items) =>
      items.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
    this.persist();
  }

  decrement(productId: number): void {
    this.items.update((items) =>
      items.flatMap((item) => {
        if (item.productId !== productId) return [item];
        return item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : [];
      })
    );
    this.persist();
  }

  remove(productId: number): void {
    this.items.update((items) => items.filter((item) => item.productId !== productId));
    this.persist();
  }

  clear(): void {
    this.items.set([]);
    localStorage.removeItem(CART_KEY);
  }
}
