import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { CatalogPage } from "./models";

@Injectable({ providedIn: "root" })
export class CatalogApi {
  private readonly http = inject(HttpClient);

  async page(page = 1): Promise<CatalogPage> {
    return await firstValueFrom(this.http.get<CatalogPage>("/api/products", { params: { page } }));
  }
}
