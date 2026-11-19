import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: "euros" })
export class EurosPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return "";
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
  }
}
