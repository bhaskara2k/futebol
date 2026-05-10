import { Component, ChangeDetectionStrategy, input, computed, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeasonRecord, ChampionshipRankings, InternationalSeasonRecord, ChampionshipRankingRecord, Team, Trophy, League, WorldCupRecord } from '../../models';
import { UniverseService } from '../../services/universe.service';
import { CompetitionService } from '../../services/competition.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './history-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.escape)': 'onEscapeKey()',
  },
})
export class HistoryViewComponent {
  nationalHistory = input<SeasonRecord[]>();
  nationalRankings = input<ChampionshipRankings>();
  competitionService = inject(CompetitionService);
  internationalHistory = input<InternationalSeasonRecord[]>();
  internationalRankings = input<ChampionshipRankingRecord[]>();
  competitionType = input<'national' | 'international' | 'youth_cl'>('national');

  leagueTeams = input<Team[]>([]);
  nationalTeams = input<Team[]>([]);
  clubTeams = input<Team[]>([]);
  saveTeamDetails = output<Team>();
  competitionName = input<string>();
  competitionTrophyType = input<Trophy['type']>();
  
  public getRealCompetitionName(type: 'national_league' | 'lower_division' | 'national_cup' | 'league_cup' | 'supercup', divisionIndex: number = 0): string {
    const countryId = this.league()?.countryId;
    if (!countryId) return type === 'national_league' ? 'Campeonato Nacional' : 'Copa Nacional';

    if (type === 'national_league') {
      if (countryId === 'USA') return 'MLS Cup';
      return this.competitionService.getLeagueTrophyName(countryId);
    }
    if (type === 'national_cup') return this.competitionService.getCupTrophyName(countryId);
    if (type === 'league_cup') {
      if (countryId === 'USA') return 'Conferência Leste'; // Inversão para mostrar histórico de conferência
      return this.competitionService.getLeagueCupTrophyName(countryId);
    }
    if (type === 'supercup') return this.competitionService.getSupercupTrophyName(countryId);
    
    if (type === 'lower_division') {
      if (countryId === 'USA' && divisionIndex === 1) return 'Conferência Oeste';
      if (countryId === 'BRA') {
        if (divisionIndex === 1) return 'Série B';
        if (divisionIndex === 2) return 'Série C';
        if (divisionIndex === 3) return 'Série D';
        return `Módulo ${divisionIndex - 3}`;
      }
      if (countryId === 'ENG') {
        if (divisionIndex === 1) return 'EFL Championship';
        if (divisionIndex === 2) return 'EFL League One';
        if (divisionIndex === 3) return 'EFL League Two';
      }
      if (countryId === 'ESP' && divisionIndex === 1) return 'Segunda División';
      if (countryId === 'ITA') {
        if (divisionIndex === 1) return 'Serie B';
        if (divisionIndex === 2) return 'Serie C';
      }
      if (countryId === 'GER') {
        if (divisionIndex === 1) return '2. Bundesliga';
        if (divisionIndex === 2) return '3. Liga';
      }
      if (countryId === 'FRA') {
        if (divisionIndex === 1) return 'Ligue 2';
        if (divisionIndex === 2) return 'National';
      }
      if (countryId === 'JPN' && divisionIndex === 1) return 'J2 League';
      if (countryId === 'ARG' && divisionIndex === 1) return 'Primera B Nacional';
      if (countryId === 'USA' && divisionIndex === 1) return 'Conferência Oeste';
      
      // Fallback padrão para outros países (alinhado com o UniverseService)
      if (countryId === 'BRA') {
        if (divisionIndex === 2) return 'Série C';
        if (divisionIndex === 3) return 'Série D';
        if (divisionIndex >= 4) return `Série E - Módulo ${divisionIndex - 3}`;
      }

      if (divisionIndex === 1) return 'Segunda Divisão';
      if (divisionIndex === 2) return 'Terceira Divisão';
      if (divisionIndex === 3) return 'Quarta Divisão';
      
      return `${divisionIndex + 1}ª Divisão`;
    }
    return 'Competição';
  }

  public universeService = inject(UniverseService);

  isEditingTrophies = signal(false);
  editingTrophy = signal<{ name: string; type: Trophy['type'] } | null>(null);
  selectedSeason = signal<number | null>(null);



  league = computed<League | undefined>(() => {
    const teams = this.leagueTeams();
    if (!teams || teams.length === 0) return undefined;
    // Encontrar o primeiro time que não seja de uma seleção (countryId !== 'SAM')
    const clubTeam = teams.find(t => t.countryId !== 'SAM');
    const countryId = clubTeam?.countryId || teams[0].countryId;
    return this.universeService.leagues().find(l => l.countryId === countryId);
  });

  division2Name = computed(() => this.nationalHistory()?.[0]?.division2?.name || 'Segunda Divisão');
  division3Name = computed(() => this.nationalHistory()?.[0]?.division3?.name || 'Terceira Divisão');
  division4Name = computed(() => this.nationalHistory()?.[0]?.division4?.name || 'Quarta Divisão');

  availableSeasons = computed(() => {
    const type = this.competitionType();
    let seasons: number[] = [];
    if (type === 'national') seasons = this.nationalHistory()?.map(h => h.season) || [];
    else if (type === 'international' || type === 'youth_cl') seasons = this.internationalHistory()?.map(h => h.season) || [];

    return [...new Set(seasons)].sort((a, b) => b - a);
  });

