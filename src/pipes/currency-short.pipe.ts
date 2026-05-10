import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyShort',
  standalone: true,
})
export class CurrencyShortPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value >= 1_000_000) {
      const millions = Math.floor(value / 100_000) / 10;
      return `€${millions.toFixed(1).replace('.', ',')}mi`;
    }
    if (value >= 100_000) {
      const thousands = Math.floor(value / 100_000) * 100;
      return `€${thousands}mil`;
    }
    if (value >= 1_000) {
      const thousands = Math.floor(value / 1_000);
      return `€${thousands}mil`;
    }
    return `€${value}`;
  }
}
