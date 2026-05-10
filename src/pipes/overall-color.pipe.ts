import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'overallColor',
  standalone: true,
})
export class OverallColorPipe implements PipeTransform {
  transform(value: number): { circle: string; text: string; stroke: string } {
    if (value >= 96) {
      return { circle: 'bg-yellow-400', text: 'text-black', stroke: 'stroke-yellow-400' }; // Legendary / Gold
    }
    if (value >= 90) {
      return { circle: 'bg-purple-600', text: 'text-white', stroke: 'stroke-purple-600' }; // Elite / Purple
    }
    if (value >= 83) {
      return { circle: 'bg-green-500', text: 'text-white', stroke: 'stroke-green-500' }; // Great
    }
    if (value >= 75) {
      return { circle: 'bg-sky-500', text: 'text-white', stroke: 'stroke-sky-500' }; // Good
    }
    if (value >= 70) {
      return { circle: 'bg-orange-500', text: 'text-white', stroke: 'stroke-orange-500' }; // Decent
    }
    return { circle: 'bg-gray-500', text: 'text-white', stroke: 'stroke-gray-500' }; // Average
  }
}