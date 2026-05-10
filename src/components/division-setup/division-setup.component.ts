import { Component, ChangeDetectionStrategy, inject, signal, computed, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniverseService } from '../../services/universe.service';
import { SqlitePersistenceService } from '../../services/sqlite-persistence.service';
import { Team } from '../../models';

import { OverallColorPipe } from '../../pipes/overall-color.pipe';

interface LeagueSetup {
  countryId: string;
  countryName: string;
  teams: Team[];
  divisions: { name: string; size: number }[];
}

type Assignments = { [teamId: string]: string };

@Component({
  selector: 'app-division-setup',
  imports: [CommonModule, FormsModule, OverallColorPipe],
  templateUrl: './division-setup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DivisionSetupComponent {
  universeService = inject(UniverseService);
  sqliteService = inject(SqlitePersistenceService);
  setupComplete = output<Map<string, string[]>>();

  activeLeagueTab = signal<string>('');
  assignments = signal<Assignments>({});

  forceReset(): void {
    if (confirm('Deseja REALMENTE resetar TODO o universo? Isso apagará o progresso atual e o banco de dados.')) {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        this.sqliteService.clearAllData().then(() => {
          window.location.reload();
        }).catch(() => {
          window.location.reload();
        });
      }
    }
  }

  private readonly LEAGUE_CONFIG: { [key: string]: { name: string; size: number }[] } = {
    'BRA': [
      { name: 'Série A', size: 20 },
      { name: 'Série B', size: 20 },
      { name: 'Série C', size: 20 },
      { name: 'Série D', size: 20 },
      { name: 'Série E - N/NE', size: 12 },
      { name: 'Série E - CO/SE', size: 12 },
      { name: 'Série E - RJ/SE', size: 12 },
      { name: 'Série E - Sul', size: 12 },
    ],
    'ARG': [
      { name: 'Primeira Divisão', size: 16 },
      { name: 'Segunda Divisão', size: 16 },
    ],
    'ESP': [{ name: 'Primeira Divisão', size: 16 }, { name: 'Segunda Divisão', size: 16 }],
    'ENG': [
      { name: 'Primeira Divisão', size: 16 },
      { name: 'Segunda Divisão', size: 16 },
      { name: 'Terceira Divisão', size: 16 },
      { name: 'Quarta Divisão', size: 16 },
    ],
    'ITA': [{ name: 'Primeira Divisão', size: 16 }, { name: 'Segunda Divisão', size: 8 }, { name: 'Terceira Divisão', size: 8 }],
    'GER': [{ name: 'Primeira Divisão', size: 16 }, { name: 'Segunda Divisão', size: 8 }, { name: 'Terceira Divisão', size: 8 }],
    'FRA': [{ name: 'Primeira Divisão', size: 16 }, { name: 'Segunda Divisão', size: 8 }, { name: 'Terceira Divisão', size: 8 }],
    'JPN': [{ name: 'Primeira Divisão', size: 18 }, { name: 'Segunda Divisão', size: 12 }],
    'MEX': [{ name: 'Primeira Divisão', size: 20 }],
    'USA': [{ name: 'Conferência Leste', size: 16 }, { name: 'Conferência Oeste', size: 16 }],
    'POR': [{ name: 'Primeira Divisão', size: 12 }, { name: 'Segunda Divisão', size: 12 }],
    'NED': [{ name: 'Primeira Divisão', size: 8 }, { name: 'Segunda Divisão', size: 8 }],
  };

  leaguesToSetup = computed(() => {
    const allTeams = this.universeService.teams();
    if (allTeams.length === 0) return [];

    return Object.keys(this.LEAGUE_CONFIG)
      .map(countryId => {
        const countryTeams = allTeams.filter(t => t.countryId === countryId);
        const totalTeamsNeeded = this.LEAGUE_CONFIG[countryId].reduce((sum, div) => sum + div.size, 0);
        if (countryTeams.length !== totalTeamsNeeded) {
          console.warn(`Mismatch team count for ${countryId}. Expected ${totalTeamsNeeded}, found ${countryTeams.length}. Skipping setup for this league.`);
          return null;
        }
        return {
          countryId,
          countryName: this.universeService.COUNTRY_NAMES[countryId],
          teams: countryTeams.sort((a, b) => b.overall - a.overall),
          divisions: this.LEAGUE_CONFIG[countryId],
        };
      })
      .filter((l): l is LeagueSetup => l !== null);
  });

  constructor() {
    effect(() => {
      const leagues = this.leaguesToSetup();
      if (leagues.length > 0 && !this.activeLeagueTab()) {
        this.activeLeagueTab.set(leagues[0].countryId);
      }
    });
  }

  divisionCounts = computed(() => {
    const counts: { [countryId: string]: { [divisionName: string]: number } } = {};
    const currentAssignments = this.assignments();

    for (const league of this.leaguesToSetup()) {
      counts[league.countryId] = {};
      for (const div of league.divisions) {
        counts[league.countryId][div.name] = 0;
      }
      for (const team of league.teams) {
        const assignedDivision = currentAssignments[team.id];
        if (assignedDivision) {
          counts[league.countryId][assignedDivision]++;
        }
      }
    }
    return counts;
  });

  isSetupValid = computed(() => {
    const counts = this.divisionCounts();
    for (const league of this.leaguesToSetup()) {
      let totalAssigned = 0;
      for (const div of league.divisions) {
        if (counts[league.countryId][div.name] !== div.size) {
          return false;
        }
        totalAssigned += counts[league.countryId][div.name];
      }
      if (totalAssigned !== league.teams.length) {
        return false;
      }
    }
    return this.leaguesToSetup().length > 0;
  });

  updateAssignment(teamId: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const divisionName = select.value;
    this.assignments.update(current => {
      const newAssignments = { ...current };
      if (divisionName) {
        newAssignments[teamId] = divisionName;
      } else {
        delete newAssignments[teamId];
      }
      return newAssignments;
    });
  }

  assignRandomly(): void {
    const activeLeagueId = this.activeLeagueTab();
    const leagueToSetup = this.leaguesToSetup().find(l => l.countryId === activeLeagueId);

    if (!leagueToSetup) return;

    // Fisher-Yates shuffle algorithm
    const shuffledTeams = [...leagueToSetup.teams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    const newAssignmentsForLeague: Assignments = {};
    let teamIndex = 0;

    for (const division of leagueToSetup.divisions) {
      const teamsForDivision = shuffledTeams.slice(teamIndex, teamIndex + division.size);
      for (const team of teamsForDivision) {
        newAssignmentsForLeague[team.id] = division.name;
      }
      teamIndex += division.size;
    }

    this.assignments.update(current => ({
      ...current,
      ...newAssignmentsForLeague
    }));
  }

  confirmSetup(): void {
    if (!this.isSetupValid()) return;

    const finalAssignments = new Map<string, string[]>();
    const currentAssignments = this.assignments();

    for (const league of this.leaguesToSetup()) {
      const orderedTeamIds: string[] = [];
      for (const div of league.divisions) {
        const teamsInDiv = league.teams
          .filter(t => currentAssignments[t.id] === div.name)
          .sort((a, b) => b.overall - a.overall) // Sort within division for seeding
          .map(t => t.id);
        orderedTeamIds.push(...teamsInDiv);
      }
      finalAssignments.set(league.countryId, orderedTeamIds);
    }
    this.setupComplete.emit(finalAssignments);
  }

  getTeamCrest(team: Team): string {
    return this.universeService.getTeamCrest(team);
  }
}