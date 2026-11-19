import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import { AuthStore } from "../../core/auth.store";
import { CatalogApi } from "../../core/catalog.api";
import { CartStore } from "../../core/cart.store";
import { Product } from "../../core/models";
import { SemanticApi } from "../../core/semantic.api";
import { ToastService } from "../../core/toast.service";
import { UiStore } from "../../core/ui.store";
import { ProductCard } from "../product-card/product-card";

@Component({
  selector: "app-search-page",
  imports: [ProductCard],
  templateUrl: "./search.page.html",
  styleUrl: "./search.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage implements OnInit {
  readonly auth = inject(AuthStore);
  readonly cart = inject(CartStore);
  readonly ui = inject(UiStore);
  private readonly catalogApi = inject(CatalogApi);
  private readonly semanticApi = inject(SemanticApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly query = signal("");
  readonly maxPrice = signal("");
  readonly inStock = signal(false);
  readonly results = signal<Product[] | null>(null);
  readonly resultCount = signal<number | null>(null);
  readonly resultTitle = signal("Nouveautés du catalogue");
  readonly showScores = signal(false);
  readonly loadingCatalog = signal(true);
  readonly searching = signal(false);
  readonly shownResults = computed(() => this.results() ?? []);
  readonly hasResults = computed(() => this.shownResults().length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadCatalog();
    const pending = this.auth.takePendingQuery();
    if (pending) {
      this.query.set(pending);
      await this.runSearch();
    }
  }

  async onSearch(event: Event): Promise<void> {
    event.preventDefault();
    await this.runSearch();
  }

  async runSearch(): Promise<void> {
    const query = this.query().trim();
    if (!query) {
      this.toast.show("Décris le produit recherché", "warn");
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.auth.savePendingQuery(query);
      this.toast.show("Connecte-toi pour lancer une recherche sémantique", "warn");
      await this.router.navigate(["/connexion"]);
      return;
    }
    this.searching.set(true);
    try {
      const data = await this.semanticApi.search(query, this.parsedMaxPrice(), this.inStock());
      this.results.set(data.results);
      this.resultCount.set(data.count);
      this.resultTitle.set(`Résultats pour « ${data.query} »`);
      this.showScores.set(true);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.auth.savePendingQuery(query);
        this.toast.show("Session expirée, reconnecte-toi", "warn");
        await this.router.navigate(["/connexion"]);
      } else {
        this.toast.show(this.detailMessage(error, "Recherche impossible"), "error");
      }
    } finally {
      this.searching.set(false);
    }
  }

  resetFilters(): void {
    this.maxPrice.set("");
    this.inStock.set(false);
  }

  addToCart(product: Product): void {
    this.cart.add(product);
    this.toast.show(`« ${product.title} » ajouté au panier`, "success");
  }

  async openSimilar(productId: number): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.toast.show("Connecte-toi pour voir les recommandations", "warn");
      await this.router.navigate(["/connexion"]);
      return;
    }
    this.ui.openRecommendations(productId);
  }

  private async loadCatalog(): Promise<void> {
    try {
      const page = await this.catalogApi.page(1);
      this.results.set(page.results);
      this.resultCount.set(page.count);
      this.resultTitle.set("Nouveautés du catalogue");
      this.showScores.set(false);
    } catch {
      this.toast.show("Catalogue indisponible", "error");
    } finally {
      this.loadingCatalog.set(false);
    }
  }

  private parsedMaxPrice(): number | null {
    const raw = this.maxPrice().trim();
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  private detailMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error as { detail?: string } | null)?.detail;
      if (detail) return detail;
    }
    return fallback;
  }
}
