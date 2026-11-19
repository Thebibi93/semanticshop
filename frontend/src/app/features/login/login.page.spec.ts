import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter, Router, Routes } from "@angular/router";
import { Component } from "@angular/core";
import { AuthStore } from "../../core/auth.store";
import { ToastService } from "../../core/toast.service";
import { LoginPage } from "./login.page";

@Component({ selector: "stub-empty", template: "" })
class StubEmpty {}

const TEST_ROUTES: Routes = [{ path: "", component: StubEmpty }];

interface SetupResult {
  fixture: ComponentFixture<LoginPage>;
  page: LoginPage;
  http: HttpTestingController;
  router: Router;
  auth: AuthStore;
  toast: ToastService;
}

function setup(): SetupResult {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(TEST_ROUTES)],
  });
  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  return {
    fixture,
    page: fixture.componentInstance,
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
    auth: TestBed.inject(AuthStore),
    toast: TestBed.inject(ToastService),
  };
}

describe("LoginPage", () => {
  it("connecte l'utilisateur et revient à la recherche", async () => {
    const { page, http, router, auth, toast } = setup();
    auth.savePendingQuery("robe légère");
    page.username.set("demo");
    page.password.set("demo1234");
    const promise = page.submit(new Event("submit"));
    const request = http.expectOne("/api/auth/login");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({ username: "demo", password: "demo1234" });
    request.flush({ token: "jwt-token", username: "demo", role: "customer", expires_in: 86400 });
    await promise;
    expect(auth.token()).toBe("jwt-token");
    expect(auth.user()).toEqual({ username: "demo", role: "customer" });
    expect(auth.pendingQuery()).toBe("robe légère");
    expect(router.url).toBe("/");
    expect(toast.toasts()[0].message).toBe("Bienvenue demo !");
    http.verify();
  });

  it("affiche le détail renvoyé quand les identifiants sont invalides", async () => {
    const { page, http, auth } = setup();
    page.username.set("demo");
    page.password.set("mauvais");
    const promise = page.submit(new Event("submit"));
    http
      .expectOne("/api/auth/login")
      .flush({ detail: "Identifiants invalides" }, { status: 401, statusText: "Unauthorized" });
    await promise;
    expect(page.error()).toBe("Identifiants invalides");
    expect(auth.token()).toBe("");
    http.verify();
  });

  it("bloque la soumission sans identifiants", async () => {
    const { page, http } = setup();
    await page.submit(new Event("submit"));
    expect(page.error()).toContain("Renseigne");
    http.verify();
  });
});
