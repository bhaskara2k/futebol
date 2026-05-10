import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniverseService } from '../../services/universe.service';
import { Player, Team } from '../../models';
import { CurrencyShortPipe } from '../../pipes/currency-short.pipe';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';
import { NATIONALITIES } from '../../nationalities.data';

@Component({
  selector: 'app-global-scout',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyShortPipe, OverallColorPipe],
  templateUrl: './global-scout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalScoutComponent {
  universeService = inject(UniverseService);
  viewPlayerDetails = output<{ player: Player, team: Team }>();

  // --- Filter signals ---
  searchTerm = signal('');
  minOverall = signal<number | null>(null);
  maxOverall = signal<number | null>(null);
  minAge = signal<number | null>(null);
  maxAge = signal<number | null>(null);
  minValue = signal<number | null>(null);
  maxValue = signal<number | null>(null);
  selectedContinent = signal<string | null>(null);
  selectedCountry = signal<string | null>(null);
  selectedDivision = signal<string | null>(null);
  selectedNationality = signal<string | null>(null);
  selectedPosition = signal<'all' | 'outfield' | 'goalkeeper'>('all');
  contractYearsMax = signal<number | null>(null);
  contractStatus = signal<'all' | 'expiring' | 'long'>('all');

  // --- Sorting signals (NOVA ADIÇÃO) ---
  sortColumn = signal<string>('overall');
  sortDirection = signal<'asc' | 'desc'>('desc');

  private nationalityMap = new Map<string, string>(NATIONALITIES.map(n => [n.code3, n.code2]));

  allPlayersWithTeam = computed(() => {
    const list: { player: Player, team: Team, divisionName: string, countryId: string }[] = [];

    this.universeService.leagues().forEach(league => {
      league.divisions.forEach(div => {
        div.teams.forEach(team => {
          list.push(...team.players.map(p => ({
            player: p,
            team: team,
            divisionName: div.name,
            countryId: league.countryId
          })));
        });
      });
    });
    return list;
  });

  continents = computed(() => {
    const continentMap = this.universeService.CONTINENT_NAMES;
    return Object.keys(continentMap)
      .map(key => ({ key, name: continentMap[key] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  countries = computed(() => {
    const continent = this.selectedContinent();
    if (!continent) return [];
    return this.universeService.leagues()
      .filter(l => this.universeService.getContinentForLeague(l.countryId) === continent)
      .map(l => ({ countryId: l.countryId, countryName: l.countryName }))
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  });

  divisions = computed(() => {
    const countryId = this.selectedCountry();
    if (!countryId) return [];
    const league = this.universeService.leagues().find(l => l.countryId === countryId);
    return league ? league.divisions.map(d => d.name) : [];
  });

  nationalities = computed(() => {
    return NATIONALITIES.map(n => ({ id: n.code3, name: n.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // --- Lógica de filtragem e ordenação (MODIFICADO) ---
  filteredPlayers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const minOvr = this.minOverall();
    const maxOvr = this.maxOverall();
    const minA = this.minAge();
    const maxA = this.maxAge();
    const minVal = this.minValue() ? this.minValue()! * 1_000_000 : null;
    const maxVal = this.maxValue() ? this.maxValue()! * 1_000_000 : null;
    const continent = this.selectedContinent();
    const country = this.selectedCountry();
    const division = this.selectedDivision();
    const nationality = this.selectedNationality();
    const position = this.selectedPosition();
    const maxContract = this.contractYearsMax();
    const contract = this.contractStatus();

    // 1. Mapeia para adicionar a variação de overall
    const playersWithChange = this.allPlayersWithTeam().map(({ player, team, divisionName, countryId }) => {
      const history = player.overallHistory;
      let overallChange = 0;
      if (history && history.length > 0) {
        // Pega o overall da última temporada registrada no histórico
        const lastSeasonOverall = history[history.length - 1].overall;
        overallChange = player.overall - lastSeasonOverall;
      }
      return { player, team, overallChange, divisionName, countryId };
    });

    // 2. Aplica os filtros
    const filtered = playersWithChange.filter(({ player, team, overallChange, divisionName, countryId }) => {
      if (term && !player.name.toLowerCase().includes(term)) return false;
      if (minOvr !== null && player.overall < minOvr) return false;
      if (maxOvr !== null && player.overall > maxOvr) return false;
      if (minA !== null && player.age < minA) return false;
      if (maxA !== null && player.age > maxA) return false;
      if (minVal !== null && player.marketValue < minVal) return false;
      if (maxVal !== null && player.marketValue > maxVal) return false;
      if (continent && this.universeService.getContinentForLeague(countryId) !== continent) return false;
      if (country && countryId !== country) return false;
      if (division && divisionName !== division) return false;
      if (nationality && player.nationalityId !== nationality) return false;
      if (position === 'goalkeeper' && !player.isGoalkeeper) return false;
      if (position === 'outfield' && player.isGoalkeeper) return false;
      if (maxContract !== null && player.contractYears > maxContract) return false;
      if (contract === 'expiring' && player.contractYears > 1) return false;
      if (contract === 'long' && player.contractYears <= 1) return false;
      return true;
    });

    // 3. Aplica a ordenação dinâmica
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return filtered.sort((a, b) => {
      let valA: any, valB: any;

      switch (column) {
        case 'name':
          valA = a.player.name;
          valB = b.player.name;
          return valA.localeCompare(valB) * direction;
        case 'team':
          valA = a.team.teamName;
          valB = b.team.teamName;
          return valA.localeCompare(valB) * direction;
        case 'age':
          valA = a.player.age;
          valB = b.player.age;
          break;
        case 'overallChange': // <-- Nova ordenação
          valA = a.overallChange;
          valB = b.overallChange;
          break;
        case 'contract':
          valA = a.player.contractYears;
          valB = b.player.contractYears;
          break;
        case 'value':
          valA = a.player.marketValue;
          valB = b.player.marketValue;
          break;
        default: // 'overall'
          valA = a.player.overall;
          valB = b.player.overall;
          break;
      }

      if (valA < valB) return -1 * direction;
      if (valA > valB) return 1 * direction;
      return 0;
    });
  });

  // --- Método para lidar com o clique na ordenação (NOVA ADIÇÃO) ---
  onSort(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  resetFilters() {
    this.searchTerm.set('');
    this.minOverall.set(null);
    this.maxOverall.set(null);
    this.minAge.set(null);
    this.maxAge.set(null);
    this.minValue.set(null);
    this.maxValue.set(null);
    this.selectedContinent.set(null);
    this.selectedCountry.set(null);
    this.selectedDivision.set(null);
    this.selectedNationality.set(null);
    this.selectedPosition.set('all');
    this.contractYearsMax.set(null);
    this.contractStatus.set('all');
  }

  onPlayerClick(player: Player, team: Team): void {
    this.viewPlayerDetails.emit({ player, team });
  }

  getFlagUrl(nationalityId: string): string | null {
    const code2 = this.nationalityMap.get(nationalityId?.toUpperCase());
    return code2 ? `https://flagcdn.com/w20/${code2.toLowerCase()}.png` : null;
  }

  private getNumberValue(event: Event): number | null {
    const num = (event.target as HTMLInputElement).valueAsNumber;
    return isNaN(num) ? null : num;
  }

  // Event handlers for filters
  updateSearchTerm(event: Event) { this.searchTerm.set((event.target as HTMLInputElement).value); }
  updateMinOverall(event: Event) { this.minOverall.set(this.getNumberValue(event)); }
  updateMaxOverall(event: Event) { this.maxOverall.set(this.getNumberValue(event)); }
  updateMinAge(event: Event) { this.minAge.set(this.getNumberValue(event)); }
  updateMaxAge(event: Event) { this.maxAge.set(this.getNumberValue(event)); }
  updateMinValue(event: Event) { this.minValue.set(this.getNumberValue(event)); }
  updateMaxValue(event: Event) { this.maxValue.set(this.getNumberValue(event)); }

  updateContinent(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedContinent.set(value || null);
    this.selectedCountry.set(null); // Reset country
    this.selectedDivision.set(null); // Reset division
  }

  updateCountry(event: Event) {
    this.selectedCountry.set((event.target as HTMLSelectElement).value || null);
    this.selectedDivision.set(null); // Reset division
  }

  updateDivision(event: Event) {
    this.selectedDivision.set((event.target as HTMLSelectElement).value || null);
  }

  updateContractStatus(event: Event) {
    this.contractStatus.set((event.target as HTMLSelectElement).value as 'all' | 'expiring' | 'long');
  }

  updateNationality(event: Event) {
    this.selectedNationality.set((event.target as HTMLSelectElement).value || null);
  }

  updatePosition(event: Event) {
    this.selectedPosition.set((event.target as HTMLSelectElement).value as any);
  }

  updateMaxContract(event: Event) {
    this.contractYearsMax.set(this.getNumberValue(event));
  }
}