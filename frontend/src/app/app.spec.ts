import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter, Routes } from "@angular/router";
import { Component } from "@angular/core";
import { App } from "./app";
import { AuthStore } from "./core/auth.store";
import { CartStore } from "./core/cart.store";
import { UiStore } from "./core/ui.store";
import { Product } from "./core/models";

@Component({ selector: "stub-page", template: "" })
class StubPage {}

const TEST_ROUTES: Routes = [
  { path: "", component: StubPage },
  { path: "connexion", component: StubPage },
];

const product: Product = {
  id: 7,
  title: "Robe fluide été",
  description: null,
  category: "Vêtements",
  price: 49.9,
  stock: 5,
};

function setup(): {
  fixture: ComponentFixture<App>;
  auth: AuthStore;
  cart: CartStore;
  ui: UiStore;
  el: HTMLElement;
} {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [App],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(TEST_ROUTES)],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return {
    fixture,
    auth: TestBed.inject(AuthStore),
    cart: TestBed.inject(CartStore),
    ui: TestBed.inject(UiStore),
    el: fixture.nativeElement as HTMLElement,
  };
}

function seedSession(): void {
  localStorage.setItem("ss_token", "jwt-token");
  localStorage.setItem("ss_user", JSON.stringify({ username: "demo", role: "customer" }));
}

describe("App", () => {
  it("affiche la marque et le bouton de connexion quand personne n'est connecté", () => {
    const { el } = setup();
    expect(el.querySelector(".brand")?.textContent).toContain("SemanticShop");
    expect(el.textContent).toContain("Connexion");
    expect(el.textContent).not.toContain("Déconnexion");
  });

  it("affiche l'utilisateur connecté et le bouton de déconnexion", () => {
    localStorage.clear();
    seedSession();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(TEST_ROUTES)],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".user-chip")?.textContent).toContain("demo");
    expect(el.textContent).toContain("Déconnexion");
  });

  it("affiche le nombre d'articles du panier dans le badge", () => {
    const { fixture, cart, el } = setup();
    cart.add(product);
    cart.add(product);
    fixture.detectChanges();
    expect(el.querySelector(".badge")?.textContent?.trim()).toBe("2");
  });

  it("ferme les panneaux quand la touche Échap est pressée", () => {
    const { fixture, ui } = setup();
    ui.openCart();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "escape" }));
    fixture.detectChanges();
    expect(ui.cartOpen()).toBe(false);
  });
});
