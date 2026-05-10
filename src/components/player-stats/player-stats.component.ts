import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '../../models';
import { UniverseService } from '../../services/universe.service';
import { NATIONALITIES } from '../../nationalities.data';

@Component({
  selector: 'app-player-stats',
  imports: [CommonModule],
  templateUrl: './player-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerStatsComponent {
  universeService = inject(UniverseService);

  topScorers = input.required<Player[]>();
  topAssists = input.required<Player[]>();
  topMotm = input.required<Player[]>();
  statType = input.required<'league' | 'cup' | 'international' | 'worldCup' | 'worldCupQualifier' | 'youth'>();

  getPlayerTeamName(playerId: string): string {
    const team = this.universeService.teams().find(t => t.players.some(p => p.id === playerId));
    return team ? team.teamName : 'Free Agent';
  }

  getFlagUrl(nationalityId: string): string {
    const nation = NATIONALITIES.find(n => n.code3 === nationalityId);
    const code = nation ? nation.code2.toLowerCase() : 'xx';
    return `https://flagcdn.com/w20/${code}.png`;
  }
}