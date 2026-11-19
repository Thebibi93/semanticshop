import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { UiStore } from "../../core/ui.store";
import { OrdersDrawer } from "./orders.drawer";

interface SetupResult {
  fixture: ComponentFixture<OrdersDrawer>;
  http: HttpTestingController;
  ui: UiStore;
  el: HTMLElement;
}

function setup(): SetupResult {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [OrdersDrawer],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const ui = TestBed.inject(UiStore);
  ui.openOrders();
  const fixture = TestBed.createComponent(OrdersDrawer);
  fixture.detectChanges();
  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    ui,
    el: fixture.nativeElement as HTMLElement,
  };
}

async function settle(fixture: ComponentFixture<OrdersDrawer>): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function textOf(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/[\u00a0\u202f\u2009]/g, " ");
}

describe("OrdersDrawer", () => {
  it("charge et affiche les commandes avec leurs lignes", async () => {
    const { fixture, http, el } = setup();
    const request = http.expectOne(
      (req) => req.url === "/api/orders" && req.headers.get("Authorization") === null
    );
    request.flush({
      count: 1,
      results: [
        {
          id: 3,
          status: "paid",
          total: 39.8,
          created_at: "2026-11-20T10:30:00Z",
          items: [{ product_id: 2, title: "Tee-shirt coton bio", quantity: 2, unit_price: 19.9 }],
        },
      ],
    });
    await settle(fixture);
    expect(textOf(el)).toContain("Commande #3");
    expect(textOf(el)).toContain("paid");
    expect(textOf(el)).toContain("2 × Tee-shirt coton bio — 19,90 €");
    expect(textOf(el)).toContain("39,80 €");
    http.verify();
  });

  it("affiche un message quand le chargement échoue", async () => {
    const { fixture, http, el } = setup();
    http
      .expectOne((req) => req.url === "/api/orders")
      .flush({ detail: "Jeton invalide" }, { status: 401, statusText: "Unauthorized" });
    await settle(fixture);
    expect(textOf(el)).toContain("Impossible de charger les commandes");
    http.verify();
  });

  it("affiche l'état vide sans commande", async () => {
    const { fixture, http, el } = setup();
    http.expectOne((req) => req.url === "/api/orders").flush({ count: 0, results: [] });
    await settle(fixture);
    expect(textOf(el)).toContain("Aucune commande pour le moment.");
    http.verify();
  });
});
