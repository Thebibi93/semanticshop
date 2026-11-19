import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { CartItem, Order, OrdersResponse } from "./models";

@Injectable({ providedIn: "root" })
export class OrdersApi {
  private readonly http = inject(HttpClient);

  async list(): Promise<OrdersResponse> {
    return await firstValueFrom(this.http.get<OrdersResponse>("/api/orders"));
  }

  async checkout(items: CartItem[]): Promise<Order> {
    const payload = items.map((item) => ({ product_id: item.productId, quantity: item.quantity }));
    return await firstValueFrom(this.http.post<Order>("/api/orders", { items: payload }));
  }
}
