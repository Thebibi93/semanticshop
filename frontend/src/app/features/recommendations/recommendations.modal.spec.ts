import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { CartStore } from "../../core/cart.store";
import { UiStore } from "../../core/ui.store";
import { ToastService } from "../../core/toast.service";
import { Product } from "../../core/models";
import { RecommendationsModal } from "./recommendations.modal";

const product: Product = {
  id: 5,
  title: "Jupe en lin",
  description: null,
  category: "Vêtements",
  price: 39.9,
  stock: 4,
  score: 0.8,
};

const soldOut: Product = { ...product, id: 6, title: "Manteau laine", stock: 0, score: 0.72 };

interface SetupResult {
  fixture: ComponentFixture<RecommendationsModal>;
  http: HttpTestingController;
  ui: UiStore;
  cart: CartStore;
  toast: ToastService;
  el: HTMLElement;
}

function setup(): SetupResult {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RecommendationsModal],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const ui = TestBed.inject(UiStore);
  ui.openRecommendations(12);
  const fixture = TestBed.createComponent(RecommendationsModal);
  fixture.detectChanges();
  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    ui,
    cart: TestBed.inject(CartStore),
    toast: TestBed.inject(ToastService),
    el: fixture.nativeElement as HTMLElement,
  };
}

async function settle(fixture: ComponentFixture<RecommendationsModal>): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function textOf(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/[\u00a0\u202f\u2009]/g, " ");
}

describe("RecommendationsModal", () => {
  it("charge et affiche les produits similaires avec leur pertinence", async () => {
    const { fixture, http, el } = setup();
    const request = http.expectOne(
      (req) =>
        req.url === "/semantic/recommendations/12" &&
        req.params.get("limit") === "6" &&
        req.headers.get("Authorization") === null
    );
    request.flush({ product_id: 12, count: 2, results: [product, soldOut] });
    await settle(fixture);
    expect(textOf(el)).toContain("Produits similaires");
    expect(textOf(el)).toContain("Jupe en lin");
    expect(textOf(el)).toContain("pertinence 80%");
    expect(textOf(el)).toContain("pertinence 72%");
    const buttons = el.querySelectorAll<HTMLButtonElement>(".reco-actions button");
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
    http.verify();
  });

  it("affiche le message du service quand le produit n'est pas indexé", async () => {
    const { fixture, http, el } = setup();
    http
      .expectOne((req) => req.url === "/semantic/recommendations/12")
      .flush({ detail: "Produit introuvable ou non indexé" }, { status: 404, statusText: "Not Found" });
    await settle(fixture);
    expect(textOf(el)).toContain("Produit introuvable ou non indexé");
    http.verify();
  });

  it("ajoute un produit similaire au panier", async () => {
    const { fixture, http, cart, toast, el } = setup();
    http
      .expectOne((req) => req.url === "/semantic/recommendations/12")
      .flush({ product_id: 12, count: 1, results: [product] });
    await settle(fixture);
    const button = el.querySelector<HTMLButtonElement>(".reco-actions button");
    button?.click();
    fixture.detectChanges();
    expect(cart.count()).toBe(1);
    expect(toast.toasts()[0].kind).toBe("success");
    http.verify();
  });

  it("ferme la modale via le bouton", async () => {
    const { fixture, ui, http, el } = setup();
    http.expectOne((req) => req.url === "/semantic/recommendations/12").flush({
      product_id: 12,
      count: 0,
      results: [],
    });
    await settle(fixture);
    const button = el.querySelector<HTMLButtonElement>(".icon-btn");
    button?.click();
    fixture.detectChanges();
    expect(ui.recommendationsProductId()).toBeNull();
    http.verify();
  });
});
