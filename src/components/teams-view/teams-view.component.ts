import { Component, ChangeDetectionStrategy, input, signal, computed, output, EventEmitter, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Division, Player, Team } from '../../models';
import { NATIONALITIES } from '../../nationalities.data';
import { CurrencyShortPipe } from '../../pipes/currency-short.pipe';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';
import { UniverseService } from '../../services/universe.service';

@Component({
  selector: 'app-teams-view',
  imports: [CommonModule, CurrencyShortPipe, OverallColorPipe],
  templateUrl: './teams-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsViewComponent {
  constructor() {
    effect(() => {
      const init = this.initialTab();
      if (init) {
        this.activeTab.set(init);
      } else if (this.showFilters() && !this.showStatTabs()) {
        this.activeTab.set('ranking');
      }
    });
  }
  // --- INPUTS & OUTPUTS ---
  divisions = input<Division[]>();
  showFilters = input<boolean>(false);
  showStatTabs = input<boolean>(true);
  initialTab = input<'season' | 'ranking' | 'titles' | null>(null);

  viewPlayerDetails = output<{ player: Player, team: Team }>();
  viewTeamDetails = output<Team>();

  // --- INJECTED SERVICES ---
  public universeService = inject(UniverseService);

  // --- COMPONENT STATE ---
  activeTab = signal<'season' | 'ranking' | 'titles'>('season');
  selectedContinent = signal<string | null>(null);
  selectedCountry = signal<string | null>(null);
  selectedDivision = signal<string | null>(null);

  private nationalityMap = new Map<string, string>(NATIONALITIES.map(n => [n.code3, n.code2]));
  private failedLogos = new Set<string>(); // Track logos that failed to load

  // --- COMPUTED DATA FOR FILTERS ---
  continents = computed(() => {
    if (!this.showFilters()) return [];
    const continentMap = this.universeService.CONTINENT_NAMES;
    return Object.keys(continentMap).map(key => ({ key, name: continentMap[key] })).sort((a, b) => a.name.localeCompare(b.name));
  });

  countries = computed(() => {
    const continent = this.selectedContinent();
    if (!continent) return [];
    return this.universeService.leagues()
      .filter(l => this.universeService.getContinentForLeague(l.countryId) === continent)
      .map(l => ({ countryId: l.countryId, countryName: l.countryName }))
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  });

  selectedCountryName = computed(() => {
    const countryId = this.selectedCountry();
    if (!countryId) return '';
    return this.countries().find(c => c.countryId === countryId)?.countryName || '';
  });

  divisionOptions = computed(() => {
    const countryId = this.selectedCountry();
    if (!countryId) return [];
    const league = this.universeService.leagues().find(l => l.countryId === countryId);
    return league ? league.divisions.map(d => ({ name: d.name })) : [];
  });

  // --- COMPUTED DATA FOR DISPLAY ---
  displayDivisions = computed<Division[]>(() => {
    if (!this.showFilters()) {
      return this.divisions() ?? [];
    }

    // Se a aba for Ranking, não queremos filtrar por país/divisão da maneira usual, 
    // ou talvez queiramos ignorar. Mas como displayDivisions alimenta a view padrão, deixamos como está.

    const countryId = this.selectedCountry();
    if (countryId) {
      const league = this.universeService.leagues().find(l => l.countryId === countryId);
      if (league) {
        return league.divisions;
      }
    }

    return [];
  });

  globalTeamRanking = computed(() => {
    const allTeams: { team: Team, countryName: string, leagueName: string }[] = [];
    const continentFilter = this.selectedContinent();
    const countryFilter = this.selectedCountry();
    const divisionFilter = this.selectedDivision();

    this.universeService.leagues().forEach(league => {
      // Filtrar por Continente e País
      if (continentFilter && this.universeService.getContinentForLeague(league.countryId) !== continentFilter) return;
      if (countryFilter && league.countryId !== countryFilter) return;

      league.divisions.forEach(div => {
        // Filtrar por Divisão
        if (divisionFilter && div.name !== divisionFilter) return;

        div.teams.forEach(team => {
          allTeams.push({
            team,
            countryName: league.countryName,
            leagueName: div.name
          });
        });
      });
    });

    // Ordena por Overall
    return allTeams.sort((a, b) => b.team.overall - a.team.overall);
  });

  allCompetitionsRankings = computed(() => {
    const rankings: { id: string, name: string, countryId?: string, type: 'national' | 'international' | 'world', records: { team: { id: string, teamName: string, logoUrl?: string }, count: number }[] }[] = [];

    // 1. National Leagues
    this.universeService.leagues().forEach(league => {
      if (league.rankings?.division1 && league.rankings.division1.length > 0) {
        const enrichedRecords = league.rankings.division1.map(r => {
          if (!r.team.countryId || !r.team.logoUrl) {
            const fullTeam = this.universeService.teams().find(t => t.id === r.team.id);
            if (fullTeam) {
              return { ...r, team: { ...r.team, countryId: fullTeam.countryId, logoUrl: fullTeam.logoUrl } };
            }
          }
          return r;
        });

        rankings.push({
          id: `national_${league.countryId}`,
          name: `${league.countryName} - Liga`,
          countryId: league.countryId,
          type: 'national',
          records: enrichedRecords.slice(0, 5) // Top 5
        });
      }
    });

    // 2. International Comps
    this.universeService.internationalCompetitions().forEach(comp => {
      if (comp.rankings && comp.rankings.length > 0) {
        const enrichedRecords = comp.rankings.map(r => {
          if (!r.team.countryId || !r.team.logoUrl) {
            const fullTeam = this.universeService.teams().find(t => t.id === r.team.id);
            if (fullTeam) {
              return { ...r, team: { ...r.team, countryId: fullTeam.countryId, logoUrl: fullTeam.logoUrl } };
            }
          }
          return r;
        });

        rankings.push({
          id: comp.id,
          name: comp.name,
          type: comp.id === 'WORLD_CWC' ? 'world' : 'international',
          records: enrichedRecords.slice(0, 5) // Top 5
        });
      }
    });

    return rankings.sort((a, b) => {
      // Prioritize World > International > National
      const typeOrder = { world: 0, international: 1, national: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return a.name.localeCompare(b.name);
    });
  });

  // --- EVENT HANDLERS ---
  onContinentChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedContinent.set(value || null);
    // Reset country when continent changes and clear the dependent select element
    this.selectedCountry.set(null);
    const countrySelect = document.getElementById('country-filter') as HTMLSelectElement;
    if (countrySelect) {
      countrySelect.value = '';
    }
  }

  onCountryChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCountry.set(value || null);
    this.selectedDivision.set(null);
    const divSelect = document.getElementById('division-filter') as HTMLSelectElement;
    if (divSelect) {
      divSelect.value = '';
    }
  }

  onDivisionChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedDivision.set(value || null);
  }

  onPlayerClick(player: Player, team: Team): void {
    this.viewPlayerDetails.emit({ player, team });
  }

  onTeamClick(team: Team): void {
    this.viewTeamDetails.emit(team);
  }

  // --- UTILITY METHODS ---
  getFlagUrl(nationalityId: string): string | null {
    const code2 = this.nationalityMap.get(nationalityId?.toUpperCase());
    if (code2) {
      return `https://flagcdn.com/w160/${code2.toLowerCase()}.png`;
    }
    return null;
  }

  getTeamLogoUrl(teamId: string): string | null {
    const team = this.universeService.teams().find(t => t.id === teamId);
    return team ? this.universeService.getTeamCrest(team) : null;
  }

  onLogoError(teamId: string, event: Event): void {
    const img = event.target as HTMLImageElement;
    
    // Se falhou o SVG, tenta o PNG
    if (img.src.includes('.svg')) {
      img.src = img.src.replace('.svg', '.png');
      return;
    }

    // Se falhou tudo, marca como falha e esconde
    this.failedLogos.add(teamId);
    img.style.display = 'none';
  }

  shouldShowLogo(teamId: string): boolean {
    return !this.failedLogos.has(teamId);
  }

  getClubFlag(player: Player): string | null {
    if (!player.teamId) return null;
    const team = this.universeService.teams().find(t => t.id === player.teamId);
    if (team) {
      return this.getFlagUrl(team.countryId);
    }
    return null;
  }

  sortedTeams(teams: Team[]): Team[] {
    return [...teams].sort((a, b) => a.teamName.localeCompare(b.teamName));
  }

  getSortedPlayers(team: Team): Player[] {
    if (!team.players || team.players.length === 0) {
      return [];
    }
    // Assumes the first player is the goalkeeper due to service-side sorting
    const goalkeeper = team.players.find(p => p.isGoalkeeper);
    const outfieldPlayers = team.players.filter(p => !p.isGoalkeeper).sort((a, b) => {
      // Sort by number, then by name
      if (a.number && b.number) {
        if (a.number !== b.number) return a.number - b.number;
      }
      return a.name.localeCompare(b.name);
    });
    return goalkeeper ? [goalkeeper, ...outfieldPlayers] : outfieldPlayers;
  }

  isGoalkeeper(player: Player): boolean {
    return player.isGoalkeeper;
  }

  // Season Stats
  getTotalMatchesPlayed(player: Player): number {
    return player.stats.matchesPlayed + player.cupStats.matchesPlayed + (player.internationalStats?.matchesPlayed || 0);
  }
  getTotalGoals(player: Player): number {
    return player.stats.goals + player.cupStats.goals + (player.internationalStats?.goals || 0);
  }
  getTotalAssists(player: Player): number {
    return player.stats.assists + player.cupStats.assists + (player.internationalStats?.assists || 0);
  }
  getTotalMotm(player: Player): number {
    return player.stats.motm + player.cupStats.motm + (player.internationalStats?.motm || 0);
  }

  // Career Stats
  getCareerStats(player: Player) {
    const totals = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
    if (player.careerStats) {
      for (const countryId in player.careerStats) {
        const stats = player.careerStats[countryId];
        totals.matchesPlayed += stats.matchesPlayed;
        totals.goals += stats.goals;
        totals.assists += stats.assists;
        totals.motm += stats.motm;
      }
    }
    return totals;
  }

  getTotalMarketValue(team: Team): number {
    return team.players.reduce((sum, p) => sum + p.marketValue, 0);
  }

  getAverageMarketValue(team: Team): number {
    if (team.players.length === 0) return 0;
    return this.getTotalMarketValue(team) / team.players.length;
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
