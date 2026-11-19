import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { Router, RouterLink } from "@angular/router";
import { AuthStore } from "../../core/auth.store";
import { ApiError } from "../../core/models";
import { ToastService } from "../../core/toast.service";

@Component({
  selector: "app-login-page",
  imports: [RouterLink],
  templateUrl: "./login.page.html",
  styleUrl: "./login.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly username = signal("");
  readonly password = signal("");
  readonly submitting = signal(false);
  readonly error = signal("");

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    const username = this.username().trim();
    const password = this.password();
    if (!username || !password) {
      this.error.set("Renseigne ton identifiant et ton mot de passe");
      return;
    }
    this.submitting.set(true);
    this.error.set("");
    try {
      const user = await this.auth.login(username, password);
      this.toast.show(`Bienvenue ${user.username} !`, "success");
      await this.router.navigate(["/"]);
    } catch (error) {
      this.error.set(this.detailMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private detailMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error as ApiError | null)?.detail;
      if (detail) return detail;
    }
    return "Connexion impossible";
  }
}
