import { TestBed } from "@angular/core/testing";
import { CartStore } from "./cart.store";
import { Product } from "./models";

const product: Product = {
  id: 7,
  title: "Robe fluide été",
  description: null,
  category: "Vêtements",
  price: 49.9,
  stock: 5,
};

const other: Product = {
  id: 9,
  title: "Sneakers urbaines",
  description: null,
  category: "Chaussures",
  price: 81.9,
  stock: 3,
};

function createStore(): CartStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(CartStore);
}

describe("CartStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("ajoute un nouveau produit", () => {
    const store = createStore();
    store.add(product);
    expect(store.items()).toEqual([
      { productId: 7, title: "Robe fluide été", price: 49.9, quantity: 1 },
    ]);
    expect(store.count()).toBe(1);
    expect(store.total()).toBeCloseTo(49.9);
  });

  it("incrémente la quantité quand le produit est déjà présent", () => {
    const store = createStore();
    store.add(product);
    store.add(product);
    expect(store.count()).toBe(2);
    expect(store.total()).toBeCloseTo(99.8);
    expect(store.items()[0].quantity).toBe(2);
  });

  it("décrémente puis retire la ligne passée à zéro", () => {
    const store = createStore();
    store.add(product);
    store.add(product);
    store.decrement(7);
    expect(store.items()[0].quantity).toBe(1);
    store.decrement(7);
    expect(store.items()).toEqual([]);
    expect(store.count()).toBe(0);
  });

  it("supprime directement une ligne", () => {
    const store = createStore();
    store.add(product);
    store.add(other);
    store.remove(7);
    expect(store.items().map((item) => item.productId)).toEqual([9]);
  });

  it("vide le panier", () => {
    const store = createStore();
    store.add(product);
    store.clear();
    expect(store.items()).toEqual([]);
    expect(localStorage.getItem("ss_cart")).toBeNull();
  });

  it("persiste le panier entre deux instanciations", () => {
    const store = createStore();
    store.add(product);
    store.add(other);
    const restored = createStore();
    expect(restored.items().length).toBe(2);
    expect(restored.count()).toBe(2);
  });
});
