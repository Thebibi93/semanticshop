import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ProductCard } from "./product-card";
import { Product } from "../../core/models";

const product: Product = {
  id: 7,
  title: "Robe fluide été",
  description: "Coupe fluide, tissu respirant",
  category: "Vêtements",
  price: 49.9,
  stock: 5,
};

const outOfStock: Product = { ...product, id: 8, title: "Bottines cuir", stock: 0 };

function textOf(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/[\u00a0\u202f\u2009]/g, " ");
}

function render(item: Product, score: number | null = null): ComponentFixture<ProductCard> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ProductCard] });
  const fixture = TestBed.createComponent(ProductCard);
  fixture.componentRef.setInput("product", item);
  fixture.componentRef.setInput("score", score);
  fixture.detectChanges();
  return fixture;
}

describe("ProductCard", () => {
  it("affiche le produit, sa catégorie et son prix", () => {
    const fixture = render(product);
    expect(textOf(fixture.nativeElement as HTMLElement)).toContain("Robe fluide été");
    expect(textOf(fixture.nativeElement as HTMLElement)).toContain("Vêtements");
    expect(textOf(fixture.nativeElement as HTMLElement)).toContain("49,90 €");
    expect(textOf(fixture.nativeElement as HTMLElement)).toContain("En stock (5)");
  });

  it("affiche le badge de pertinence quand un score est fourni", () => {
    const fixture = render(product, 0.87);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("pertinence 87%");
  });

  it("n'affiche pas de badge sans score", () => {
    const fixture = render(product);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain("pertinence");
  });

  it("signale la rupture et désactive l'ajout au panier", () => {
    const fixture = render(outOfStock);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Rupture");
    const buttons = el.querySelectorAll<HTMLButtonElement>(".card-actions button");
    expect(buttons[0].disabled).toBe(true);
  });

  it("émet le produit quand on l'ajoute au panier", () => {
    const fixture = render(product);
    const el = fixture.nativeElement as HTMLElement;
    let added: Product | undefined;
    fixture.componentInstance.addToCart.subscribe((value) => (added = value));
    const buttons = el.querySelectorAll<HTMLButtonElement>(".card-actions button");
    buttons[0].click();
    expect(added?.id).toBe(7);
  });

  it("émet l'identifiant du produit pour les similaires", () => {
    const fixture = render(product);
    const el = fixture.nativeElement as HTMLElement;
    let similarId: number | undefined;
    fixture.componentInstance.showSimilar.subscribe((value) => (similarId = value));
    const buttons = el.querySelectorAll<HTMLButtonElement>(".card-actions button");
    buttons[1].click();
    expect(similarId).toBe(7);
  });
});
