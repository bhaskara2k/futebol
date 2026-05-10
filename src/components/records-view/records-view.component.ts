import { Component, ChangeDetectionStrategy, inject, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniverseService } from '../../services/universe.service';
import { CurrencyShortPipe } from '../../pipes/currency-short.pipe';
import { Player, Team, Trophy, CompetitionRecord, SeasonRecord, InternationalSeasonRecord } from '../../models';
import { NATIONALITIES } from '../../nationalities.data';

type ActiveTab = 'players' | 'clubs' | 'competitions' | 'national_trophies';

interface PlayerStatRecord {
  player: Player;
  team: Team;
  value: number;
}

interface SingleSeasonBest {
  player: Player;
  team: Team;
  value: number;
  season: number;
}

@Component({
  selector: 'app-records-view',
  imports: [CommonModule, CurrencyShortPipe],
  templateUrl: './records-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsViewComponent {
  universeService = inject(UniverseService);

  viewPlayerDetails = output<{ player: Player, team: Team }>();
  viewTeamDetails = output<Team>();

  activeTab = signal<ActiveTab>('players');
  selectedCompetitionForRecords = signal<string | null>(null);

  private nationalityMap = new Map<string, string>(NATIONALITIES.map(n => [n.code3, n.code2]));

  private allPlayersWithTeam = computed(() => {
    return this.universeService.teams()
      .filter(t => t.countryId !== 'AAA' && t.countryId !== 'BBB')
      .flatMap(team => team.players.map(player => ({ player, team })));
  });

  // Players Tab
  decoratedPlayers = computed<PlayerStatRecord[]>(() => {
    const playerTrophies = new Map<string, { player: Player; team: Team; trophies: Set<string> }>();

    const processHistory = (history: (SeasonRecord | InternationalSeasonRecord)[], compTypeResolver: (comp: any) => Trophy['type']) => {
      history.forEach(season => {
        const processCompetition = (compRecord: CompetitionRecord | undefined) => {
          if (compRecord?.champion?.players) {
            const trophyId = `${compRecord.name}-${season.season}`;
            compRecord.champion.players.forEach((p: Player) => {
              let playerData = playerTrophies.get(p.id);
              if (!playerData) {
                const currentTeam = this.findPlayerTeam(p.id);
                if (currentTeam) {
                  playerData = { player: p, team: currentTeam, trophies: new Set() };
                  playerTrophies.set(p.id, playerData);
                }
              }
              playerData?.trophies.add(trophyId);
            });
          }
        };

        if ('division1' in season) { // SeasonRecord
          processCompetition(season.division1);
          processCompetition(season.division2);
          processCompetition(season.division3);
          processCompetition(season.division4);
          processCompetition(season.cup);
          processCompetition(season.leagueCup);
        } else { // InternationalSeasonRecord
          processCompetition(season);
        }
      });
    };

    this.universeService.leagues().forEach(league => {
      processHistory(league.history, () => 'national_league'); // Type is complex, simplifying for now
    });

    this.universeService.internationalCompetitions().forEach(comp => {
      processHistory(comp.history, c => c.id === 'WORLD_CWC' ? 'world' : 'international');
    });

    return Array.from(playerTrophies.values())
      .map(data => ({ player: data.player, team: data.team, value: data.trophies.size }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 25);
  });

  globalAllTimeTopScorers = computed<PlayerStatRecord[]>(() => {
    return this.allPlayersWithTeam()
      .map(({ player, team }) => {
        const careerStats = player.careerStats || {};
        const totalGoals = Object.keys(careerStats).reduce((sum, key) => sum + (careerStats[key].goals || 0), 0);
        return { player, team, value: totalGoals };
      })
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 25);
  });

  globalAllTimeTopAssists = computed<PlayerStatRecord[]>(() => {
    return this.allPlayersWithTeam()
      .map(({ player, team }) => {
        const careerStats = player.careerStats || {};
        const totalAssists = Object.keys(careerStats).reduce((sum, key) => sum + (careerStats[key].assists || 0), 0);
        return { player, team, value: totalAssists };
      })
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 25);
  });

  // Clubs Tab
  biggestTransfers = computed(() => {
    return [...this.universeService.transferHistory()]
      .sort((a, b) => b.fee - a.fee)
      .slice(0, 25);
  });

  teamsWithMostTitles = computed(() => {
    return this.universeService.teams()
      .map(team => {
        const totalTitles = (team.trophies || []).reduce((sum, trophy) => sum + trophy.count, 0);
        return { team, titleCount: totalTitles };
      })
      .filter(item => item.titleCount > 0)
      .sort((a, b) => b.titleCount - a.titleCount)
      .slice(0, 25);
  });

  // National Trophies Tab
  selectedContinent = signal<string | null>(null);
  selectedCountry = signal<string | null>(null);

  continents = [
    { code: 'EUR', name: 'Europa' },
    { code: 'SAM', name: 'América do Sul' },
    { code: 'AFR', name: 'África' },
    { code: 'ASI', name: 'Ásia' },
    { code: 'NCA', name: 'América do Norte' }
  ];

  // Listas de fallback para identificar continente em saves antigos
  private readonly SAM_IDS = ['BRA', 'ARG', 'URU', 'COL', 'CHL', 'PAR', 'BOL', 'PER', 'VEN', 'EQU'];
  private readonly NCA_IDS = ['USA', 'MEX', 'CRC', 'HON', 'PAN', 'JAM', 'HAI', 'TRI', 'GUA', 'NIC', 'CAN', 'ELS', 'CUB', 'ANT', 'DOM', 'BAR', 'CUR', 'SUR', 'GNA', 'SCN', 'PRC', 'GRA', 'SLC', 'BER', 'SVG', 'MTS', 'BLZ', 'DNC', 'ARU', 'BHM', 'CAY', 'ITC'];
  private readonly ASI_IDS = ['JPN', 'AUS', 'SAU', 'KOR', 'CHN', 'OMN', 'VNM', 'KGZ', 'IND', 'ARE', 'LBN', 'BAH', 'IRQ', 'QAT', 'IRN', 'JOR', 'SYR', 'UZB', 'THA', 'NZL', 'PAL', 'TAJ', 'MSA', 'CNE', 'IDN', 'KUW', 'FIL', 'TCM', 'YEM', 'SGP', 'AFE', 'MYA', 'MDS', 'CBJ', 'BAN', 'MGL', 'LAO', 'BRU', 'BUT', 'SRI', 'TIM', 'PAQ', 'NCL', 'ISM', 'FIJ', 'THT', 'VAN', 'PNG'];
  private readonly AFR_IDS = ['ALG', 'CAM', 'GEQ', 'RDC', 'CON', 'MOZ', 'GAM', 'NIG', 'MAR', 'GAN', 'CDV', 'MAD', 'TAZ', 'NAM', 'SEN', 'TUN', 'MAL', 'GUI', 'KEN', 'TOG', 'CIV', 'EGY', 'BFA', 'BEN', 'MRT', 'SUD', 'GAB', 'AFS', 'ZAM', 'UGA', 'ANG', 'BSW', 'COM', 'NGR', 'LBY', 'ERI', 'SLE', 'MWI', 'ZIM', 'RWA', 'GNB', 'CTA', 'LBR', 'LES', 'BDI', 'ETH', 'SSD', 'CHA', 'MRI', 'SWZ', 'STP', 'DJI', 'SOM', 'SEY'];

  availableCountries = computed(() => {
    const continentDetails = this.selectedContinent(); // Renomeado para evitar conflito
    if (!continentDetails) return [];

    const countryIds = new Set<string>();

    this.universeService.leagues().forEach(l => {
      let leagueContinent = l.continent;

      // Fallback para saves antigos sem a propriedade continent
      if (!leagueContinent) {
        if (this.AFR_IDS.includes(l.countryId)) leagueContinent = 'AFR';
        else if (this.SAM_IDS.includes(l.countryId)) leagueContinent = 'SAM';
        else if (this.NCA_IDS.includes(l.countryId)) leagueContinent = 'NCA';
        else if (this.ASI_IDS.includes(l.countryId)) leagueContinent = 'ASI';
        else leagueContinent = 'EUR'; // Default assumido
      }

      if (leagueContinent === continentDetails) {
        countryIds.add(l.countryId);
      }
    });

    return Array.from(countryIds).map(id => {
      const league = this.universeService.leagues().find(l => l.countryId === id);
      return { id, name: league ? league.countryName : id };
    }).sort((a, b) => a.name.localeCompare(b.name));
  });

  nationalTrophiesData = computed(() => {
    const countryId = this.selectedCountry();
    if (!countryId) return [];

    const teamsFromCountry = this.universeService.teams().filter(t => t.countryId === countryId);
    if (teamsFromCountry.length === 0) return [];

    // Agrupar troféus por nome
    const trophiesMap = new Map<string, { name: string, rankings: { team: Team, count: number }[] }>();

    teamsFromCountry.forEach(team => {
      if (team.trophies) {
        team.trophies.forEach(trophy => {
          // Filtra troféus internacionais para não misturar
          // Assumindo que troféus nacionais não têm IDs como 'EUR_CL', ou têm nomes como 'Liga Nacional', 'Copa Nacional'
          // Uma estratégia melhor: verificar se o nome do troféu bate com alguma competição nacional desse país
          // Mas como o pedido é mostrar divisões inferiores também, vamos confiar no filtro de país.
          // Filtra troféus internacionais para não misturar
          // O objeto trophy no time tem apenas { name: string, count: number }

          // Lista de nomes de competições internacionais para ignorar
          const internationalCompNames = this.universeService.internationalCompetitions().map(c => c.name);

          // Adicionar variações conhecidas se necessário
          const ignoredNames = [...internationalCompNames, 'Copa do Mundo', 'Eurocopa', 'Copa da Ásia', 'Liga Africana das Nações', 'Gold Cup'];

          const isInternational = ignoredNames.some(ignored => trophy.name === ignored || trophy.name.includes('Qualificatórias'));

          if (!isInternational && !trophy.name.startsWith('WC_') && !trophy.name.startsWith('Sel.')) {
            if (!trophiesMap.has(trophy.name)) {
              trophiesMap.set(trophy.name, { name: trophy.name, rankings: [] });
            }
            const compData = trophiesMap.get(trophy.name)!;
            compData.rankings.push({ team: team, count: trophy.count });
          }
        });
      }
    });

    // Ordenar rankings e filtrar competições vazias
    return Array.from(trophiesMap.values())
      .map(comp => ({
        ...comp,
        rankings: comp.rankings.sort((a, b) => b.count - a.count)
      }))
      .filter(comp => comp.rankings.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordem alfabética das competições
  });

  // Competitions Tab
  competitionsForRecords = computed(() => {
    const national = this.universeService.leagues()
      .filter(l => l.history.length > 0)
      .map(l => ({ id: l.countryId, name: l.countryName, group: 'Ligas Nacionais' }));

    const international = this.universeService.internationalCompetitions()
      .filter(c => c.history.length > 0)
      .map(c => ({ id: c.id, name: c.name, group: 'Competições Internacionais' }));

    return {
      national: national.sort((a, b) => a.name.localeCompare(b.name)),
      international: international.sort((a, b) => a.name.localeCompare(b.name)),
    }
  });

  allTimeRecordsByCompetition = computed(() => {
    const competitionId = this.selectedCompetitionForRecords();
    if (!competitionId) return { topScorers: [], topAssists: [] };

    const goalRecords: { player: Player; team: Team; value: number }[] = [];
    const assistRecords: { player: Player; team: Team; value: number }[] = [];

    this.allPlayersWithTeam().forEach(({ player, team }) => {
      const stats = player.careerStats?.[competitionId];
      if (stats) {
        if (stats.goals > 0) goalRecords.push({ player, team, value: stats.goals });
        if (stats.assists > 0) assistRecords.push({ player, team, value: stats.assists });
      }
    });

    return {
      topScorers: goalRecords.sort((a, b) => b.value - a.value).slice(0, 25),
      topAssists: assistRecords.sort((a, b) => b.value - a.value).slice(0, 25)
    };
  });

  singleSeasonBests = computed<{ topScorer: SingleSeasonBest | null, topAssister: SingleSeasonBest | null }>(() => {
    const competitionId = this.selectedCompetitionForRecords();
    if (!competitionId) return { topScorer: null, topAssister: null };

    let history: any[] = [];
    const league = this.universeService.leagues().find(l => l.countryId === competitionId);
    if (league) {
      history = league.history;
    } else {
      const intComp = this.universeService.internationalCompetitions().find(c => c.id === competitionId);
      if (intComp) history = intComp.history;
    }

    if (history.length === 0) return { topScorer: null, topAssister: null };

    let bestScorer: SingleSeasonBest | null = null;
    let bestAssister: SingleSeasonBest | null = null;

    history.forEach(seasonRecord => {
      const processComp = (compRecord: CompetitionRecord) => {
        if (!compRecord) return;

        if (compRecord.topScorer?.player) {
          // Prioriza o valor gravado no histórico. Se não existir (saves antigos), tenta somar stats (menos preciso)
          const goals = compRecord.topScorer.value ??
            ((compRecord.topScorer.player.stats?.goals || 0) + (compRecord.topScorer.player.cupStats?.goals || 0));

          if (goals > 0 && (!bestScorer || goals > bestScorer.value)) {
            const team = this.findPlayerTeamByName(compRecord.topScorer.player.id, compRecord.topScorer.teamName);
            if (team) {
              bestScorer = {
                player: compRecord.topScorer.player,
                team: team,
                value: goals,
                season: seasonRecord.season
              };
            }
          }
        }

        if (compRecord.topAssister?.player) {
          const assists = compRecord.topAssister.value ??
            ((compRecord.topAssister.player.stats?.assists || 0) + (compRecord.topAssister.player.cupStats?.assists || 0));

          if (assists > 0 && (!bestAssister || assists > bestAssister.value)) {
            const team = this.findPlayerTeamByName(compRecord.topAssister.player.id, compRecord.topAssister.teamName);
            if (team) {
              bestAssister = {
                player: compRecord.topAssister.player,
                team: team,
                value: assists,
                season: seasonRecord.season
              };
            }
          }
        }
      };

      if ('division1' in seasonRecord) { // SeasonRecord
        processComp(seasonRecord.division1);
        processComp(seasonRecord.cup);
        if (seasonRecord.leagueCup) processComp(seasonRecord.leagueCup);
      } else { // InternationalSeasonRecord
        processComp(seasonRecord);
      }
    });

    return { topScorer: bestScorer, topAssister: bestAssister };
  });

  onCompetitionChange(event: Event): void {
    this.selectedCompetitionForRecords.set((event.target as HTMLSelectElement).value || null);
  }

  getFlagUrl(nationalityId: string): string {
    const code2 = this.nationalityMap.get(nationalityId?.toUpperCase());
    return code2 ? `https://flagcdn.com/w20/${code2.toLowerCase()}.png` : '';
  }

  private findPlayerTeam(playerId: string): Team | undefined {
    return this.allPlayersWithTeam().find(p => p.player.id === playerId)?.team;
  }

  private findPlayerTeamByName(playerId: string, teamName: string | null): Team | undefined {
    if (!teamName) return this.findPlayerTeam(playerId);
    return this.universeService.teams().find(t => t.teamName === teamName);
  }

  onPlayerNameClick(player: Player, team: Team) {
    this.viewPlayerDetails.emit({ player, team });
  }

  onPlayerNameClickByName(playerName: string, teamName: string) {
    const allTeams = this.universeService.teams();
    let foundPlayer: { player: Player, team: Team } | undefined;

    // First try the provided team name for efficiency
    const targetTeam = allTeams.find(t => t.teamName === teamName);
    if (targetTeam) {
      const player = targetTeam.players.find(p => p.name === playerName);
      if (player) foundPlayer = { player, team: targetTeam };
    }

    // If not found, search all teams (player may have transferred)
    if (!foundPlayer) {
      for (const team of allTeams) {
        const player = team.players.find(p => p.name === playerName);
        if (player) {
          foundPlayer = { player, team };
          break;
        }
      }
    }

    if (foundPlayer) {
      this.viewPlayerDetails.emit(foundPlayer);
    }
  }

  onTeamNameClick(teamName: string) {
    const team = this.universeService.teams().find(t => t.teamName === teamName);
    if (team) {
      this.viewTeamDetails.emit(team);
    }
  }
}
