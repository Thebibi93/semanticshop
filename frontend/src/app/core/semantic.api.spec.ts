import { TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { SemanticApi } from "./semantic.api";
import { authInterceptor } from "./auth.interceptor";

function createApi(tokenSeed = ""): { api: SemanticApi; http: HttpTestingController } {
  localStorage.clear();
  if (tokenSeed) {
    localStorage.setItem("ss_token", tokenSeed);
    localStorage.setItem("ss_user", JSON.stringify({ username: "demo", role: "customer" }));
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  });
  return {
    api: TestBed.inject(SemanticApi),
    http: TestBed.inject(HttpTestingController),
  };
}

describe("SemanticApi", () => {
  it("envoie la recherche avec les filtres et le jeton bearer", async () => {
    const { api, http } = createApi("jwt-token");
    const promise = api.search("robe légère", 49.9, true, 12);
    const request = http.expectOne(
      (req) =>
        req.url === "/semantic/search/semantic" &&
        req.params.get("q") === "robe légère" &&
        req.params.get("limit") === "12" &&
        req.params.get("max_price") === "49.9" &&
        req.params.get("in_stock") === "true" &&
        req.headers.get("Authorization") === "Bearer jwt-token"
    );
    request.flush({ query: "robe légère", count: 0, results: [] });
    const response = await promise;
    expect(response.query).toBe("robe légère");
    http.verify();
  });

  it("omet les filtres non renseignés", async () => {
    const { api, http } = createApi();
    const promise = api.search("sneakers", null, false);
    const request = http.expectOne(
      (req) =>
        req.url === "/semantic/search/semantic" &&
        req.params.get("q") === "sneakers" &&
        req.params.get("limit") === "24" &&
        req.params.get("max_price") === null &&
        req.params.get("in_stock") === null &&
        req.headers.get("Authorization") === null
    );
    request.flush({ query: "sneakers", count: 0, results: [] });
    await promise;
    http.verify();
  });

  it("récupère les recommandations d'un produit", async () => {
    const { api, http } = createApi("jwt-token");
    const promise = api.recommendations(12);
    const request = http.expectOne(
      (req) =>
        req.url === "/semantic/recommendations/12" &&
        req.params.get("limit") === "6" &&
        req.headers.get("Authorization") === "Bearer jwt-token"
    );
    request.flush({
      product_id: 12,
      count: 1,
      results: [
        {
          id: 5,
          title: "Juile en lin",
          description: null,
          category: "Vêtements",
          price: 39.9,
          stock: 4,
          score: 0.81,
        },
      ],
    });
    const response = await promise;
    expect(response.count).toBe(1);
    expect(response.results[0].score).toBeCloseTo(0.81);
    http.verify();
  });
});
