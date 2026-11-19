import { Routes } from "@angular/router";
import { SearchPage } from "./features/search/search.page";
import { LoginPage } from "./features/login/login.page";

export const routes: Routes = [
  { path: "", component: SearchPage, title: "SemanticShop — Recherche sémantique" },
  { path: "connexion", component: LoginPage, title: "SemanticShop — Connexion" },
  { path: "**", redirectTo: "" },
];