  filteredNationalHistory = computed(() => {
    const history = this.nationalHistory();
    if (!history) return [];
    const selected = this.selectedSeason();
    return selected ? history.filter(h => h.season === selected) : history;
  });

  filteredInternationalHistory = computed(() => {
    const history = this.internationalHistory();
    if (!history) return [];
    const selected = this.selectedSeason();
    return selected ? history.filter(h => h.season === selected) : history;
  });



  private getRankingsFromTrophies(trophyName: string) {
    const teams = this.leagueTeams() || [];
    const rankings: ChampionshipRankingRecord[] = [];

    teams.forEach(team => {
      const trophy = team.trophies?.find(t => t.name === trophyName);
      const count = trophy?.count || 0;

      if (count > 0) {
        const logoUrl = team.logoUrl || this.universeService.getTeamCrest(team);
        rankings.push({ team: { id: team.id, teamName: team.teamName, countryId: team.countryId, logoUrl }, count });
      }
    });

    return rankings.sort((a, b) => b.count - a.count);
  }

  // PRIORIDADE: Usar o objeto de rankings sincronizado pelo motor. Fallback para escaneamento de troféus se vazio.
  sortedDivision1Ranking = computed(() => {
    const fromRankings = this.nationalRankings()?.division1;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getRealCompetitionName('national_league'));
  });

  sortedDivision2Ranking = computed(() => {
    const fromRankings = this.nationalRankings()?.division2;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getRealCompetitionName('lower_division', 1));
  });

  sortedDivision3Ranking = computed(() => {
    const fromRankings = this.nationalRankings()?.division3;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getRealCompetitionName('lower_division', 2));
  });

  sortedDivision4Ranking = computed(() => {
    const fromRankings = this.nationalRankings()?.division4;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getRealCompetitionName('lower_division', 3));
  });

  sortedDivision5Ranking = computed(() => {
    const fromRankings = this.nationalRankings()?.division5;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getRealCompetitionName('lower_division', 4));
  });

  sortedDivision6Ranking = computed(() => {
    const fromRankings = this.nationalRankings()?.division6;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getRealCompetitionName('lower_division', 5));
  });

  sortedDivision7Ranking = computed(() => {
    const fromRankings = this.nationalRankings()?.division7;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getRealCompetitionName('lower_division', 6));
  });

  sortedDivision8Ranking = computed(() => {
    const fromRankings = this.nationalRankings()?.division8;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getRealCompetitionName('lower_division', 7));
  });

  sortedCupRanking = computed(() => {
    const fromRankings = this.nationalRankings()?.cup;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getCupTrophyNameForEdit());
  });

  sortedLeagueCupRanking = computed(() => {
    const fromRankings = this.nationalRankings()?.leagueCup;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    const currentLeague = this.league();
    if (!currentLeague || !currentLeague.leagueCup) return [];
    const name = this.getLeagueCupTrophyNameForEdit(currentLeague.countryId);
    return this.getRankingsFromTrophies(name);
  });

  sortedSupercupRanking = computed(() => {
    const fromRankings = this.nationalRankings()?.supercup;
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    return this.getRankingsFromTrophies(this.getSupercupTrophyNameForEdit());
  });

  sortedInternationalRanking = computed(() => {
    const fromRankings = this.internationalRankings();
    if (fromRankings && fromRankings.length > 0) return [...fromRankings].sort((a, b) => b.count - a.count);
    const compName = this.competitionName();
    if (!compName) return [];
    return this.getRankingsFromTrophies(compName);
  });

  getCupTrophyNameForEdit(): string {
    const countryId = this.league()?.countryId;
    if (!countryId) return 'Copa Nacional';
    return this.competitionService.getCupTrophyName(countryId);
  }

  getLeagueCupTrophyNameForEdit(countryId: string | undefined): string {
    if (!countryId) return 'Copa da Liga';
    return this.competitionService.getLeagueCupTrophyName(countryId);
  }

  getSupercupTrophyNameForEdit(): string {
    const countryId = this.league()?.countryId;
    if (!countryId) return 'Supercopa Nacional';
    return this.competitionService.getSupercupTrophyName(countryId);
  }

  editTrophies(name: string, type: Trophy['type']) {
    this.editingTrophy.set({ name, type });
    this.isEditingTrophies.set(true);
  }

  closeEditor() {
    this.isEditingTrophies.set(false);
    this.editingTrophy.set(null);
  }

  onEscapeKey(): void {
    if (this.isEditingTrophies()) {
      this.closeEditor();
    }
  }

  findTrophyCount(team: Team, trophyName: string): number {
    return team.trophies?.find(t => t.name === trophyName)?.count || 0;
  }

  updateTrophyCount(team: Team, trophyName: string, trophyType: Trophy['type'], delta: number) {
    const newTeam = JSON.parse(JSON.stringify(team));
    if (!newTeam.trophies) {
      newTeam.trophies = [];
    }
    const trophy = newTeam.trophies.find((t: Trophy) => t.name === trophyName);
    if (trophy) {
      trophy.count += delta;
      if (trophy.count <= 0) {
        newTeam.trophies = newTeam.trophies.filter((t: Trophy) => t.name !== trophyName);
      }
    } else if (delta > 0) {
      newTeam.trophies.push({ name: trophyName, count: 1, type: trophyType });
    }
    this.saveTeamDetails.emit(newTeam);
  }

  onSeasonChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedSeason.set(value === 'all' ? null : Number(value));
  }

  getTeamByName(name: string): Team | undefined {
    return this.leagueTeams().find(t => t.teamName === name);
  }
}