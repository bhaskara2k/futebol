import { Component, ChangeDetectionStrategy, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Division, Team } from '../../models';
import { UniverseService } from '../../services/universe.service';

interface SouthAmericanQualificationSpots {
  lib: number;
  lib_po: number;
  sul: number;
}

@Component({
  selector: 'app-league-table',
  imports: [CommonModule],
  templateUrl: './league-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    tr.group {
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      position: relative;
    }
    tr.group:hover {
      transform: perspective(1000px) rotateX(2deg) rotateY(-1deg) scale(1.015) translateZ(5px);
      background: rgba(255, 255, 255, 0.07) !important;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
      z-index: 50;
    }
    /* Estilo para garantir que o efeito 3D não seja cortado pelo overflow do container */
    :host {
      display: block;
      contain: content;
    }
    table {
      border-collapse: separate;
      border-spacing: 0;
    }
  `]
})
export class LeagueTableComponent {
  division = input.required<Division>();
  countryId = input<string>();
  isInternational = input<boolean>(false);
  competitionId = input<string>();

  private universeService = inject(UniverseService);

  private paisesRank1_8: string[] = ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'RUS'];
  private paisesRank9_16: string[] = ['TUR', 'BEL', 'SUI', 'GRE', 'HRV', 'DNK', 'CZE', 'UKR'];
  private paisesRank17_32: string[] = ['SRB', 'SCO', 'NOR', 'SWE', 'AUT', 'BGR', 'ROU', 'POL', 'AZE', 'SVK', 'HUN', 'IRL', 'ALB', 'NIR', 'SVN', 'BIH'];
  private paisesRank33_48: string[] = ['LVA', 'LTU', 'FIN', 'MDA', 'ISR', 'KAZ', 'GEO', 'ARM', 'MKD', 'KOS', 'MNE', 'ISL', 'BLR', 'WAL', 'CYP', 'EST'];
  private paisesRank49_56: string[] = ['LUX', 'MLT', 'AND', 'GIB', 'LIE', 'SMR', 'MON', 'FRO'];

  private paisesNcaRank1_2: string[] = ['USA', 'MEX'];
  private paisesNcaRank3_18: string[] = ['CAN', 'CRC', 'HON', 'PAN', 'JAM', 'GUA', 'HAI', 'TRI', 'ELS', 'NIC', 'CUB', 'SUR', 'DOM', 'GNA', 'ANT', 'BAR'];
  private paisesNcaRank19_32: string[] = ['GRA', 'SLC', 'BER', 'SVG', 'MTS', 'BLZ', 'DNC', 'ARU', 'BHM', 'CAY', 'ITC', 'CUR', 'PRC', 'SCN'];

  private samSpots: { [key: string]: SouthAmericanQualificationSpots } = {
    // Novas vagas conforme sua solicitação
    'BRA': { lib: 6, lib_po: 0, sul: 6 },
    'ARG': { lib: 5, lib_po: 0, sul: 5 },
    'URU': { lib: 3, lib_po: 0, sul: 2 },
    'COL': { lib: 4, lib_po: 0, sul: 2 },
    'CHL': { lib: 4, lib_po: 0, sul: 2 },
    'PER': { lib: 2, lib_po: 0, sul: 3 },
    'BOL': { lib: 2, lib_po: 0, sul: 3 },
    'PAR': { lib: 2, lib_po: 0, sul: 3 },
    'EQU': { lib: 2, lib_po: 0, sul: 3 },
    'VEN': { lib: 2, lib_po: 0, sul: 3 },
  };

  private paisesVagaDireta: string[] = [
    'EGY', 'MAR', 'ALG', 'TUN', 'AFS', 'RDC', 'NIG', 'CAM', 'SEN', 'CIV', 'GAN', 'GUI', 'ANG', 'ZAM', 'CON', 'MAL'
  ];

  private paises3VagasPlayoff: string[] = [
    'BFA', 'UGA', 'TAZ', 'MOZ', 'MRT', 'SUD', 'GAB', 'GEQ', 'CDV', 'KEN', 'SLE', 'NGR', 'TOG', 'BEN', 'GAM', 'BSW', 'MAD', 'NAM', 'LBY', 'COM'
  ];

  private paises2VagasPlayoff: string[] = [
    'SWZ', 'LES', 'ETH', 'BDI', 'SSD', 'CHA', 'GNB', 'MWI', 'ZIM', 'RWA', 'ERI', 'CTA', 'LBR', 'MRI', 'STP', 'DJI', 'SOM', 'SEY'
  ];

  private isEuropean = computed(() => {
    const country = this.countryId();
    if (!country) return false;
    return this.universeService.getContinentForLeague(country) === 'EUR';
  });

  private isSouthAmerican = computed(() => {
    const country = this.countryId();
    if (!country) return false;
    return this.universeService.getContinentForLeague(country) === 'SAM';
  });

  private isNorthAmerican = computed(() => {
    const country = this.countryId();
    if (!country) return false;
    return this.universeService.getContinentForLeague(country) === 'NCA';
  });

  private isAfrican = computed(() => {
    const country = this.countryId();
    if (!country) return false;
    return this.universeService.getContinentForLeague(country) === 'AFR';
  });

  private isAsian = computed(() => {
    const country = this.countryId();
    if (!country) return false;
    return this.universeService.getContinentForLeague(country) === 'ASI';
  });

  private divisionsCount = computed(() => {
    const country = this.countryId();
    if (!country) return 0;
    const league = this.universeService.leagues().find(l => l.countryId === country);
    return league ? league.divisions.length : 0;
  });

  private qualificationSpots: { [key: string]: number } = {
    // Asia
    'SAU': 4, 'KOR': 4, 'JPN': 4, 'AUS': 4, 'CHN': 2, 'THA': 1, 'NZL': 1, 'IND': 1, 'VNM': 1, 'KGZ': 1,
    'BAH': 1, 'IRQ': 1, 'UZB': 1, 'IRN': 2, 'JOR': 2, 'QAT': 2, 'SYR': 2, 'ARE': 2, 'LBN': 1, 'OMN': 1, 'PAL': 1, 'TAJ': 1, 'MSA': 1, 'CNE': 1, 'IDN': 1, 'KUW': 1, 'FIL': 1, 'TCM': 1, 'YEM': 1, 'SGP': 1, 'AFE': 1, 'MYA': 1, 'MDS': 1, 'CBJ': 1, 'BAN': 1, 'MGL': 1, 'LAO': 1, 'BRU': 1, 'BUT': 1, 'SRI': 1, 'TIM': 1, 'PAQ': 1, 'NCL': 1, 'ISM': 1, 'FIJ': 1, 'THT': 1, 'VAN': 1, 'PNG': 1,


    // Africa - all get 1 spot
    'ALG': 1, 'CAM': 1, 'GEQ': 1, 'RDC': 1, 'CON': 1, 'MOZ': 1, 'GAM': 1, 'NIG': 1, 'MAR': 1, 'GAN': 1, 'CDV': 1, 'MAD': 1, 'TAZ': 1, 'NAM': 1, 'SEN': 1, 'TUN': 1, 'MAL': 1, 'GUI': 1, 'KEN': 1, 'TOG': 1, 'CIV': 1, 'EGY': 1, 'BFA': 1, 'BEN': 1, 'MRT': 1, 'SUD': 1, 'GAB': 1, 'AFS': 1, 'ZAM': 1, 'UGA': 1, 'ANG': 1, 'BSW': 1, 'COM': 1, 'NGR': 1, 'LBY': 1, 'ERI': 1, 'SLE': 1, 'MWI': 1, 'ZIM': 1, 'RWA': 1, 'GNB': 1, 'CTA': 1, 'LBR': 1, 'LES': 1, 'BDI': 1, 'ETH': 1, 'SSD': 1, 'CHA': 1, 'MRI': 1, 'SWZ': 1, 'STP': 1, 'DJI': 1, 'SOM': 1, 'SEY': 1,

    // North America
    'USA': 2, 'MEX': 2,
    'CRC': 1, 'HON': 1, 'GUA': 1, 'PAN': 1, 'CAN': 1, 'JAM': 1, 'HAI': 1, 'TRI': 1, 'NIC': 1, 'ELS': 1,
    'ANT': 1, 'CUB': 1, 'DOM': 1, 'BAR': 1, 'CUR': 1, 'SUR': 1, 'GNA': 1, 'SCN': 1, 'PRC': 1, 'GRA': 1, 'SLC': 1, 'BER': 1, 'SVG': 1, 'MTS': 1, 'BLZ': 1, 'DNC': 1, 'ARU': 1, 'BHM': 1, 'CAY': 1, 'ITC': 1,

    // South America (Libertadores Direct only, used as fallback)
    'BRA': 6, 'ARG': 5, 'URU': 3, 'PAR': 2, 'CHL': 4, 'BOL': 2, 'PER': 2, 'EQU': 2, 'COL': 4, 'VEN': 2
  };

  sortedTeams = computed(() => {
    // Computed signal: Só reexecuta se 'division()' mudar (referência mudar)
    // A simulação otimizada retorna uma nova referência de 'leagues', que deve propagar nova referência da divisão.
    return [...this.division().teams].sort((a, b) => {
      if (a.stats.points !== b.stats.points) {
        return b.stats.points - a.stats.points;
      }
      const goalDiffA = a.stats.goalsFor - a.stats.goalsAgainst;
      const goalDiffB = b.stats.goalsFor - b.stats.goalsAgainst;
      if (goalDiffA !== goalDiffB) {
        return goalDiffB - goalDiffA;
      }
      if (b.stats.goalsFor !== a.stats.goalsFor) {
        return b.stats.goalsFor - a.stats.goalsFor;
      }
      return a.teamName.localeCompare(b.teamName);
    });
  });

  recentForms = computed(() => {
    const forms = new Map<string, ('W' | 'D' | 'L')[]>();
    const div = this.division();
    const allMatches = div.fixtures.flat().filter(m => m.played).sort((a, b) => b.round - a.round);

    for (const team of div.teams) {
      const teamMatches = allMatches.filter(m => m.homeTeam.id === team.id || m.awayTeam.id === team.id).slice(0, 5);
      const form: ('W' | 'D' | 'L')[] = teamMatches.map(m => {
        const isHome = m.homeTeam.id === team.id;
        const score = isHome ? m.homeScore! : m.awayScore!;
        const opponentScore = isHome ? m.awayScore! : m.homeScore!;

        if (score > opponentScore) return 'W';
        if (score < opponentScore) return 'L';
        return 'D';
      });
      forms.set(team.id, form);
    }
    return forms;
  });

  getRowClass(index: number): string {
    const divName = this.division().name;
    const country = this.countryId();
    const compId = this.competitionId();

    // 1. International Competitions
    if (this.isInternational()) {
      if (compId && compId.startsWith('WC_Q_')) {
        if (compId.endsWith('EUR') && index < 2) return 'bg-emerald-900/40'; // Top 6 for Europe
        if (compId.endsWith('SAM') && index < 7) return 'bg-emerald-900/40'; // Top 5 for South America
        if (compId.endsWith('AFR') && index < 1) return 'bg-emerald-900/40'; // Top 3 for Africa
        if (compId.endsWith('ASI') && index < 1) return 'bg-emerald-900/40'; // Top 5 for Asia
        if (compId.endsWith('NCA') && index < 1) return 'bg-emerald-900/40'; // Top 4 for North America
        return 'bg-red-900/40'; // Eliminated
      }

      const teamCount = this.division().teams.length;
      if (teamCount === 6) { // Euro Cup groups
        if (index < 2) return 'bg-emerald-900/40'; // Top 2 advance
        return 'bg-red-900/40'; // Eliminated
      }
      if (teamCount === 5) { // Copa America / Asian Cup groups
        if (index < 2) return 'bg-emerald-900/40'; // Top 2 advance
        return 'bg-red-900/40'; // Eliminated
      }
      if (teamCount === 4) { // Libertadores/Sulamericana/National Cups groups
        if (index < 2) return 'bg-emerald-900/40';
        return 'bg-red-900/40'; // Eliminated
      }
      if (compId === 'ASI_CL' || compId === 'NCA_CL') {
        if (index < 8) return 'bg-emerald-900/40'; // Top 8 se classificam para Quartas
        return 'bg-red-900/40'; // Eliminado
      }

      if (teamCount === 32) { // Africa CL & Europe
        if (index < 8) return 'bg-emerald-900/40';  // Bye to Ro16
        if (index < 24) return 'bg-yellow-900/40'; // Play-in
        return 'bg-red-900/40'; // Eliminated
      }
      if (teamCount === 32) { // Africa CL, Europe CLs & North America CL
        if (index < 8) return 'bg-emerald-900/40';  // Bye to Ro16
        if (index < 24) return 'bg-yellow-900/40'; // Play-in
        return 'bg-red-900/40'; // Eliminated
      }

      return 'border-b border-gray-700';
    }

    // 2. National League Continental Qualification
    if (country && (divName.includes('Primeira') || divName.includes('Única') || divName.includes('Conferência') || divName === 'Série A' || divName === 'Liga Profesional' || ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Eredivisie', 'Russian Premier League', 'Jupiler Pro League', 'Süper Lig', 'Primeira Portugal', 'J1 League', 'K League 1', 'A-League', 'Saudi Pro League'].includes(divName))) {
      if (this.isEuropean()) {
        if (['ESP', 'ENG', 'ITA', 'GER', 'FRA'].includes(country)) {
          if (index < 4) return 'bg-blue-900/40';    // 4 CL Direta
          if (index < 8) return 'bg-orange-900/40';  // 4 EL Direta
        } else if (country === 'POR') {
          if (index < 4) return 'bg-blue-900/40';    // 4 CL Direta
          if (index < 7) return 'bg-orange-900/40';  // 3 EL Direta
        } else if (country === 'BEL') {
          if (index < 2) return 'bg-blue-900/40';    // 2 CL Direta
          if (index < 5) return 'bg-orange-900/40';  // 3 EL Direta
        } else if (['RUS', 'NED', 'TUR'].includes(country)) {
          if (index < 2) return 'bg-blue-900/40';    // 2 CL Direta
          if (index < 4) return 'bg-orange-900/40';  // 2 EL Direta
        }
      } else if (this.isSouthAmerican()) {
        const spots = this.samSpots[country];
        if (spots) {
          if (index < spots.lib) return 'bg-green-900/40';
          if (index < spots.lib + spots.lib_po) return 'bg-orange-900/40';
          if (index < spots.lib + spots.lib_po + spots.sul) return 'bg-blue-900/40';
        }
      } else if (country === 'USA') {
        if (index < 8) return 'bg-yellow-900/40'; // Vaga MLS Cup
      } else if (this.isNorthAmerican()) {
        if (index < 8) return 'bg-green-900/40'; // 8 vagas diretas (MEX)
      } else if (this.isAfrican()) {
        if (this.paisesVagaDireta.includes(country)) {
          if (index < 1) return 'bg-green-900/40';
          if (index < 3) return 'bg-blue-900/40';
        } else if (this.paises3VagasPlayoff.includes(country)) {
          if (index < 3) return 'bg-blue-900/40';
        } else if (this.paises2VagasPlayoff.includes(country)) {
          if (index < 2) return 'bg-blue-900/40';
        }
      } else if (this.isAsian()) {
        if (['JPN', 'SAU', 'KOR', 'AUS'].includes(country)) {
          if (index < 4) return 'bg-blue-900/40'; // 4 vagas CL
        } else if (this.qualificationSpots[country]) {
          if (index < this.qualificationSpots[country]) return 'bg-emerald-900/40';
        }
      } else if (this.qualificationSpots[country]) {
        if (index < this.qualificationSpots[country]) return 'bg-emerald-900/40';
      }
    }

    // 3. National League Promotion/Relegation
    if (country) {
      const league = this.universeService.leagues().find(l => l.countryId === country);
      if (league) {
        const divIndex = league.divisions.findIndex(d => d.id === this.division().id);
        const numTeams = this.division().teams.length;

        // Promoção (se não for a primeira divisão)
        if (divIndex > 0) {
          const promoSlots = league.divisions[divIndex - 1].relegationSlots ?? 0;
          if (index < promoSlots) return 'bg-yellow-900/40';
        }

        // Rebaixamento (se não for a última divisão)
        if (divIndex < league.divisions.length - 1) {
          const releSlots = this.division().relegationSlots ?? 0;
          if (index >= numTeams - releSlots) return 'bg-red-900/40';
        }
      }
    }

    return 'border-b border-gray-700';
  }

  getPositionIcon(index: number): { icon?: string, class?: string, img?: string, title: string } | null {
    const divName = this.division().name;
    const country = this.countryId();
    const compId = this.competitionId();

    // 1. International Competitions
    if (this.isInternational()) {
      if (compId && compId.startsWith('WC_Q_')) {
        let qualified = false;
        if (compId.endsWith('EUR') && index < 2) qualified = true;
        if (compId.endsWith('SAM') && index < 7) qualified = true;
        if (compId.endsWith('AFR') && index < 1) qualified = true;
        if (compId.endsWith('ASI') && index < 1) qualified = true;
        if (compId.endsWith('NCA') && index < 1) qualified = true;

        if (qualified) {
          return { icon: 'fa-check-circle', class: 'text-green-500', title: 'Classificado para a Copa do Mundo' };
        }
        return { icon: 'fa-times-circle', class: 'text-red-500', title: 'Eliminado' };
      }

      const teamCount = this.division().teams.length;
      if (teamCount === 6) { // Euro Cup
        if (index < 2) return { icon: 'fa-check-circle', class: 'text-green-500', title: 'Classificado para a Próxima Fase' };
        return { icon: 'fa-times-circle', class: 'text-red-500', title: 'Eliminado' };
      }
      if (teamCount === 5) { // Copa America / Asian Cup
        if (index < 2) return { icon: 'fa-check-circle', class: 'text-green-500', title: 'Classificado para a Próxima Fase' };
        return { icon: 'fa-times-circle', class: 'text-red-500', title: 'Eliminado' };
      }
      if (teamCount === 4) { // Libertadores/Sulamericana
        if (index < 2) return { icon: 'fa-check-circle', class: 'text-green-500', title: 'Classificado para o Mata-mata' };
        return { icon: 'fa-times-circle', class: 'text-red-500', title: 'Eliminado' };
      }
      if (compId === 'ASI_CL' || compId === 'NCA_CL') {
        if (index < 8) return { icon: 'fa-check-circle', class: 'text-green-500', title: 'Classificado para o Mata-mata' };
        return { icon: 'fa-times-circle', class: 'text-red-500', title: 'Eliminado' };
      }
      if (teamCount === 32) { // Africa CL
        if (index < 8) return { icon: 'fa-angle-double-right', class: 'text-green-500', title: 'Vaga Direta Oitavas' };
        if (index < 24) return { icon: 'fa-angle-right', class: 'text-yellow-500', title: 'Vaga 1ª Fase' };
        return { icon: 'fa-times', class: 'text-red-500', title: 'Eliminado' };
      }
      if (teamCount === 16 && divName === 'Fase de Liga') { // North America CL
        if (index < 8) return { icon: 'fa-check-circle', class: 'text-green-500', title: 'Classificado para o Mata-mata' };
        return { icon: 'fa-times-circle', class: 'text-red-500', title: 'Eliminado' };
      }
    }

    // 2. National League Continental Qualification
    if (country && (divName.includes('Primeira') || divName.includes('Única') || divName.includes('Conferência') || divName === 'Série A' || divName === 'Liga Profesional' || ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Eredivisie', 'Russian Premier League', 'Jupiler Pro League', 'Süper Lig', 'Primeira Portugal', 'J1 League', 'K League 1', 'A-League', 'Saudi Pro League'].includes(divName))) {
      if (this.isEuropean()) {
        const clLogo = 'assets/icons/champions-league.png';
        const elLogo = 'assets/icons/europa-league.png';

        if (['ESP', 'ENG', 'ITA', 'GER', 'FRA'].includes(country)) {
          if (index < 4) return { img: clLogo, title: 'Vaga Direta Champions League' };
          if (index < 8) return { img: elLogo, title: 'Vaga Direta Europa League' };
        } else if (country === 'POR') {
          if (index < 4) return { img: clLogo, title: 'Vaga Direta Champions League' };
          if (index < 7) return { img: elLogo, title: 'Vaga Direta Europa League' };
        } else if (country === 'BEL') {
          if (index < 2) return { img: clLogo, title: 'Vaga Direta Champions League' };
          if (index < 5) return { img: elLogo, title: 'Vaga Direta Europa League' };
        } else if (['RUS', 'NED', 'TUR'].includes(country)) {
          if (index < 2) return { img: clLogo, title: 'Vaga Direta Champions League' };
          if (index < 4) return { img: elLogo, title: 'Vaga Direta Europa League' };
        }
      } else if (this.isSouthAmerican()) {
        const libLogo = 'assets/icons/libertadores.png';
        const sulLogo = 'assets/icons/sudamericana.png';
        const spots = this.samSpots[country];
        if (spots) {
          if (index < spots.lib) return { img: libLogo, title: 'Vaga para Libertadores' };
          if (index < spots.lib + spots.lib_po) return { img: libLogo, title: 'Vaga para Pré-Libertadores' }; // Usando lib logo pra pré tb
          if (index < spots.lib + spots.lib_po + spots.sul) return { img: sulLogo, title: 'Vaga para Sulamericana' };
        }
      } else if (country === 'USA') {
        const mlsLogo = 'assets/icons/mls_cup.png';
        if (index < 8) return { img: mlsLogo, title: 'Vaga MLS Cup' };
      } else if (this.isNorthAmerican()) {
        const ncaLogo = 'assets/icons/america-champions.png';
        if (index < 8) return { img: ncaLogo, title: 'Vaga Direta America Champions League' };
      } else if (this.isAfrican()) {
        if (this.paisesVagaDireta.includes(country)) {
          if (index < 1) return { icon: 'fa-angle-right', class: 'text-green-400', title: 'Vaga Direta Africa Champions League' };
          if (index < 3) return { icon: 'fa-angle-right', class: 'text-blue-400', title: 'Vaga para Pré-Africa Champions League' };
        } else if (this.paises3VagasPlayoff.includes(country)) {
          if (index < 3) return { icon: 'fa-angle-right', class: 'text-blue-400', title: 'Vaga para Pré-Africa Champions League' };
        } else if (this.paises2VagasPlayoff.includes(country)) {
          if (index < 2) return { icon: 'fa-angle-right', class: 'text-blue-400', title: 'Vaga para Pré-Africa Champions League' };
        }
      } else if (this.isAsian()) {
        const asiLogo = 'assets/icons/asia-champions-league.png';
        if (['JPN', 'SAU', 'KOR', 'AUS'].includes(country)) {
          if (index < 4) return { img: asiLogo, title: 'Vaga Champions League da Ásia' };
        } else if (this.qualificationSpots[country]) {
          if (index < this.qualificationSpots[country]) return { img: asiLogo, title: 'Vaga Champions League da Ásia' };
        }
      }
    }

    // 3. National League Promotion/Relegation
    if (country) {
      const league = this.universeService.leagues().find(l => l.countryId === country);
      if (league) {
        const divIndex = league.divisions.findIndex(d => d.id === this.division().id);
        const numTeams = this.division().teams.length;

        // Promoção
        if (divIndex > 0) {
          const promoSlots = league.divisions[divIndex - 1].relegationSlots ?? 0;
          if (index < promoSlots) return { icon: 'fa-arrow-up', class: 'text-yellow-500', title: 'Promovido' };
        }

        // Rebaixamento
        if (divIndex < league.divisions.length - 1) {
          const releSlots = this.division().relegationSlots ?? 0;
          if (releSlots > 0 && index >= numTeams - releSlots) return { icon: 'fa-arrow-down', class: 'text-red-500', title: 'Rebaixado' };
        }
      }
    }

    return null;
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
