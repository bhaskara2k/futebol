import { Component, ChangeDetectionStrategy, input, computed, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../models';
import { UniverseService } from '../../services/universe.service';

@Component({
  selector: 'app-fixtures',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fixtures.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FixturesComponent {
  fixtures = input.required<Match[]>();
  round = input.required<number>();
  status = input.required<'ongoing' | 'finished'>();
  viewMatchDetails = output<Match>();
  simulateMatch = output<string>();
  setManualResult = output<Match>();

  public universeService = inject(UniverseService);

  divisionName = computed(() => {
    const fixtures = this.fixtures();
    if(fixtures.length > 0) {
      // All fixtures are from the same division, so we can take the first one.
      return fixtures[0].divisionName;
    }
    return '';
  })

  openMatchDetails(match: Match): void {
    if (match.played) {
      this.viewMatchDetails.emit(match);
    }
  }
  
  onSimulateMatch(matchId: string): void {
    this.simulateMatch.emit(matchId);
  }

  onSetManualResult(match: Match): void {
    this.setManualResult.emit(match);
  }

  tryPngFallback(event: any): void {
    const img = event.target as HTMLImageElement;
    if (img.src.includes('.svg')) {
      img.src = img.src.replace('.svg', '.png');
    } else {
      img.style.display = 'none';
    }
  }
}