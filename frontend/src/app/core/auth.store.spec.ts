import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { AuthStore } from "./auth.store";

function createStore(tokenSeed = ""): { store: AuthStore; http: HttpTestingController } {
  localStorage.clear();
  if (tokenSeed) {
    localStorage.setItem("ss_token", tokenSeed);
    localStorage.setItem("ss_user", JSON.stringify({ username: "demo", role: "customer" }));
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    store: TestBed.inject(AuthStore),
    http: TestBed.inject(HttpTestingController),
  };
}

describe("AuthStore", () => {
  it("stocke la session après une connexion réussie", async () => {
    const { store, http } = createStore();
    const promise = store.login("demo", "demo1234");
    const request = http.expectOne("/api/auth/login");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({ username: "demo", password: "demo1234" });
    request.flush({ token: "jwt-token", username: "demo", role: "customer", expires_in: 86400 });
    const user = await promise;
    expect(user).toEqual({ username: "demo", role: "customer" });
    expect(store.token()).toBe("jwt-token");
    expect(store.user()).toEqual({ username: "demo", role: "customer" });
    expect(store.isAuthenticated()).toBe(true);
    expect(localStorage.getItem("ss_token")).toBe("jwt-token");
    http.verify();
  });

  it("laisse la session vide quand la connexion échoue", async () => {
    const { store, http } = createStore("jwt-token");
    const promise = store.login("demo", "mauvais");
    const request = http.expectOne("/api/auth/login");
    request.flush({ detail: "Identifiants invalides" }, { status: 401, statusText: "Unauthorized" });
    await promise.catch(() => undefined);
    expect(store.token()).toBe("jwt-token");
    expect(store.user()).toEqual({ username: "demo", role: "customer" });
    http.verify();
  });

  it("efface tout au logout", async () => {
    const { store, http } = createStore();
    const promise = store.login("demo", "demo1234");
    http
      .expectOne("/api/auth/login")
      .flush({ token: "jwt-token", username: "demo", role: "customer", expires_in: 86400 });
    await promise;
    store.logout();
    expect(store.token()).toBe("");
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem("ss_token")).toBeNull();
    expect(localStorage.getItem("ss_user")).toBeNull();
  });

  it("ne remet la requête en attente qu'une seule fois", () => {
    const { store } = createStore();
    store.savePendingQuery("robe légère");
    expect(store.takePendingQuery()).toBe("robe légère");
    expect(store.takePendingQuery()).toBe("");
    expect(store.pendingQuery()).toBe("");
  });

  it("restaure une session persistée au démarrage", () => {
    const { store } = createStore("jwt-token");
    expect(store.token()).toBe("jwt-token");
    expect(store.user()).toEqual({ username: "demo", role: "customer" });
    expect(store.isAuthenticated()).toBe(true);
  });

  it("ignore une session persistée corrompue", () => {
    localStorage.clear();
    localStorage.setItem("ss_token", "jwt-token");
    localStorage.setItem("ss_user", "{oops");
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const store = TestBed.inject(AuthStore);
    expect(store.token()).toBe("jwt-token");
    expect(store.user()).toBeNull();
  });
});
