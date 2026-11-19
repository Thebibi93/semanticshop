import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter, Router, Routes } from "@angular/router";
import { Component } from "@angular/core";
import { CatalogPage, Product, SearchResponse } from "../../core/models";
import { AuthStore } from "../../core/auth.store";
import { CartStore } from "../../core/cart.store";
import { ToastService } from "../../core/toast.service";
import { UiStore } from "../../core/ui.store";
import { authInterceptor } from "../../core/auth.interceptor";
import { SearchPage } from "./search.page";

@Component({ selector: "stub-empty", template: "" })
class StubEmpty {}

@Component({ selector: "stub-login", template: "" })
class StubLogin {}

const TEST_ROUTES: Routes = [
  { path: "", component: StubEmpty },
  { path: "connexion", component: StubLogin },
];

const catalogPage: CatalogPage = {
  count: 2,
  page: 1,
  page_size: 24,
  has_next: false,
  results: [
    {
      id: 1,
      title: "Robe fluide été",
      description: "Coupe fluide, tissu respirant",
      category: "Vêtements",
      price: 49.9,
      stock: 12,
    },
    {
      id: 2,
      title: "Tee-shirt coton bio",
      description: "Coton certifié",
      category: "Vêtements",
      price: 19.9,
      stock: 0,
    },
  ],
};

const searchResponse: SearchResponse = {
  query: "sneakers",
  count: 1,
  results: [
    {
      id: 5,
      title: "Sneakers urbaines",
      description: "Semelle amortissante",
      category: "Chaussures",
      price: 81.9,
      stock: 7,
      score: 0.92,
    },
  ],
};

interface SetupResult {
  fixture: ComponentFixture<SearchPage>;
  page: SearchPage;
  http: HttpTestingController;
  router: Router;
  auth: AuthStore;
  cart: CartStore;
  toast: ToastService;
  ui: UiStore;
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
    imports: [SearchPage],
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter(TEST_ROUTES),
    ],
  });
  const fixture = TestBed.createComponent(SearchPage);
  fixture.detectChanges();
  return {
    fixture,
    page: fixture.componentInstance,
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
    auth: TestBed.inject(AuthStore),
    cart: TestBed.inject(CartStore),
    toast: TestBed.inject(ToastService),
    ui: TestBed.inject(UiStore),
    el: fixture.nativeElement as HTMLElement,
  };
}

async function settle(fixture: ComponentFixture<SearchPage>): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function flushCatalog(http: HttpTestingController): void {
  http.expectOne("/api/products?page=1").flush(catalogPage);
}

describe("SearchPage", () => {
  it("affiche les nouveautés du catalogue au démarrage", async () => {
    const { fixture, el, http } = setup();
    flushCatalog(http);
    await settle(fixture);
    expect(el.textContent).toContain("Nouveautés du catalogue");
    expect(el.textContent).toContain("Robe fluide été");
    expect(el.textContent).toContain("Tee-shirt coton bio");
    expect(el.textContent).toContain("2 produit(s)");
    expect(el.textContent).not.toContain("pertinence");
    http.verify();
  });

  it("redirige vers la connexion avec la requête en attente si non connecté", async () => {
    const { fixture, page, http, router, auth } = setup();
    flushCatalog(http);
    await settle(fixture);
    page.query.set("robe légère");
    await page.runSearch();
    expect(router.url).toBe("/connexion");
    expect(auth.pendingQuery()).toBe("robe légère");
    http.verify();
  });

  it("lance la recherche avec filtres, jeton et scores", async () => {
    const { fixture, page, http, el } = setup("jwt-token");
    flushCatalog(http);
    await settle(fixture);
    page.query.set("sneakers");
    page.maxPrice.set("80");
    page.inStock.set(true);
    const promise = page.runSearch();
    const request = http.expectOne(
      (req) =>
        req.url === "/semantic/search/semantic" &&
        req.params.get("q") === "sneakers" &&
        req.params.get("limit") === "24" &&
        req.params.get("max_price") === "80" &&
        req.params.get("in_stock") === "true" &&
        req.headers.get("Authorization") === "Bearer jwt-token"
    );
    request.flush(searchResponse);
    await promise;
    await settle(fixture);
    expect(el.textContent).toContain("Résultats pour « sneakers »");
    expect(el.textContent).toContain("Sneakers urbaines");
    expect(el.textContent).toContain("pertinence 92%");
    expect(el.textContent).toContain("1 produit(s)");
    http.verify();
  });

  it("redirige vers la connexion quand la session a expiré", async () => {
    const { fixture, page, http, router, auth } = setup("jwt-token");
    flushCatalog(http);
    await settle(fixture);
    page.query.set("t-shirt");
    const promise = page.runSearch();
    const request = http.expectOne((req) => req.url === "/semantic/search/semantic");
    request.flush({ detail: "Jeton expiré" }, { status: 401, statusText: "Unauthorized" });
    await promise;
    expect(router.url).toBe("/connexion");
    expect(auth.pendingQuery()).toBe("t-shirt");
    http.verify();
  });

  it("relance automatiquement la recherche en attente après connexion", async () => {
    const { fixture, http, auth, el } = setup("jwt-token");
    auth.savePendingQuery("veste en cuir");
    fixture.detectChanges();
    flushCatalog(http);
    await settle(fixture);
    const request = http.expectOne(
      (req) => req.url === "/semantic/search/semantic" && req.params.get("q") === "veste en cuir"
    );
    request.flush({ query: "veste en cuir", count: 0, results: [] });
    await settle(fixture);
    expect(el.textContent).toContain("Résultats pour « veste en cuir »");
    http.verify();
  });

  it("affiche un avertissement quand la requête est vide", async () => {
    const { fixture, page, http, toast } = setup("jwt-token");
    flushCatalog(http);
    await settle(fixture);
    page.query.set("   ");
    await page.runSearch();
    expect(toast.toasts()[0].kind).toBe("warn");
    http.verify();
  });

  it("propose les recommandations d'un produit", async () => {
    const { fixture, page, http, ui } = setup("jwt-token");
    flushCatalog(http);
    await settle(fixture);
    await page.openSimilar(1);
    expect(ui.recommendationsProductId()).toBe(1);
    http.verify();
  });

  it("exige d'être connecté pour voir les recommandations", async () => {
    const { fixture, page, http, router } = setup();
    flushCatalog(http);
    await settle(fixture);
    await page.openSimilar(1);
    expect(router.url).toBe("/connexion");
    http.verify();
  });

  it("ajoute un produit du catalogue au panier", async () => {
    const { fixture, page, http, cart } = setup();
    flushCatalog(http);
    await settle(fixture);
    const item: Product = catalogPage.results[0];
    page.addToCart(item);
    expect(cart.count()).toBe(1);
    http.verify();
  });

  it("réinitialise les filtres", async () => {
    const { fixture, page, http } = setup("jwt-token");
    flushCatalog(http);
    await settle(fixture);
    page.maxPrice.set("50");
    page.inStock.set(true);
    page.resetFilters();
    expect(page.maxPrice()).toBe("");
    expect(page.inStock()).toBe(false);
    http.verify();
  });
});
