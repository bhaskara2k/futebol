import { Component, ChangeDetectionStrategy, input, output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cup, CupMatch, CupRound, Team } from '../../models';
import { UniverseService } from '../../services/universe.service';

@Component({
  selector: 'app-cup-view',
  imports: [CommonModule],
  templateUrl: './cup-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CupViewComponent {
  cup = input.required<Cup>();
  countryName = input.required<string>();
  cupType = input<'main' | 'league' | 'supercup'>('main');
  isInternational = input<boolean>(false);

  public universeService = inject(UniverseService);

  simulateMatch = output<{ matchId: string, roundName: string, leg: 1 | 2, cupType: 'main' | 'league' | 'supercup' }>();
  simulateRound = output<{ roundName: string, cupType: 'main' | 'league' | 'supercup' }>();
  viewMatchDetails = output<{ cupMatch: CupMatch, leg: 1 | 2 }>();
  setManualResult = output<{ match: CupMatch, roundName: string, leg: 1 | 2, cupType: 'main' | 'league' | 'supercup' }>();

  onSimulateLeg(matchId: string, roundName: string, leg: 1 | 2): void {
    this.simulateMatch.emit({ matchId, roundName, leg, cupType: this.cupType() });
  }

  onSimulateRound(roundName: string): void {
    this.simulateRound.emit({ roundName, cupType: this.cupType() });
  }

  getAggregateScore(match: CupMatch): { home: number; away: number } | null {
    if (!match.leg2Played) return null;
    return {
      home: match.homeScoreLeg1! + match.awayScoreLeg2!,
      away: match.awayScoreLeg1! + match.homeScoreLeg2!,
    };
  }

  getWinnerName(match: CupMatch): string | null {
    if (!match.played) return null;

    let winner: Team | undefined;
    if (match.aggregateWinnerId) {
      winner = match.aggregateWinnerId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
    } else if (match.winner) {
      winner = match.winner;
    }

    if (!winner) return null;

    if (match.homePenalties !== undefined && match.awayPenalties !== undefined && match.homePenalties !== match.awayPenalties) {
      return `${winner.teamName} (${Math.max(match.homePenalties, match.awayPenalties)}-${Math.min(match.homePenalties, match.awayPenalties)})`;
    }

    return winner.teamName;
  }

  hasUnplayedMatches(round: CupRound): boolean {
    return round.matches.some(m => !m.played);
  }

  tryPngFallback(event: any): void {
    const img = event.target as HTMLImageElement;
    if (img.src.includes('.svg')) {
      img.src = img.src.replace('.svg', '.png');
    } else {
      img.style.display = 'none';
    }
  }

  getTeamAcronym(teamName: string): string {
    return this.universeService.getTeamAcronym(teamName);
  }
}