import { Component, ChangeDetectionStrategy, input, signal, computed, inject, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InternationalCompetition, Player, Team, CupMatch } from '../../models';
import { LeagueTableComponent } from '../league-table/league-table.component';
import { FixturesComponent } from '../fixtures/fixtures.component';
import { PlayerStatsComponent } from '../player-stats/player-stats.component';
import { CupViewComponent } from '../cup-view/cup-view.component';
import { UniverseService } from '../../services/universe.service';
import { TeamsViewComponent } from '../teams-view/teams-view.component';
import { HistoryViewComponent } from '../history-view/history-view.component';
import { InternationalCompetitionService } from '../../services/international-competition.service';

@Component({
  selector: 'app-international-competition-view',
  imports: [CommonModule, LeagueTableComponent, FixturesComponent, PlayerStatsComponent, CupViewComponent, TeamsViewComponent, HistoryViewComponent],
  templateUrl: './international-competition-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternationalCompetitionViewComponent {
  competition = input.required<InternationalCompetition>();
  allContinentCompetitions = input<InternationalCompetition[]>([]);
  universeService = inject(UniverseService);
  competitionService = inject(InternationalCompetitionService);

  activeTab = signal<'playoffs' | 'league' | 'knockout' | 'stats' | 'teams' | 'history'>('league');

  viewPlayerDetails = output<{ player: Player, team: Team }>();
  viewTeamDetails = output<Team>();
  viewMatchDetails = output<{ cupMatch: CupMatch, leg: 1 | 2 }>();
  setManualResult = output<any>();
  setManualCupResult = output<any>();

  statType = computed<'international' | 'worldCup' | 'worldCupQualifier' | 'youth'>(() => {
    const compId = this.competition().id;
    if (compId === 'EUR_YCL') {
      return 'youth';
    }
    if (compId.startsWith('WC_Q_')) {
      return 'worldCupQualifier';
    }
    const isWorldCupTier = compId === 'WORLD_CWC';
    return isWorldCupTier ? 'worldCup' : 'international';
  });

  constructor() {
    effect(() => {
      const status = this.competition().status;
      if (status === 'playoffs') {
        this.activeTab.set('playoffs');
      } else if (status === 'league') {
        this.activeTab.set('league');
      } else if (status === 'knockout' || status === 'finished') {
        this.activeTab.set('knockout');
      }
    });
  }


  canAdvance = computed(() => {
    const allComps = this.allContinentCompetitions();
    const thisComp = this.competition();

    // Fallback for single-competition continents or when the input isn't provided yet.
    if (!allComps || allComps.length <= 1) {
      if (thisComp.status !== 'league' || thisComp.currentLeagueRound >= thisComp.totalLeagueRounds) {
        return false;
      }
      return thisComp.leaguePhase.every(group =>
        group.fixtures[thisComp.currentLeagueRound]?.every(m => m.played) ?? false
      );
    }

    // For multi-competition continents (SAM, EUR)
    const activeLeagueComps = allComps.filter(c => c.status === 'league');
    if (activeLeagueComps.length === 0) return false;

    // Ensure all active competitions are on the same round
    const firstRound = activeLeagueComps[0].currentLeagueRound;
    if (!activeLeagueComps.every(c => c.currentLeagueRound === firstRound)) {
      return false;
    }

    // Check if all matches in the current round for ALL active competitions are played
    return activeLeagueComps.every(comp =>
      comp.currentLeagueRound < comp.totalLeagueRounds &&
      comp.leaguePhase.every(group =>
        group.fixtures[comp.currentLeagueRound]?.every(m => m.played) ?? false
      )
    );
  });

  simulateLeagueRound() {
    this.competitionService.simulateInternationalLeagueRound(this.competition().continent as 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR' | 'WORLD');
  }

  startCompetition() {
    this.competitionService.startInternationalCompetition(this.competition().continent as 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR');
  }

  advanceLeague() {
    this.competitionService.advanceInternationalLeagueRound(this.competition().continent as 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR' | 'WORLD');
  }

  onSimulateMatch(matchId: string) {
    this.competitionService.simulateInternationalLeagueMatch(this.competition().continent as 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR', matchId);
  }

  onSimulateCupMatch(event: { matchId: string, roundName: string, leg: 1 | 2 }): void {
    this.competitionService.simulateInternationalCupMatch(this.competition().id, event.matchId, event.roundName, event.leg);
  }

  onSimulateCupRound(event: { roundName: string }): void {
    this.competitionService.simulateInternationalCupRound(this.competition().id, event.roundName);
  }

  onViewPlayerDetails(data: { player: Player, team: Team }): void {
    this.viewPlayerDetails.emit(data);
  }

  onViewTeamDetails(team: Team): void {
    this.viewTeamDetails.emit(team);
  }

  onViewCupMatchDetails(event: { cupMatch: CupMatch, leg: 1 | 2 }): void {
    this.viewMatchDetails.emit(event);
  }
}