import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { RecommendationsResponse, SearchResponse } from "./models";

@Injectable({ providedIn: "root" })
export class SemanticApi {
  private readonly http = inject(HttpClient);

  async search(
    query: string,
    maxPrice: number | null,
    inStock: boolean,
    limit = 24
  ): Promise<SearchResponse> {
    let params = new HttpParams().set("q", query).set("limit", limit);
    if (maxPrice !== null) params = params.set("max_price", maxPrice);
    if (inStock) params = params.set("in_stock", "true");
    return await firstValueFrom(
      this.http.get<SearchResponse>("/semantic/search/semantic", { params })
    );
  }

  async recommendations(productId: number, limit = 6): Promise<RecommendationsResponse> {
    const params = new HttpParams().set("limit", limit);
    return await firstValueFrom(
      this.http.get<RecommendationsResponse>(`/semantic/recommendations/${productId}`, { params })
    );
  }
}
