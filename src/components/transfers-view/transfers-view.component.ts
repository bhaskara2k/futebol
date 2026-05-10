import { Component, ChangeDetectionStrategy, input, signal, computed, inject, output } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Division, Player, Team, TransferRecord } from '../../models';
import { UniverseService } from '../../services/universe.service';
import { CurrencyShortPipe } from '../../pipes/currency-short.pipe';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';
import { NATIONALITIES } from '../../nationalities.data';

@Component({
  selector: 'app-transfers-view',
  imports: [CommonModule, CurrencyShortPipe, OverallColorPipe],
  templateUrl: './transfers-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransfersViewComponent {
  divisions = input.required<Division[]>();
  isTransferWindowOpen = input.required<boolean>();
  viewPlayerDetails = output<{ player: Player, team: Team }>();

  universeService = inject(UniverseService);

  selectedTeamForList = signal<Team | null>(null);
  playerToTransfer = signal<{ player: Player; sellingTeam: Team } | null>(null);
  targetTeamId = signal<string | null>(null);
  transferStatus = signal<{ message: string, type: 'success' | 'error' } | null>(null);

  // --- HUB FILTERS ---
  searchTerm = signal<string>('');
  selectedContinentFilter = signal<string>('all');
  selectedCountryFilter = signal<string | null>(null);
  selectedDivisionFilter = signal<number | null>(null); // Nível da divisão (1, 2...)

  // --- PROPOSAL FILTERS ---
  proposalSearchTerm = signal<string>('');
  proposalContinentFilter = signal<string>('all');
  proposalCountryFilter = signal<string | null>(null);
  proposalDivisionFilter = signal<number | null>(null);
  activeTab = signal<'market' | 'scout'>('market');

  // --- ADVANCED SCOUT FILTERS ---
  scoutSearchTerm = signal('');
  scoutMinOverall = signal<number | null>(null);
  scoutMaxOverall = signal<number | null>(null);
  scoutMinAge = signal<number | null>(null);
  scoutMaxAge = signal<number | null>(null);
  scoutSelectedNationality = signal<string | null>(null);
  scoutSelectedPosition = signal<'all' | 'outfield' | 'goalkeeper'>('all');
  scoutMinContract = signal<number | null>(null);
  scoutMaxContract = signal<number | null>(null);
  scoutMaxValue = signal<number | null>(null);
  scoutFreeAgentsOnly = signal<boolean>(false);

  continentNames = this.universeService.CONTINENT_NAMES;
  continentKeys = Object.keys(this.continentNames).sort((a, b) => this.continentNames[a].localeCompare(this.continentNames[b]));

  specialTeams = computed(() => {
    const allTeams = this.universeService.teams();
    return allTeams.filter(t => t.countryId === 'AAA' || t.countryId === 'BBB').sort((a, b) => a.teamName.localeCompare(b.teamName));
  });

  // --- Helpers for Dropdowns ---

  // HUB: Countries based on Continent
  countriesForFilter = computed(() => {
    const continent = this.selectedContinentFilter();
    let leagues = this.universeService.leagues();

    if (continent && continent !== 'all') {
      leagues = leagues.filter(l => this.universeService.getContinentForLeague(l.countryId) === continent);
    }

    return leagues
      .map(l => ({ countryId: l.countryId, countryName: l.countryName }))
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  });

  // HUB: Divisions based on Country (Mapped with Level)
  divisionsForHub = computed(() => {
    const countryId = this.selectedCountryFilter();
    if (!countryId) return [];

    const league = this.universeService.leagues().find(l => l.countryId === countryId);
    // Maps division array index to level (0 -> 1, 1 -> 2)
    return league ? league.divisions.map((d, index) => ({ name: d.name, level: index + 1 })) : [];
  });

  // PROPOSAL: Countries based on Continuum
  countriesForProposal = computed(() => {
    const continent = this.proposalContinentFilter();
    let leagues = this.universeService.leagues();

    if (continent && continent !== 'all') {
      leagues = leagues.filter(l => this.universeService.getContinentForLeague(l.countryId) === continent);
    }

    return leagues
      .map(l => ({ countryId: l.countryId, countryName: l.countryName }))
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  });

  // PROPOSAL: Divisions (Mapped)
  divisionsForProposal = computed(() => {
    const countryId = this.proposalCountryFilter();
    if (!countryId) return [];

    const league = this.universeService.leagues().find(l => l.countryId === countryId);
    return league ? league.divisions.map((d, index) => ({ name: d.name, level: index + 1 })) : [];
  });

  // --- Filtered Team Lists ---

  private filterTeamsLogic(
    continentFilter: string,
    countryFilter: string | null,
    divisionFilter: number | null,
    term: string
  ) {
    const allLeagues = this.universeService.leagues();
    let leaguesToProcess = allLeagues;

    if (countryFilter) {
      leaguesToProcess = allLeagues.filter(league => league.countryId === countryFilter);
    } else if (continentFilter === 'FREE') {
      // Return a virtual league for free agents
      const freeAgentTeam = this.universeService.teams().find(t => t.countryId === 'AAA' || t.teamName === 'SEM EQUIPE');
      if (freeAgentTeam && freeAgentTeam.players.length > 0) {
        return [{
          leagueName: 'AGORA SEM CLUBE (LIVRES)',
          countryId: 'AAA',
          teams: [freeAgentTeam]
        }];
      }
      return [];
    } else if (continentFilter !== 'all') {
      leaguesToProcess = allLeagues.filter(league => this.universeService.getContinentForLeague(league.countryId) === continentFilter);
    }

    return leaguesToProcess
      .map(league => ({
        leagueName: league.countryName,
        teams: league.divisions
          .map((d, index) => ({ div: d, level: index + 1 })) // Attach level info
          .filter(item => !divisionFilter || item.level === divisionFilter)
          .flatMap(item => item.div.teams)
          .filter(team => team.teamName.toLowerCase().includes(term.toLowerCase()))
          .sort((a, b) => a.teamName.localeCompare(b.teamName))
      }))
      .filter(group => group.teams.length > 0)
      .sort((a, b) => a.leagueName.localeCompare(b.leagueName));
  }

  filteredGroupedTeams = computed(() => {
    return this.filterTeamsLogic(
      this.selectedContinentFilter(),
      this.selectedCountryFilter(),
      this.selectedDivisionFilter(),
      this.searchTerm()
    );
  });

  filteredProposalTeams = computed(() => {
    return this.filterTeamsLogic(
      this.proposalContinentFilter(),
      this.proposalCountryFilter(),
      this.proposalDivisionFilter(),
      this.proposalSearchTerm()
    );
  });

  allGlobalPlayers = computed(() => {
    const list: { player: Player, team: Team, countryId: string }[] = [];
    this.universeService.leagues().forEach(league => {
      league.divisions.forEach(div => {
        div.teams.forEach(team => {
          list.push(...team.players.map(p => ({ player: p, team, countryId: league.countryId })));
        });
      });
    });
    // Include free agents
    const freeAgentTeam = this.universeService.teams().find(t => t.teamName === 'SEM EQUIPE' || t.countryId === 'AAA');
    if (freeAgentTeam) {
      list.push(...freeAgentTeam.players.map(p => ({ player: p, team: freeAgentTeam, countryId: 'AAA' })));
    }
    return list;
  });

  filteredScoutPlayers = computed(() => {
    const term = this.scoutSearchTerm().toLowerCase();
    const minOvr = this.scoutMinOverall();
    const maxOvr = this.scoutMaxOverall();
    const minA = this.scoutMinAge();
    const maxA = this.scoutMaxAge();
    const nationality = this.scoutSelectedNationality();
    const position = this.scoutSelectedPosition();
    const minContract = this.scoutMinContract();
    const maxContract = this.scoutMaxContract();
    const maxValue = this.scoutMaxValue();
    const onlyFree = this.scoutFreeAgentsOnly();

    return this.allGlobalPlayers().filter(({ player, team, countryId }) => {
      if (term && !player.name.toLowerCase().includes(term)) return false;
      if (minOvr !== null && player.overall < minOvr) return false;
      if (maxOvr !== null && player.overall > maxOvr) return false;
      if (minA !== null && player.age < minA) return false;
      if (maxA !== null && player.age > maxA) return false;
      if (nationality && player.nationalityId !== nationality) return false;
      if (position === 'goalkeeper' && !player.isGoalkeeper) return false;
      if (position === 'outfield' && player.isGoalkeeper) return false;
      if (minContract !== null && player.contractYears < minContract) return false;
      if (maxContract !== null && player.contractYears > maxContract) return false;
      if (maxValue !== null && player.marketValue > (maxValue * 1000000)) return false;
      if (onlyFree && team.countryId !== 'AAA' && team.teamName !== 'SEM EQUIPE') return false;
      return true;
    }).sort((a, b) => b.player.overall - a.player.overall).slice(0, 100);
  });

  // --- Hub Computed Signals ---
  currentSeasonTransfers = computed(() => {
    return this.universeService.transferHistory().filter(t => t.season === this.universeService.season());
  });

  latestTransfers = computed(() => {
    return this.currentSeasonTransfers().slice(-5).reverse();
  });

  biggestTransfers = computed(() => {
    return [...this.currentSeasonTransfers()].sort((a, b) => b.fee - a.fee).slice(0, 5);
  });

  expiringContractPlayers = computed(() => {
    return this.universeService.teams()
      .filter(team => team.countryId !== 'AAA' && team.countryId !== 'BBB')
      .flatMap(team => team.players.map(player => ({ player, team })))
      .filter(({ player }) => player.contractYears <= 1)
      .sort((a, b) => b.player.overall - a.player.overall)
      .slice(0, 10);
  });

  freeAgents = computed(() => {
    const freeAgentTeam = this.universeService.teams().find(t => t.teamName === 'SEM EQUIPE' || t.countryId === 'AAA');
    return freeAgentTeam ? [...freeAgentTeam.players].sort((a, b) => b.overall - a.overall).slice(0, 5) : [];
  });

  freeAgentsCount = computed(() => {
    const freeAgentTeam = this.universeService.teams().find(t => t.teamName === 'SEM EQUIPE' || t.countryId === 'AAA');
    return freeAgentTeam ? freeAgentTeam.players.length : 0;
  });

  // --- Team Details Computed Signals ---
  selectedTeamArrivals = computed(() => {
    const team = this.selectedTeamForList();
    if (!team) return [];
    return this.currentSeasonTransfers().filter(t => t.toTeamName === team.teamName);
  });

  selectedTeamDepartures = computed(() => {
    const team = this.selectedTeamForList();
    if (!team) return [];
    return this.currentSeasonTransfers().filter(t => t.fromTeamName === team.teamName);
  });


  getPlayerOverallEvolution(player: Player): number {
    if (!player.overallHistory || player.overallHistory.length === 0) return 0;
    const currentSeason = this.universeService.season();

    // Encontrar o overall do fim da temporada anterior (season - 1)
    const lastSeasonHistory = player.overallHistory.find(h => h.season === currentSeason - 1);

    if (lastSeasonHistory) {
      return player.overall - lastSeasonHistory.overall;
    }

    // Caso contrário, tenta encontrar a entrada mais recente que seja menor que a temporada atual
    const olderHistory = player.overallHistory
      .filter(h => h.season < currentSeason)
      .sort((a, b) => b.season - a.season);

    if (olderHistory.length > 0) {
      return player.overall - olderHistory[0].overall;
    }

    return 0;
  }

  transferCost = computed(() => {
    const transferData = this.playerToTransfer();
    if (!transferData) return 0;

    const player = transferData.player;
    if (transferData.sellingTeam.teamName === 'SEM EQUIPE' || player.contractYears <= 1) {
      return 0;
    } else if (player.contractYears === 2) {
      return player.marketValue;
    } else {
      return Math.round(player.marketValue * 1.5);
    }
  });

  onPlayerClick(player: Player, team: Team): void {
    this.viewPlayerDetails.emit({ player, team });
  }

  selectTeamForList(team: Team): void {
    this.selectedTeamForList.set(team);
    this.playerToTransfer.set(null);
    this.targetTeamId.set(null);
    this.transferStatus.set(null);

    // Reset proposal filters
    this.proposalContinentFilter.set('all');
    this.proposalCountryFilter.set(null);
    this.proposalDivisionFilter.set(null);
    this.proposalSearchTerm.set('');
  }

  initiateTransfer(player: Player, sellingTeam: Team): void {
    this.playerToTransfer.set({ player, sellingTeam });
    this.selectedTeamForList.set(sellingTeam); // Altera o estado para exibir a mesa de negociação
    this.targetTeamId.set(null);
    this.transferStatus.set(null);

    // Garantir que a visualização mude para o topo para ver a mesa de negociação
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  confirmTransfer(): void {
    const transferData = this.playerToTransfer();
    const buyingTeamId = this.targetTeamId();
    if (!transferData || !buyingTeamId) return;

    const result = this.universeService.executeTransfer(transferData.player.id, buyingTeamId);

    this.transferStatus.set({ message: result.message, type: result.success ? 'success' : 'error' });

    if (result.success) {
      const updatedTeam = this.universeService.teams().find(t => t.id === this.selectedTeamForList()?.id);
      this.selectedTeamForList.set(updatedTeam || null);
      this.playerToTransfer.set(null);
      this.targetTeamId.set(null);
    }
  }

  cancelTransfer(): void {
    this.playerToTransfer.set(null);
    this.targetTeamId.set(null);
    this.transferStatus.set(null);
  }

  onTargetTeamChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.targetTeamId.set(value || null);
  }

  selectTargetTeam(team: Team): void {
    this.targetTeamId.set(team.id);
    this.proposalSearchTerm.set(team.teamName);
    // Hide suggestions by clearing search or other logic if needed, 
    // but setting the name usually suffices to show the selection.
  }

  // --- Scout Filter Handlers ---
  nationalities = [...NATIONALITIES].sort((a, b) => a.name.localeCompare(b.name));

  updateScoutSearch(event: Event) { this.scoutSearchTerm.set((event.target as HTMLInputElement).value); }
  updateScoutMinOvr(event: Event) { this.scoutMinOverall.set(this.getNumberValue(event)); }
  updateScoutMaxOvr(event: Event) { this.scoutMaxOverall.set(this.getNumberValue(event)); }
  updateScoutMinAge(event: Event) { this.scoutMinAge.set(this.getNumberValue(event)); }
  updateScoutMaxAge(event: Event) { this.scoutMaxAge.set(this.getNumberValue(event)); }
  updateScoutNationality(event: Event) { this.scoutSelectedNationality.set((event.target as HTMLSelectElement).value || null); }
  updateScoutPosition(event: Event) { this.scoutSelectedPosition.set((event.target as HTMLSelectElement).value as any); }
  updateScoutMinContract(event: Event) { this.scoutMinContract.set(this.getNumberValue(event)); }
  updateScoutMaxContract(event: Event) { this.scoutMaxContract.set(this.getNumberValue(event)); }
  updateScoutMaxValue(event: Event) { this.scoutMaxValue.set(this.getNumberValue(event)); }
  toggleScoutFreeAgents() { this.scoutFreeAgentsOnly.set(!this.scoutFreeAgentsOnly()); }

  resetScoutFilters() {
    this.scoutSearchTerm.set('');
    this.scoutMinOverall.set(null);
    this.scoutMaxOverall.set(null);
    this.scoutMinAge.set(null);
    this.scoutMaxAge.set(null);
    this.scoutSelectedNationality.set(null);
    this.scoutSelectedPosition.set('all');
    this.scoutMinContract.set(null);
    this.scoutMaxContract.set(null);
    this.scoutMaxValue.set(null);
    this.scoutFreeAgentsOnly.set(false);
  }

  private getNumberValue(event: Event): number | null {
    const num = (event.target as HTMLInputElement).valueAsNumber;
    return isNaN(num) ? null : num;
  }

  // HUB Handlers
  onSearchTermChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onContinentFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedContinentFilter.set(value);
    this.selectedCountryFilter.set(null);
    this.selectedDivisionFilter.set(null);

    const countrySelect = document.querySelector('#country-filter-hub') as HTMLSelectElement;
    if (countrySelect) countrySelect.value = "";
    const divSelect = document.querySelector('#division-filter-hub') as HTMLSelectElement;
    if (divSelect) divSelect.value = "";
  }

  onCountryFilterChange(event: Event): void {
    this.selectedCountryFilter.set((event.target as HTMLSelectElement).value || null);
    this.selectedDivisionFilter.set(null);
    const divSelect = document.querySelector('#division-filter-hub') as HTMLSelectElement;
    if (divSelect) divSelect.value = "";
  }

  onDivisionFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedDivisionFilter.set(val ? parseInt(val) : null);
  }

  // PROPOSAL Handlers
  onProposalSearchTermChange(event: Event): void {
    this.proposalSearchTerm.set((event.target as HTMLInputElement).value);
  }

  onProposalContinentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.proposalContinentFilter.set(value);
    this.proposalCountryFilter.set(null);
    this.proposalDivisionFilter.set(null);

    const countrySelect = document.querySelector('#country-filter-prop') as HTMLSelectElement;
    if (countrySelect) countrySelect.value = "";
    const divSelect = document.querySelector('#division-filter-prop') as HTMLSelectElement;
    if (divSelect) divSelect.value = "";
  }

  onProposalCountryChange(event: Event): void {
    this.proposalCountryFilter.set((event.target as HTMLSelectElement).value || null);
    this.proposalDivisionFilter.set(null);
    const divSelect = document.querySelector('#division-filter-prop') as HTMLSelectElement;
    if (divSelect) divSelect.value = "";
  }

  onProposalDivisionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.proposalDivisionFilter.set(val ? parseInt(val) : null);
  }
}
