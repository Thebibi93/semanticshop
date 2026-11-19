import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter, Router, Routes } from "@angular/router";
import { Component } from "@angular/core";
import { Product } from "../../core/models";
import { AuthStore } from "../../core/auth.store";
import { CartStore } from "../../core/cart.store";
import { Order } from "../../core/models";
import { ToastService } from "../../core/toast.service";
import { UiStore } from "../../core/ui.store";
import { authInterceptor } from "../../core/auth.interceptor";
import { CartDrawer } from "./cart.drawer";

@Component({ selector: "stub-empty", template: "" })
class StubEmpty {}

@Component({ selector: "stub-login", template: "" })
class StubLogin {}

const TEST_ROUTES: Routes = [
  { path: "", component: StubEmpty },
  { path: "connexion", component: StubLogin },
];

const product: Product = {
  id: 7,
  title: "Robe fluide été",
  description: null,
  category: "Vêtements",
  price: 49.9,
  stock: 5,
};

const order: Order = {
  id: 3,
  status: "pending",
  total: 99.8,
  created_at: "2026-11-20T10:30:00Z",
  items: [{ product_id: 7, title: "Robe fluide été", quantity: 2, unit_price: 49.9 }],
};

interface SetupResult {
  fixture: ComponentFixture<CartDrawer>;
  page: CartDrawer;
  http: HttpTestingController;
  router: Router;
  cart: CartStore;
  ui: UiStore;
  toast: ToastService;
  el: HTMLElement;
}

function setup(tokenSeed = ""): SetupResult {
  localStorage.clear();
  if (tokenSeed) {
    localStorage.setItem("ss_token", tokenSeed);
    localStorage.setItem("ss_user", JSON.stringify({ username: "demo", role: "customer" }));
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CartDrawer],
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter(TEST_ROUTES),
    ],
  });
  const fixture = TestBed.createComponent(CartDrawer);
  fixture.detectChanges();
  return {
    fixture,
    page: fixture.componentInstance,
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
    cart: TestBed.inject(CartStore),
    ui: TestBed.inject(UiStore),
    toast: TestBed.inject(ToastService),
    el: fixture.nativeElement as HTMLElement,
  };
}

async function settle(fixture: ComponentFixture<CartDrawer>): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function textOf(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/[\u00a0\u202f\u2009]/g, " ");
}

describe("CartDrawer", () => {
  it("n'affiche rien quand le panier est fermé", () => {
    const { el } = setup();
    expect(el.querySelector(".drawer")).toBeNull();
  });

  it("affiche l'état vide d'un panier ouvert", () => {
    const { ui, el, fixture } = setup();
    ui.openCart();
    fixture.detectChanges();
    expect(el.querySelector(".drawer")).not.toBeNull();
    expect(el.textContent).toContain("Ton panier est vide.");
  });

  it("affiche les articles et le total", () => {
    const { ui, cart, el, fixture } = setup();
    cart.add(product);
    ui.openCart();
    fixture.detectChanges();
    const text = textOf(el);
    expect(text).toContain("Robe fluide été");
    expect(text).toContain("49,90 € × 1");
    expect(text).toContain("Total estimé");
    expect(text).toContain("49,90 €");
  });

  it("retire la ligne quand la quantité atteint zéro", () => {
    const { ui, cart, el, fixture } = setup();
    cart.add(product);
    ui.openCart();
    fixture.detectChanges();
    const decrement = el.querySelector<HTMLButtonElement>(".qty");
    decrement?.click();
    fixture.detectChanges();
    expect(cart.items().length).toBe(0);
    expect(el.textContent).toContain("Ton panier est vide.");
  });

  it("confirme la commande, vide le panier et ouvre les commandes", async () => {
    const { fixture, page, ui, cart, http, toast } = setup("jwt-token");
    cart.add(product);
    cart.add(product);
    ui.openCart();
    fixture.detectChanges();
    const promise = page.checkout();
    const request = http.expectOne("/api/orders");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({ items: [{ product_id: 7, quantity: 2 }] });
    expect(request.request.headers.get("Authorization")).toBe("Bearer jwt-token");
    request.flush(order, { status: 201, statusText: "Created" });
    await promise;
    await settle(fixture);
    expect(cart.items().length).toBe(0);
    expect(ui.ordersOpen()).toBe(true);
    expect(toast.toasts()[0].kind).toBe("success");
    expect(toast.toasts()[0].message).toContain("Commande #3 confirmée");
    http.verify();
  });

  it("conserve le panier quand le stock est insuffisant", async () => {
    const { page, ui, cart, http, toast } = setup("jwt-token");
    cart.add(product);
    ui.openCart();
    const promise = page.checkout();
    http
      .expectOne("/api/orders")
      .flush(
        { detail: "Stock insuffisant pour « Robe fluide été »" },
        { status: 409, statusText: "Conflict" }
      );
    await promise;
    expect(cart.items().length).toBe(1);
    expect(toast.toasts()[0].kind).toBe("error");
    expect(toast.toasts()[0].message).toContain("Stock insuffisant");
    http.verify();
  });

  it("redirige vers la connexion quand on commande sans session", async () => {
    const { page, router, cart, http, ui } = setup();
    cart.add(product);
    ui.openCart();
    await page.checkout();
    expect(router.url).toBe("/connexion");
    http.verify();
  });
});
