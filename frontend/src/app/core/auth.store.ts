import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { LoginResponse, SessionUser } from "./models";

const TOKEN_KEY = "ss_token";
const USER_KEY = "ss_user";

@Injectable({ providedIn: "root" })
export class AuthStore {
  private readonly http = inject(HttpClient);
  readonly token = signal(localStorage.getItem(TOKEN_KEY) ?? "");
  readonly user = signal<SessionUser | null>(this.restoreUser());
  readonly pendingQuery = signal("");
  readonly isAuthenticated = computed(() => this.token().length > 0);

  private restoreUser(): SessionUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }

  async login(username: string, password: string): Promise<SessionUser> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>("/api/auth/login", { username, password })
    );
    const user: SessionUser = { username: response.username, role: response.role };
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.token.set(response.token);
    this.user.set(user);
    return user;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set("");
    this.user.set(null);
    this.pendingQuery.set("");
  }

  savePendingQuery(query: string): void {
    this.pendingQuery.set(query);
  }

  takePendingQuery(): string {
    const query = this.pendingQuery();
    this.pendingQuery.set("");
    return query;
  }
}
