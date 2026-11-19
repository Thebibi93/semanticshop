import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { EurosPipe } from "../../core/euros.pipe";
import { Product } from "../../core/models";

@Component({
  selector: "app-product-card",
  imports: [EurosPipe],
  templateUrl: "./product-card.html",
  styleUrl: "./product-card.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly score = input<number | null>(null);
  readonly addToCart = output<Product>();
  readonly showSimilar = output<number>();

  readonly inStock = computed(() => this.product().stock > 0);
  readonly scorePercent = computed(() => {
    const score = this.score();
    return score === null ? null : Math.round(score * 100);
  });
}
