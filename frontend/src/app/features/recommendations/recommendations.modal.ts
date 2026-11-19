import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { EurosPipe } from "../../core/euros.pipe";
import { Product } from "../../core/models";
import { CartStore } from "../../core/cart.store";
import { SemanticApi } from "../../core/semantic.api";
import { ToastService } from "../../core/toast.service";
import { UiStore } from "../../core/ui.store";

@Component({
  selector: "app-recommendations-modal",
  imports: [EurosPipe],
  templateUrl: "./recommendations.modal.html",
  styleUrl: "./recommendations.modal.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendationsModal {
  readonly ui = inject(UiStore);
  readonly cart = inject(CartStore);
  private readonly semanticApi = inject(SemanticApi);
  private readonly toast = inject(ToastService);

  readonly products = signal<Product[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.products() === null && this.error() === null);

  constructor() {
    this.load();
  }

  close(): void {
    this.ui.closeAll();
  }

  add(product: Product): void {
    this.cart.add(product);
    this.toast.show(`« ${product.title} » ajouté au panier`, "success");
  }

  scorePercent(score: number | undefined): number {
    return Math.round((score ?? 0) * 100);
  }

  private async load(): Promise<void> {
    const productId = this.ui.recommendationsProductId() ?? 0;
    try {
      const data = await this.semanticApi.recommendations(productId);
      this.products.set(data.results);
    } catch (error) {
      this.error.set(this.detailMessage(error));
    }
  }

  private detailMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error as { detail?: string } | null)?.detail;
      if (detail) return detail;
    }
    return "Recommandations indisponibles";
  }
}
