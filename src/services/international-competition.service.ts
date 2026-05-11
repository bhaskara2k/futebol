
import { Injectable, inject } from '@angular/core';
import { League, Team, Player, Division, Match, Cup, CupMatch, CupRound, InternationalCompetition, Trophy, InternationalSeasonRecord, ChampionshipRankingRecord, SeasonRecord } from '../models';
import { UniverseService } from './universe.service';
import { SimulationService } from './simulation.service';
import { SeasonService } from './season.service';
import { CompetitionService } from './competition.service';

@Injectable({ providedIn: 'root' })
export class InternationalCompetitionService {
  universeService = inject(UniverseService);
  simulationService = inject(SimulationService);
  seasonService = inject(SeasonService);
  // FIX: Injected competition service to use its shared methods.
  competitionService = inject(CompetitionService);
  private _isSimulatingMassive = false;


  private paisesNcaRank1_2: string[] = ['USA', 'MEX'];
  private paisesNcaRank3_18: string[] = ['CAN', 'CRC', 'HON', 'PAN', 'JAM', 'GUA', 'HAI', 'TRI', 'ELS', 'NIC', 'CUB', 'SUR', 'DOM', 'GNA', 'ANT', 'BAR'];
  private paisesNcaRank19_32: string[] = ['GRA', 'SLC', 'BER', 'SVG', 'MTS', 'BLZ', 'DNC', 'ARU', 'BHM', 'CAY', 'ITC', 'CUR', 'PRC', 'SCN'];

  // Estas listas definem a força relativa das ligas para distribuição de vagas.
  private paisesRank1_8: string[] = ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'RUS'];
  private paisesRank9_16: string[] = ['TUR', 'BEL', 'SUI', 'GRE', 'HRV', 'DNK', 'CZE', 'UKR'];
  private paisesRank17_32: string[] = ['SRB', 'SCO', 'NOR', 'SWE', 'AUT', 'BGR', 'ROU', 'POL', 'AZE', 'SVK', 'HUN', 'IRL', 'ALB', 'NIR', 'SVN', 'BIH'];
  private paisesRank33_48: string[] = ['LVA', 'LTU', 'FIN', 'MDA', 'ISR', 'KAZ', 'GEO', 'ARM', 'MKD', 'KOS', 'MNE', 'ISL', 'BLR', 'WAL', 'CYP', 'EST'];
  private paisesRank49_56: string[] = ['LUX', 'MLT', 'AND', 'GIB', 'LIE', 'SMR', 'MON', 'FRO'];

  public getTeamsByStanding(countryId: string, startIdx: number, count: number): Team[] {
    const league = this.universeService.leagues().find(l => l.countryId === countryId);
    if (!league) {
      console.error(`League not found for countryId: ${countryId} in getTeamsByStanding`);
      return [];
    }
    // Sort teams by points and other criteria to get correct standings.
    const sortedTeams = [...league.divisions[0].teams].sort(this.universeService.sortTeams);

    if (startIdx >= sortedTeams.length) {
      console.error(`getTeamsByStanding: startIdx ${startIdx} is out of bounds for ${countryId} which has ${sortedTeams.length} teams.`);
      return [];
    }
    const slicedTeams = sortedTeams.slice(startIdx, startIdx + count);
    if (slicedTeams.some(t => t === undefined)) {
      console.error(`getTeamsByStanding for ${countryId} produced undefined teams.`);
      return slicedTeams.filter(Boolean); // Filter out undefineds
    }
    return JSON.parse(JSON.stringify(slicedTeams));
  }

  public setupAcn(): void {}

  public setupGoldCup(): void {}

  public setupAsianCup(): void {}

  public setupEuroCup(): void {}

  public getSlotDistribution(): any {
    return {
      EUR: {
        name: 'Europa (UEFA)',
        clubCompetitions: [
          { rank: 'Rank 1-8', description: 'Champions: 3 Diretas + 1 Playoff 1 (Pos 4) | Europa League: 2 Diretas | Euro League: 1 Direta', countries: this.paisesRank1_8 },
          { rank: 'Rank 9-16', description: 'Champions: 2 Playoff 1 | Europa League: 1 Playoff 1 | Euro League: 1 Playoff 1', countries: this.paisesRank9_16 },
          { rank: 'Rank 17-32', description: 'Champions: 1 Playoff 1 | Europa League: 2 Playoff 1 | Euro League: 1 Playoff 1', countries: this.paisesRank17_32 },
          { rank: 'Rank 33-48', description: 'Champions: 1 Playoff 1 | Europa League: 1 Playoff 1 | Euro League: 2 Playoff 1', countries: this.paisesRank33_48 },
          { rank: 'Rank 49-56', description: 'Champions: 1 Playoff 1 | Europa League: 1 Playoff 1 | Euro League: 1 Playoff 1', countries: this.paisesRank49_56 }
        ],
        nationalCompetitions: [
          { name: 'Eurocopa', description: '56 Participantes: 16 na Fase Preliminar, restantes na Fase de Liga' },
          { name: 'Eliminatórias Copa do Mundo', description: '8 Grupos de 7 times (Jogos de ida e volta)' }
        ]
      },
      SAM: {
        name: 'América do Sul (CONMEBOL)',
        clubCompetitions: [
          { rank: 'Brasil', description: 'Libertadores: 5 Diretas | Sul-Americana: 4 Diretas', countries: ['BRA'] },
          { rank: 'Argentina', description: 'Libertadores: 4 Diretas | Sul-Americana: 4 Diretas', countries: ['ARG'] },
          { rank: '6 Países (URU/COL/etc)', description: 'Libertadores: 2 Diretas + 2 Playoffs | Sul-Americana: 2 Diretas', countries: ['URU', 'COL', 'CHL', 'PER', 'BOL', 'PAR', 'EQU'] },
          { rank: 'Venezuela', description: 'Libertadores: 1 Direta + 2 Playoffs | Sul-Americana: 2 Diretas', countries: ['VEN'] }
        ],
        nationalCompetitions: [

          { name: 'Eliminatórias Copa do Mundo', description: 'Grupo Único de 10 times (Rodízio duplo)' }
        ]
      },
      NCA: {
        name: 'América do Norte/Central (CONCACAF)',
        clubCompetitions: [
          { rank: 'Rank 1-2', description: 'Champions League: 4 Diretas + 2 Playoffs 1', countries: this.paisesNcaRank1_2 },
          { rank: 'Rank 3-18', description: 'Champions League: 4 Playoffs 1', countries: this.paisesNcaRank3_18 },
          { rank: 'Rank 19-32', description: 'Champions League: 2 Playoffs 1', countries: this.paisesNcaRank19_32 }
        ],
        nationalCompetitions: [
          { name: 'Gold Cup', description: '32 Participantes (8 Grupos de 4)' },
          { name: 'Eliminatórias Copa do Mundo', description: '8 Grupos de 4 times (32 total)' }
        ]
      },
      AFR: {
        name: 'África (CAF)',
        clubCompetitions: [
          { rank: 'Top 16', description: 'Champions League: 1 Direta + 2 Playoffs 1 (Vice e 3º)', countries: ['EGY', 'MAR', 'ALG', 'TUN', 'AFS', 'RDC', 'NIG', 'CAM', 'SEN', 'CIV', 'GAN', 'GUI', 'ANG', 'ZAM', 'CON', 'MAL'] },
          { rank: 'Intermediário (20)', description: 'Champions League: 3 Playoffs 1 (Campeão, Vice e 3º)', countries: ['BFA', 'UGA', 'TAZ', 'MOZ', 'LBY', 'SUD', 'GAB', 'GEQ', 'ZIM', 'KEN', 'ETH', 'RWA', 'TOG', 'BEN', 'SLE', 'BSW', 'MWI', 'NAM', 'BDI', 'GNB'] },
          { rank: 'Menores (18)', description: 'Champions League: 2 Playoffs 1 (Campeão e Vice)', countries: ['SWZ', 'LES', 'GAM', 'MRT', 'SSD', 'CHA', 'COM', 'MAD', 'CDV', 'NGR', 'ERI', 'CTA', 'LBR', 'MRI', 'STP', 'DJI', 'SOM', 'SEY'] }
        ],
        nationalCompetitions: [
          { name: 'African Nations Cup', description: '32 Participantes (8 Grupos de 4)' },
          { name: 'Eliminatórias Copa do Mundo', description: '9 Grupos de 6 times (54 total)' }
        ]
      },
      ASI: {
        name: 'Ásia/Oceania (AFC/OFC)',
        clubCompetitions: [
          { rank: 'Top Tier (4 Vagas)', description: '4 Diretas para Fase de Liga', countries: ['JPN', 'SAU'] },
          { rank: 'High Tier (3 Vagas)', description: '3 Diretas para Fase de Liga', countries: ['AUS', 'KOR'] },
          { rank: 'Mid Tier (2 Vagas)', description: '2 Diretas para Fase de Liga', countries: ['CHN', 'SYR', 'QAT', 'IRN', 'ARE', 'JOR'] },
          { rank: 'General Tier (1 Vaga)', description: '1 Direta para Fase de Liga', countries: ['NCL', 'VNM', 'THA', 'NZL', 'MSA', 'CNE', 'IDN', 'FIL', 'SGP', 'MYA', 'FIJ', 'CBJ', 'PNG', 'MGL', 'LAO', 'BRU', 'VAN', 'THT', 'TIM', 'ISM', 'BAH', 'IRQ', 'OMN', 'LBN', 'KGZ', 'PAL', 'TAJ', 'KUW', 'YEM', 'AFE', 'PAQ', 'UZB', 'TCM', 'MDS', 'SRI', 'BUT', 'BAN', 'IND'] }
        ],
        nationalCompetitions: [
          { name: 'Asian Cup', description: '48 Participantes (8 Grupos de 6)' },
          { name: 'Eliminatórias Copa do Mundo', description: '8 Grupos de 6 times (48 total)' }
        ]
      }
    };
  }

  public startInternationalCompetition(continent: 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR'): void {
    if (continent === 'AFR') {
      this.startAfricaCompetition();
    } else if (continent === 'ASI') {
      this.startAsiaCompetition();
    } else if (continent === 'NCA') {
      this.startNorthAmericaCompetition();
    } else if (continent === 'SAM') {
      this.startSouthAmericaPlayoffs();
    } else if (continent === 'EUR') {
      this.startEuropePlayoffs();
    }
  }

  public simulateAllContinentalCompetitions(continent: 'EUR' | 'SAM' | 'NCA' | 'ASI' | 'AFR'): void {
    if (this._isSimulatingMassive) return;
    this._isSimulatingMassive = true;

    try {
      let safety = 0;
    while (safety < 200) {
      const comps = this.universeService.internationalCompetitions();
      const continentComps = comps.filter(c => c.continent === continent);
      const knownEurIds = ['EUR_CL', 'EUR_EL'];
      const mainComps = continent === 'EUR'
        ? continentComps.filter(c => knownEurIds.includes(c.id))
        : continentComps.filter(c => c.id !== 'EUR_SUP' && c.id !== 'SAM_REC');
      if (mainComps.length > 0 && mainComps.every(c => c.status === 'finished')) break;

      let progression = false;

      // 1. Iniciar Pendentes
      const pending = continentComps.find(c => c.status === 'pending');
      if (pending) {
        let started = false;
        if (continent === 'EUR') {
          // Para EUR: verificar explicitamente se EUR_CL está pending e iniciar as duas juntas
          const clPending = continentComps.find(c => c.id === 'EUR_CL' && c.status === 'pending');
          const elPending = continentComps.find(c => c.id === 'EUR_EL' && c.status === 'pending');
          if (clPending || elPending) {
            this.startEuropePlayoffs();
            started = true;
          } else if (pending.id === 'EUR_SUP') {
            const cl = continentComps.find(c => c.id === 'EUR_CL');
            const el = continentComps.find(c => c.id === 'EUR_EL');
            if (cl?.status === 'finished' && el?.status === 'finished') {
              this.startSupercup();
              started = true;
            }
          }
          // EUR_YCL e demais IDs desconhecidos são ignorados
        } else if (pending.id === 'SAM_LIB' || ['AFR', 'ASI', 'NCA'].includes(continent)) {
          this.startInternationalCompetition(continent);
          started = true;
        } else if (pending.id === 'SAM_REC') {
          const lib = continentComps.find(c => c.id === 'SAM_LIB');
          const sul = continentComps.find(c => c.id === 'SAM_SUL');
          if (lib?.status === 'finished' && sul?.status === 'finished') {
            this.startRecopa();
            started = true;
          }
        }

        if (started) {
          progression = true;
        }
      }

      // 2. Transições
      const samLibGroups = comps.find(c => c.id === 'SAM_LIB' && c.status === 'playoffs_finished');
      if (samLibGroups) {
        this.startSouthAmericaGroupStages();
        progression = true;
      }
      const eurPlayoffsFinished = continentComps.filter(c => c.continent === 'EUR' && c.status === 'playoffs_finished');
      if (eurPlayoffsFinished.length >= 2) {
        this.startEuropeGroupStages();
        progression = true;
      }

      // 3. Simular partidas (Playoffs, Liga ou Mata-mata)
      let simulated = false;
      for (const comp of continentComps) {
        if (comp.status === 'playoffs' || comp.status === 'knockout') {
          if (comp.id === 'EUR_SUP' || comp.id === 'SAM_REC') continue;
          const phase = comp.status === 'playoffs' ? comp.playoffPhase : comp.knockoutPhase;
          const round = phase?.rounds.find(r => r.matches && r.matches.some(m => !m.played));
          if (round) {
            this.simulateInternationalCupRound(comp.id, round.name);
            simulated = true;
          }
        } else if (comp.status === 'league') {
          const needsSim = comp.leaguePhase.some(g => g.fixtures[comp.currentLeagueRound]?.some(m => !m.played));
          if (needsSim) {
            this.simulateInternationalLeagueRound(continent);
            simulated = true;
          }
        }
      }

      if (simulated) {
        progression = true;
      }

      // 4. Avançar rodadas de liga
      if (continentComps.some(c => c.status === 'league')) {
        const preAdvance = JSON.stringify(continentComps.filter(c => c.status === 'league').map(c => c.currentLeagueRound));
        this.advanceInternationalLeagueRound(continent);
        const postAdvance = JSON.stringify(this.universeService.internationalCompetitions().filter(c => c.continent === continent && c.status === 'league').map(c => c.currentLeagueRound));

        if (preAdvance !== postAdvance) {
          progression = true;
        }
      }

      if (progression) {
        safety = 0; // Se algo progrediu, resetamos o safety
      } else {
        safety++; // Se nada progrediu, incrementamos o safety
      }
      }
    } finally {
      this._isSimulatingMassive = false;
    }
  }

  public startRecopa(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const libComp = newComps.find((c: InternationalCompetition) => c.id === 'SAM_LIB');
      const sulComp = newComps.find((c: InternationalCompetition) => c.id === 'SAM_SUL');
      const recopaComp = newComps.find((c: InternationalCompetition) => c.id === 'SAM_REC');

      if (!libComp || !sulComp || !recopaComp || recopaComp.status !== 'pending') {
        return newComps;
      }

      const libChampion = this.cloneAndResetTeamStats(libComp.knockoutPhase.champion);
      const sulChampion = this.cloneAndResetTeamStats(sulComp.knockoutPhase.champion);

      if (!libChampion || !sulChampion) {
        console.error("Champions for Recopa not found.");
        return newComps;
      }

      recopaComp.teams = [libChampion, sulChampion];

      const finalRound: CupRound = {
        name: 'Final',
        matches: [this.createCupMatch('recopa-final', libChampion, sulChampion)]
      };

      recopaComp.knockoutPhase.rounds.push(finalRound);
      recopaComp.status = 'knockout';

      return newComps;
    });
  }

  public startSupercup(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const clComp = newComps.find((c: InternationalCompetition) => c.id === 'EUR_CL');
      const elComp = newComps.find((c: InternationalCompetition) => c.id === 'EUR_EL');
      const supercupComp = newComps.find((c: InternationalCompetition) => c.id === 'EUR_SUP');

      if (!clComp || !elComp || !supercupComp || supercupComp.status !== 'pending') {
        return newComps;
      }

      const clChampion = this.cloneAndResetTeamStats(clComp.knockoutPhase.champion);
      const elChampion = this.cloneAndResetTeamStats(elComp.knockoutPhase.champion);

      if (!clChampion || !elChampion) {
        console.error("Champions for Supercup not found.");
        return newComps;
      }

      supercupComp.teams = [clChampion, elChampion];

      const finalRound: CupRound = {
        name: 'Final',
        matches: [this.createCupMatch('supercup-final', clChampion, elChampion)]
      };

      supercupComp.knockoutPhase.rounds.push(finalRound);
      supercupComp.status = 'knockout';

      return newComps;
    });
  }

  public startWorldCup(): void {
    const intComps = this.universeService.internationalCompetitions();
    const requiredCompIds = ['EUR_CL', 'SAM_LIB', 'NCA_CL', 'ASI_CL'];

    const champions: Team[] = requiredCompIds.map(id => {
      const comp = intComps.find(c => c.id === id);
      if (comp && comp.status === 'finished' && comp.knockoutPhase.champion) {
        return this.cloneAndResetTeamStats(comp.knockoutPhase.champion);
      }
      return null;
    }).filter((t): t is Team => t !== null);

    if (champions.length !== requiredCompIds.length) {
      console.error("Not all continental champions are available to start the World Cup.", champions);
      return;
    }

    const eurChamp = champions.find(t => this.universeService.getContinentForLeague(t.countryId) === 'EUR')!;
    const samChamp = champions.find(t => this.universeService.getContinentForLeague(t.countryId) === 'SAM')!;
    const ncaChamp = champions.find(t => this.universeService.getContinentForLeague(t.countryId) === 'NCA')!;
    const asiChamp = champions.find(t => this.universeService.getContinentForLeague(t.countryId) === 'ASI')!;

    const semi1 = [eurChamp, asiChamp];
    const semi2 = [samChamp, ncaChamp];
    
    this.shuffle(semi1);
    this.shuffle(semi2);

    const semiRound: CupRound = {
      name: 'Semifinais',
      matches: [
        this.createCupMatch('world-semi-1', semi1[0], semi1[1]),
        this.createCupMatch('world-semi-2', semi2[0], semi2[1])
      ]
    };

    const worldCup: InternationalCompetition = {
      id: 'WORLD_CWC',
      name: 'Mundial de Clubes',
      continent: 'WORLD',
      status: 'knockout',
      season: this.universeService.season(),
      teams: [eurChamp, samChamp, ncaChamp, asiChamp],
      leaguePhase: [],
      knockoutPhase: {
        rounds: [semiRound, { name: 'Final', matches: [] }],
        topScorers: [],
        topAssists: [],
        topMotm: []
      },
      currentLeagueRound: 0,
      totalLeagueRounds: 0,
      topScorers: [],
      topAssists: [],
      topMotm: [],
      history: [],
      rankings: [],
    };

    this.universeService.internationalCompetitions.update(comps => {
      const index = comps.findIndex(c => c.id === 'WORLD_CWC');
      if (index > -1) {
        const updatedComps = [...comps];
        updatedComps[index] = { 
          ...updatedComps[index], 
          ...worldCup, 
          history: updatedComps[index].history, 
          rankings: updatedComps[index].rankings 
        };
        return updatedComps;
      }
      return [...comps, worldCup];
    });
  }

  public setupWorldCupQualifiers(): void {}

  public setupWorldCupFinals(): void {}

  public setupWorldCupU20Finals(): void {}

  public simulateQualifierMatch(competitionId: string, matchId: string): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const competition = newComps.find((c: InternationalCompetition) => c.id === competitionId);
      if (!competition || competition.status !== 'league') return newComps;

      for (const division of competition.leaguePhase) {
        const roundFixtures = division.fixtures[competition.currentLeagueRound];
        const match = roundFixtures?.find((m: Match) => m.id === matchId);

        if (match) {
          this.simulationService.simulateMatchForInternational(match, division, competition.id);
          this.updateInternationalPlayerRankings(competition);
          return newComps;
        }
      }
      return newComps;
    });
  }

  public simulateQualifierRound(competitionId: string): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const competition = newComps.find((c: InternationalCompetition) => c.id === competitionId);
      if (!competition || competition.status !== 'league' || competition.currentLeagueRound >= competition.totalLeagueRounds) return newComps;

      for (const division of competition.leaguePhase) {
        const roundFixtures = division.fixtures[competition.currentLeagueRound];
        if (roundFixtures) {
          roundFixtures.forEach((match: Match) => {
            if (!match.played) {
              this.simulationService.simulateMatchForInternational(match, division, competition.id);
            }
          });
        }
      }
      this.recalculateLeagueStandings(competition);
      this.updateInternationalPlayerRankings(competition);
      return newComps;
    });
  }

  public advanceQualifierRound(competitionId: string): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const competition = newComps.find((c: InternationalCompetition) => c.id === competitionId);
      if (!competition || competition.status !== 'league') return newComps;

      competition.currentLeagueRound++;
      if (competition.currentLeagueRound >= competition.totalLeagueRounds) {
        competition.status = 'finished';
      }
      return newComps;
    });
  }

  private recalculateLeagueStandings(competition: InternationalCompetition): void {
    if (!competition.leaguePhase) return;

    for (const division of competition.leaguePhase) {
      // Reset stats for all teams in the group/league
      division.teams.forEach(t => {
        t.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      });

      // Re-process all played matches
      const allMatches = division.fixtures.flat();
      allMatches.forEach(match => {
        if (!match.played || match.homeScore === undefined || match.awayScore === undefined) return;

        const home = division.teams.find(t => t.id === match.homeTeam.id);
        const away = division.teams.find(t => t.id === match.awayTeam.id);

        if (home && away) {
          home.stats.matchesPlayed++;
          away.stats.matchesPlayed++;
          home.stats.goalsFor += match.homeScore;
          away.stats.goalsFor += match.awayScore;
          home.stats.goalsAgainst += match.awayScore;
          away.stats.goalsAgainst += match.homeScore;

          if (match.homeScore > match.awayScore) {
            home.stats.wins++;
            away.stats.losses++;
            home.stats.points += 3;
          } else if (match.awayScore > match.homeScore) {
            away.stats.wins++;
            home.stats.losses++;
            away.stats.points += 3;
          } else {
            home.stats.draws++;
            away.stats.draws++;
            home.stats.points += 1;
            away.stats.points += 1;
          }
        }
      });
    }
  }

  public simulateAllQualifiers(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const qualifierComps = newComps.filter((c: InternationalCompetition) => c.id.startsWith('WC_Q_') && c.status === 'league');

      qualifierComps.forEach((comp: InternationalCompetition) => {
        while (comp.currentLeagueRound < comp.totalLeagueRounds) {
          for (const division of comp.leaguePhase) {
            const roundFixtures = division.fixtures[comp.currentLeagueRound];
            if (roundFixtures) {
              roundFixtures.forEach((match: Match) => {
                if (!match.played) {
                  this.simulationService.simulateMatchForInternational(match, division, comp.id);
                }
              });
            }
          }
          this.recalculateLeagueStandings(comp);
          this.updateInternationalPlayerRankings(comp);
          comp.currentLeagueRound++;
        }
        comp.status = 'finished';
      });

      return newComps;
    });
  }

  private startAfricaCompetition(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const afrComp = newComps.find((c: InternationalCompetition) => c.id === 'AFR_CL');
      if (!afrComp || afrComp.status !== 'pending') return newComps;

      // 1. Criar o Ranking de Ligas Africanas
      const africanLeagues = this.universeService.leagues().filter(l =>
        (this.universeService as any)['AFRICAN_LEAGUE_IDS'].includes(l.countryId)
      );

      const paisesVagaDireta = [ // 16 países: 1 vaga direta (campeão) + 2 nos playoffs (vice, 3º)
        'EGY', 'MAR', 'ALG', 'TUN', 'AFS', 'RDC', 'NIG', 'CAM', 'SEN', 'CIV', 'GAN', 'GUI', 'ANG', 'ZAM', 'CON', 'MAL'
      ];

      const paises3VagasPlayoff = [ // 20 países: 3 vagas nos playoffs (campeão, vice, 3º)
        'BFA', 'UGA', 'TAZ', 'MOZ', 'LBY', 'SUD', 'GAB', 'GEQ', 'ZIM', 'KEN', 'ETH', 'RWA', 'TOG', 'BEN', 'SLE', 'BSW', 'MWI', 'NAM', 'BDI', 'GNB'
      ];

      const paises2VagasPlayoff = [ // 18 países: 2 vagas nos playoffs (campeão, vice)
        'SWZ', 'LES', 'GAM', 'MRT', 'SSD', 'CHA', 'COM', 'MAD', 'CDV', 'NGR', 'ERI', 'CTA', 'LBR', 'MRI', 'STP', 'DJI', 'SOM', 'SEY'
      ];

      // 2. DISTRIBUIR VAGAS USANDO AS LISTAS FIXAS
      const byesToLeaguePhase: Team[] = [];
      const playoffTeams: Team[] = [];
      const allLeagues = this.universeService.leagues();

      // Processar países com vaga direta
      paisesVagaDireta.forEach(countryId => {
        const league = allLeagues.find(l => l.countryId === countryId);
        if (!league) return;
        const standings = [...league.divisions[0].teams].sort(this.universeService.sortTeams);
        if (standings[0]) byesToLeaguePhase.push(JSON.parse(JSON.stringify(standings[0])));
        if (standings[1]) playoffTeams.push(JSON.parse(JSON.stringify(standings[1])));
        if (standings[2]) playoffTeams.push(JSON.parse(JSON.stringify(standings[2])));
      });

      // Processar países com 3 vagas nos playoffs
      paises3VagasPlayoff.forEach(countryId => {
        const league = allLeagues.find(l => l.countryId === countryId);
        if (!league) return;
        const standings = [...league.divisions[0].teams].sort(this.universeService.sortTeams);
        if (standings[0]) playoffTeams.push(JSON.parse(JSON.stringify(standings[0])));
        if (standings[1]) playoffTeams.push(JSON.parse(JSON.stringify(standings[1])));
        if (standings[2]) playoffTeams.push(JSON.parse(JSON.stringify(standings[2])));
      });

      // Processar países com 2 vagas nos playoffs
      paises2VagasPlayoff.forEach(countryId => {
        const league = allLeagues.find(l => l.countryId === countryId);
        if (!league) return;
        const standings = [...league.divisions[0].teams].sort(this.universeService.sortTeams);
        if (standings[0]) playoffTeams.push(JSON.parse(JSON.stringify(standings[0])));
        if (standings[1]) playoffTeams.push(JSON.parse(JSON.stringify(standings[1])));
      });

      console.log('Times com vaga direta:', byesToLeaguePhase.length); // Deve ser 16
      console.log('Times nos playoffs:', playoffTeams.length); // Deve ser 128

      // 3. Montar a primeira fase dos playoffs
      this.shuffle(playoffTeams);

      const playoffRound1: CupRound = { name: '1ª Fase PRÉ', matches: [] };
      for (let i = 0; i < playoffTeams.length / 2; i++) { // 128 times -> 64 jogos
        playoffRound1.matches.push(
          this.createCupMatch(`afr-pre-r1-${i}`, playoffTeams[i * 2], playoffTeams[i * 2 + 1])
        );
      }

      // 4. Configurar a competição
      afrComp.teams = [...byesToLeaguePhase, ...playoffTeams]; // Lista mestre de todos os participantes
      afrComp.playoffPhase.rounds[0] = playoffRound1;
      afrComp.status = 'playoffs';

      return newComps;
    });
  }

  private startAsiaCompetition(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const asiaComp = newComps.find((c: InternationalCompetition) => c.id === 'ASI_CL');
      
      if (!asiaComp || asiaComp.status !== 'pending') {
        console.warn("[startAsiaCompetition] Competição não encontrada ou já iniciada.");
        return newComps;
      }

      const allLeagues = this.universeService.leagues();

      const getTopTeams = (countryId: string, count: number): Team[] => {
        const league = allLeagues.find(l => l.countryId === countryId);
        if (!league) return [];
        const sortedTeams = [...league.divisions[0].teams].sort(this.universeService.sortTeams);
        return JSON.parse(JSON.stringify(sortedTeams.slice(0, count)));
      };

      // Configuração de classificados: 4 times dos 4 principais países (16 times)
      // Adicionados países secundários como fallback para garantir 16 times
      const mainCountries = [
        { id: 'JPN', count: 4 }, { id: 'SAU', count: 4 }, { id: 'KOR', count: 4 }, { id: 'AUS', count: 4 }
      ];
      const fallbackCountries = ['CHN', 'IRN', 'UAE', 'QAT', 'THA', 'VIE', 'IND', 'MAS', 'IDN'];

      let allQualifiedTeams: Team[] = [];
      
      // 1. Tenta pegar dos países principais
      mainCountries.forEach(cfg => {
        allQualifiedTeams.push(...getTopTeams(cfg.id, cfg.count));
      });

      // 2. Se faltar times para 16, busca nos secundários
      if (allQualifiedTeams.length < 16) {
        for (const countryId of fallbackCountries) {
          if (allQualifiedTeams.length >= 16) break;
          allQualifiedTeams.push(...getTopTeams(countryId, 1));
        }
      }

      // 3. Se ainda faltar, pega de qualquer lugar da Ásia
      if (allQualifiedTeams.length < 16) {
        const remainingNeeded = 16 - allQualifiedTeams.length;
        const otherAsianTeams = this.universeService.teams()
          .filter(t => this.universeService.getContinentForLeague(t.countryId) === 'ASI' && 
                       !allQualifiedTeams.some(qt => qt.id === t.id))
          .slice(0, remainingNeeded);
        allQualifiedTeams.push(...JSON.parse(JSON.stringify(otherAsianTeams)));
      }

      if (allQualifiedTeams.length === 0) {
        console.error("[startAsiaCompetition] Falha crítica: Nenhum time encontrado para a Ásia!");
        return newComps;
      }

      // Garante número par para o sorteio (se for suíço, o ideal é par)
      if (allQualifiedTeams.length % 2 !== 0) {
        allQualifiedTeams.pop();
      }

      this.shuffle(allQualifiedTeams);

      // Reset stats for all qualified teams
      allQualifiedTeams.forEach(team => {
        if (team) {
          team.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        }
      });

      asiaComp.teams = allQualifiedTeams;
      
      // Inicializa a fase de liga
      asiaComp.leaguePhase = [
        { id: 1, name: 'Fase de Liga', teams: allQualifiedTeams, fixtures: [], topScorers: [], topAssists: [], topMotm: [] }
      ];

      // Gera 7 rodadas no formato suíço (ou similar simplificado)
      asiaComp.leaguePhase[0].fixtures = this.generateSwissFixtures(allQualifiedTeams, 'Fase de Liga');
      asiaComp.currentLeagueRound = 0;
      asiaComp.totalLeagueRounds = 7;
      asiaComp.status = 'league';

      console.log(`✅ Ásia Champions League iniciada com ${allQualifiedTeams.length} times e 7 rodadas.`);
      return newComps;
    });
  }

  public startNorthAmericaCompetition(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const ncaComp = newComps.find((c: InternationalCompetition) => c.id === 'NCA_CL');
      if (!ncaComp || ncaComp.status !== 'pending') {
        return newComps;
      }

      // 1. Limpar e preparar a competição
      ncaComp.teams = [];
      ncaComp.leaguePhase[0].teams = [];
      ncaComp.status = 'league';
      ncaComp.currentLeagueRound = 0;
      ncaComp.totalLeagueRounds = 7;

      const qualifiedTeams: Team[] = [];

      // 2. Coletar times do MÉXICO (Top 8 da liga)
      const mexTeams = this.getTeamsByStanding('MEX', 0, 8);
      qualifiedTeams.push(...mexTeams);

      // 3. Coletar times dos ESTADOS UNIDOS (8 times das Quartas de Final dos PLAYOFFS da liga)
      const usaLeague = this.universeService.leagues().find(l => l.countryId === 'USA');
      let usaQualified: Team[] = [];

      if (usaLeague && usaLeague.leagueCup) {
        // Buscamos os times que chegaram nas Quartas de Final dos Playoffs (MLS Cup / League Cup)
        const qfRound = usaLeague.leagueCup.rounds.find(r => r.name === 'Quartas de Final');
        if (qfRound && qfRound.matches.length > 0) {
          qfRound.matches.forEach(m => {
            if (m.homeTeam) usaQualified.push(m.homeTeam);
            if (m.awayTeam) usaQualified.push(m.awayTeam);
          });
        }
      }

      // Fallback para USA se os Playoffs não tiverem chegado nas Quartas ou falhar
      if (usaQualified.length < 8) {
        console.warn(`⚠️ Não foi possível encontrar 8 times nas Quartas dos Playoffs da MLS. Usando classificação da liga.`);
        const fallbackUsa = this.getTeamsByStanding('USA', 0, 8);
        usaQualified = [...usaQualified, ...fallbackUsa.filter(t => !usaQualified.some(q => q.id === t.id))].slice(0, 8);
      }

      qualifiedTeams.push(...usaQualified);

      // 4. Fallback final para garantir 16 times (se algum país falhar)
      if (qualifiedTeams.length < 16) {
        const allNcaTeams = this.universeService.teams()
          .filter(t => (t.countryId === 'MEX' || t.countryId === 'USA') && !qualifiedTeams.some(q => q.id === t.id))
          .sort((a, b) => b.overall - a.overall);
        
        qualifiedTeams.push(...allNcaTeams.slice(0, 16 - qualifiedTeams.length));
      }

      // 5. Inicializar fase de liga
      ncaComp.teams = qualifiedTeams;
      ncaComp.leaguePhase[0].teams = qualifiedTeams;
      
      // Gerar 7 rodadas de liga suíça
      ncaComp.leaguePhase[0].fixtures = this.generateSwissFixtures(qualifiedTeams, 'Fase de Liga');

      console.log(`🌎 America Champions League iniciada com ${qualifiedTeams.length} times!`);
      return newComps;
    });
  }


  private startSouthAmericaPlayoffs(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const libComp = newComps.find((c: InternationalCompetition) => c.id === 'SAM_LIB');
      if (!libComp || libComp.status !== 'pending') return newComps;

      const playoffQualifiers: { [countryId: string]: { start: number, count: number } } = {
        'URU': { start: 2, count: 2 }, // Posições 3-4
        'COL': { start: 2, count: 2 }, // Posições 3-4
        'CHL': { start: 2, count: 2 }, // Posições 3-4
        'PER': { start: 2, count: 2 }, // Posições 3-4
        'BOL': { start: 2, count: 2 }, // Posições 3-4
        'PAR': { start: 2, count: 2 }, // Posições 3-4
        'EQU': { start: 2, count: 2 }, // Posições 3-4
        'VEN': { start: 1, count: 2 }, // Posições 2-3
      };

      const playoffTeams: Team[] = [];
      for (const countryId in playoffQualifiers) {
        const { start, count } = playoffQualifiers[countryId];
        playoffTeams.push(...this.getTeamsByStanding(countryId, start, count));
      }

      for (let i = playoffTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playoffTeams[i], playoffTeams[j]] = [playoffTeams[j], playoffTeams[i]];
      }

      libComp.teams = playoffTeams;

      const playoffRound: CupRound = { name: 'Playoffs', matches: [] };
      for (let i = 0; i < 8; i++) {
        playoffRound.matches.push({
          id: `cup-sam-playoff-${i}-${Date.now()}`,
          homeTeam: playoffTeams[i * 2],
          awayTeam: playoffTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }
      libComp.playoffPhase = { rounds: [playoffRound], topScorers: [], topAssists: [], topMotm: [] };
      libComp.status = 'playoffs';

      return newComps;
    });
  }

  public startSouthAmericaGroupStages(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      let libComp = newComps.find((c: InternationalCompetition) => c.id === 'SAM_LIB');
      let sulComp = newComps.find((c: InternationalCompetition) => c.id === 'SAM_SUL');

      // Criar comps se não existirem (compatibilidade com saves antigos)
      if (!libComp) {
        libComp = {
          id: 'SAM_LIB', name: 'Libertadores', continent: 'SAM', status: 'pending',
          season: this.universeService.season(), teams: [],
          leaguePhase: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Grupo ${String.fromCharCode(65 + i)}`, teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] })),
          playoffPhase: { rounds: [], topScorers: [], topAssists: [], topMotm: [] },
          knockoutPhase: { rounds: [], topScorers: [], topAssists: [], topMotm: [] },
          currentLeagueRound: 0, totalLeagueRounds: 6,
          topScorers: [], topAssists: [], topMotm: [], history: [], rankings: [],
        };
        newComps.push(libComp);
      }
      if (!sulComp) {
        sulComp = {
          id: 'SAM_SUL', name: 'Sulamericana', continent: 'SAM', status: 'pending',
          season: this.universeService.season(), teams: [],
          leaguePhase: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Grupo ${String.fromCharCode(65 + i)}`, teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] })),
          playoffPhase: { rounds: [], topScorers: [], topAssists: [], topMotm: [] },
          knockoutPhase: { rounds: [], topScorers: [], topAssists: [], topMotm: [] },
          currentLeagueRound: 0, totalLeagueRounds: 6,
          topScorers: [], topAssists: [], topMotm: [], history: [], rankings: [],
        };
        newComps.push(sulComp);
      }

      // Re-buscar após possível criação
      const lib: any = newComps.find((c: InternationalCompetition) => c.id === 'SAM_LIB');
      const sul: any = newComps.find((c: InternationalCompetition) => c.id === 'SAM_SUL');
      if (!lib || !sul) return newComps;

      // =================================================================================
      // NOVA DISTRIBUIÇÃO DE VAGAS (32 diretos em cada)
      // BRA: 6 lib, 6 sula
      // ARG: 5 lib, 5 sula
      // COL: 4 lib, 2 sula
      // CHL: 4 lib, 2 sula
      // URU: 3 lib, 2 sula
      // Demais (BOL, PAR, EQU, PER, VEN): 2 lib, 3 sula
      // =================================================================================
      const libTeams: Team[] = [
        ...this.getTeamsByStanding('BRA', 0, 6),
        ...this.getTeamsByStanding('ARG', 0, 5),
        ...this.getTeamsByStanding('COL', 0, 4),
        ...this.getTeamsByStanding('CHL', 0, 4),
        ...this.getTeamsByStanding('URU', 0, 3),
        ...this.getTeamsByStanding('BOL', 0, 2),
        ...this.getTeamsByStanding('PAR', 0, 2),
        ...this.getTeamsByStanding('EQU', 0, 2),
        ...this.getTeamsByStanding('PER', 0, 2),
        ...this.getTeamsByStanding('VEN', 0, 2),
      ];

      const sulTeams: Team[] = [
        ...this.getTeamsByStanding('BRA', 6, 6),
        ...this.getTeamsByStanding('ARG', 5, 5),
        ...this.getTeamsByStanding('COL', 4, 2),
        ...this.getTeamsByStanding('CHL', 4, 2),
        ...this.getTeamsByStanding('URU', 3, 2),
        ...this.getTeamsByStanding('BOL', 2, 3),
        ...this.getTeamsByStanding('PAR', 2, 3),
        ...this.getTeamsByStanding('EQU', 2, 3),
        ...this.getTeamsByStanding('PER', 2, 3),
        ...this.getTeamsByStanding('VEN', 2, 3),
      ];

      const finalLibTeams = libTeams.slice(0, 32);
      const finalSulTeams = sulTeams.slice(0, 32);

      console.log(`[SAM] Lib: ${finalLibTeams.length} teams, Sul: ${finalSulTeams.length} teams`);

      [...finalLibTeams, ...finalSulTeams].forEach(team => {
        if (team) team.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      });

      const drawGroups = (teams: Team[]): Team[][] => {
        const sortedTeams = [...teams].sort((a, b) => b.overall - a.overall);
        const pots = [
          sortedTeams.slice(0, 8),
          sortedTeams.slice(8, 16),
          sortedTeams.slice(16, 24),
          sortedTeams.slice(24, 32)
        ];

        const groups: Team[][] = Array.from({ length: 8 }, () => []);

        this.shuffle(pots[0]);
        pots[0].forEach((team, i) => groups[i].push(team));

        [pots[1], pots[2], pots[3]].forEach(pot => {
          const teamsToPlace = [...pot];
          this.shuffle(teamsToPlace);
          groups.forEach(group => {
            let placed = false;
            for (let i = 0; i < teamsToPlace.length; i++) {
              const team = teamsToPlace[i];
              const hasCountryman = group.some(existingTeam => existingTeam.countryId === team.countryId);
              if (!hasCountryman) {
                group.push(team);
                teamsToPlace.splice(i, 1);
                placed = true;
                break;
              }
            }
            if (!placed && teamsToPlace.length > 0) {
              group.push(teamsToPlace.shift()!);
            }
          });
        });
        return groups;
      };

      // Reset e configurar leaguePhase
      lib.leaguePhase = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Grupo ${String.fromCharCode(65 + i)}`, teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }));
      sul.leaguePhase = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Grupo ${String.fromCharCode(65 + i)}`, teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }));
      lib.currentLeagueRound = 0;
      sul.currentLeagueRound = 0;

      const libGroups = drawGroups(finalLibTeams);
      lib.teams = finalLibTeams;
      libGroups.forEach((groupTeams, i) => {
        lib.leaguePhase[i].teams = groupTeams;
        lib.leaguePhase[i].fixtures = this.universeService.generateFixtures(groupTeams, lib.leaguePhase[i].name);
      });
      lib.status = 'league';

      const sulGroups = drawGroups(finalSulTeams);
      sul.teams = finalSulTeams;
      sulGroups.forEach((groupTeams, i) => {
        sul.leaguePhase[i].teams = groupTeams;
        sul.leaguePhase[i].fixtures = this.universeService.generateFixtures(groupTeams, sul.leaguePhase[i].name);
      });
      sul.status = 'league';

      return newComps;
    });
  }

  public simulateInternationalLeagueRound(continent: 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR' | 'WORLD'): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const competitionsToSimulate = newComps.filter((c: InternationalCompetition) => c.continent === continent && c.status === 'league');

      for (const competition of competitionsToSimulate) {
        if (competition.currentLeagueRound >= competition.totalLeagueRounds) continue;

        for (const division of competition.leaguePhase) {
          const roundFixtures = division.fixtures[competition.currentLeagueRound];
          if (roundFixtures) {
            roundFixtures.forEach((match: Match) => {
              if (!match.played) {
                this.simulationService.simulateMatchForInternational(match, division, competition.id);
              }
            });
          }
        }
        this.recalculateLeagueStandings(competition);
        this.updateInternationalPlayerRankings(competition);
      }

      return newComps;
    });
  }

  public simulateInternationalLeagueMatch(continent: 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR', matchId: string): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));

      for (const competition of newComps) {
        if (competition.continent !== continent || competition.status !== 'league') continue;

        for (const division of competition.leaguePhase) {
          const roundFixtures = division.fixtures[competition.currentLeagueRound];
          const match = roundFixtures?.find((m: Match) => m.id === matchId);

          if (match) {
            this.simulationService.simulateMatchForInternational(match, division, competition.id);
            this.recalculateLeagueStandings(competition);
            this.updateInternationalPlayerRankings(competition);
            // Exit the update callback once the match is found and simulated
            return newComps;
          }
        }
      }
      // If match wasn't found, just return original state
      return newComps;
    });
  }

  public advanceInternationalLeagueRound(continent: 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR' | 'WORLD'): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const activeLeagueComps = newComps.filter((c: InternationalCompetition) =>
        c.continent === continent && c.status === 'league'
      );

      if (activeLeagueComps.length === 0) return newComps;

      // Check if ALL of them are ready to advance
      const allReadyToAdvance = activeLeagueComps.every((comp: InternationalCompetition) =>
        comp.leaguePhase.every((group: Division) =>
          group.fixtures[comp.currentLeagueRound]?.every((m: Match) => m.played) ?? false
        )
      );

      if (!allReadyToAdvance) {
        return newComps; // Not all competitions are ready, so do nothing.
      }

      // If all are ready, advance all of them
      activeLeagueComps.forEach((competition: InternationalCompetition) => {
        competition.currentLeagueRound++;

        if (competition.currentLeagueRound >= competition.totalLeagueRounds) {
          competition.status = 'knockout';
          this.setupInternationalKnockout(competition);
        }
      });

      return newComps;
    });
  }

  private propagateTeamUpdate(updatedTeam: Team | null) {
    if (!updatedTeam) return;

    this.universeService.leagues.update(currentLeagues => {
      const newLeagues = JSON.parse(JSON.stringify(currentLeagues));
      let teamFoundAndUpdated = false;
      for (const league of newLeagues) {
        for (const division of league.divisions) {
          const teamToUpdate = division.teams.find((t: Team) => t.id === updatedTeam.id);
          if (teamToUpdate) {
            teamToUpdate.trophies = updatedTeam.trophies;
            teamToUpdate.budget = updatedTeam.budget;
            teamFoundAndUpdated = true;
            break;
          }
        }
        if (teamFoundAndUpdated) break;
      }
      return newLeagues;
    });

    this.universeService.teams.update(currentTeams =>
      currentTeams.map(team => {
        if (team.id === updatedTeam.id) {
          return {
            ...team,
            trophies: updatedTeam.trophies,
            budget: updatedTeam.budget,
          };
        }
        return team;
      })
    );
  }

  public captureInternationalHistory(competition: InternationalCompetition): void {
    if (competition.history.some(h => h.season === this.universeService.season())) {
      return;
    }

    let allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);

    // Se for Youth Champions League, limpar o sufixo " Youth" dos nomes de todos os times para o histórico
    if (competition.id === 'EUR_YCL') {
      allTeamsInComp = allTeamsInComp.map(t => {
        if (t.teamName.endsWith(' Youth')) {
          return { ...t, teamName: t.teamName.replace(' Youth', '') };
        }
        return t;
      });
    }

    const statType = competition.id === 'EUR_YCL' ? 'youthStats' :
      (competition.id === 'WORLD_CWC' || competition.id.startsWith('WC_') || competition.id === 'AFR_NC' || competition.id === 'EUR_NC') ? 'worldCupStats' : 'internationalStats';

    const findTeamForPlayer = (playerId: string, teams: Team[]): Team | undefined => {
      for (const team of teams) {
        if (team.players.some(p => p.id === playerId)) {
          return team;
        }
      }
      const allTeamsEver = this.universeService.teams();
      for (const team of allTeamsEver) {
        if (team.players.some(p => p.id === playerId)) {
          return team;
        }
      }
      return undefined;
    };

    const createPlayerRecord = (player: Player | undefined, teams: Team[], value?: number) => {
      if (!player) return { player: null, teamName: null, value: 0 };
      const team = findTeamForPlayer(player.id, teams);
      // OTIMIZAÇÃO: Apenas dados essenciais para o histórico
      const simplifiedPlayer = {
        id: player.id,
        name: player.name,
        overall: player.overall,
        isGoalkeeper: player.isGoalkeeper,
        nationalityId: player.nationalityId
      } as Player;
      return { player: simplifiedPlayer, teamName: team?.teamName || null, value: value || 0 };
    };

    // 1. Team of the Season
    const teamOfTheSeason: { player: Player, teamName: string }[] = [];
    const allPlayersWithTeams = allTeamsInComp.flatMap(team => team.players.map(player => ({ player, teamName: team.teamName })));

    const goalkeepers = allPlayersWithTeams.filter(p => p.player.isGoalkeeper);
    if (goalkeepers.length > 0) {
      goalkeepers.sort((a, b) => (b.player[statType]?.motm || 0) - (a.player[statType]?.motm || 0) || b.player.overall - a.player.overall);
      teamOfTheSeason.push(createPlayerRecord(goalkeepers[0].player, allTeamsInComp, goalkeepers[0].player[statType]?.motm));
    }

    const outfielders = allPlayersWithTeams.filter(p => !p.player.isGoalkeeper);
    const performanceScore = (p: Player) => (p[statType]?.goals || 0) * 3 + (p[statType]?.assists || 0) * 2 + (p[statType]?.motm || 0) * 5;
    outfielders.sort((a, b) => performanceScore(b.player) - performanceScore(a.player) || b.player.overall - a.player.overall);

    const selectedIds = new Set<string>(teamOfTheSeason.map(pr => pr.player!.id));
    for (const p of outfielders) {
      if (teamOfTheSeason.length >= 5) break;
      if (!selectedIds.has(p.player.id)) {
        teamOfTheSeason.push(createPlayerRecord(p.player, allTeamsInComp, performanceScore(p.player)));
        selectedIds.add(p.player.id);
      }
    }

    // 2. Golden Glove
    let goldenGloveWinner = { player: null, teamName: null };
    let allCompetitionMatches = this.universeService.matchHistory().filter(m => m.season === this.universeService.season() && m.competitionName.includes(competition.name));

    // Se for Youth Champions League, limpar o sufixo " Youth" dos nomes das partidas para o histórico
    if (competition.id === 'EUR_YCL') {
      allCompetitionMatches = allCompetitionMatches.map(m => ({
        ...m,
        homeTeamName: m.homeTeamName.replace(' Youth', ''),
        awayTeamName: m.awayTeamName.replace(' Youth', '')
      }));
    }

    const gkCleanSheets = new Map<string, { player: Player, teamName: string, cleanSheets: number, goalsConceded: number }>();
    allTeamsInComp.forEach(team => {
      const goalkeeper = team.players.find(p => p.isGoalkeeper);
      if (goalkeeper) {
        gkCleanSheets.set(goalkeeper.id, { player: goalkeeper, teamName: team.teamName, cleanSheets: 0, goalsConceded: 0 });
      }
    });

    allCompetitionMatches.forEach(match => {
      const homeTeam = allTeamsInComp.find(t => t.id === match.homeTeamId);
      const awayTeam = allTeamsInComp.find(t => t.id === match.awayTeamId);

      if (homeTeam) {
        const gk = homeTeam.players.find(p => p.isGoalkeeper);
        if (gk) {
          const record = gkCleanSheets.get(gk.id);
          if (record) {
            record.goalsConceded += match.awayScore;
            if (match.awayScore === 0) record.cleanSheets++;
          }
        }
      }
      if (awayTeam) {
        const gk = awayTeam.players.find(p => p.isGoalkeeper);
        if (gk) {
          const record = gkCleanSheets.get(gk.id);
          if (record) {
            record.goalsConceded += match.homeScore;
            if (match.homeScore === 0) record.cleanSheets++;
          }
        }
      }
    });

    if (gkCleanSheets.size > 0) {
      const sortedGks = [...gkCleanSheets.values()].sort((a, b) => b.cleanSheets - a.cleanSheets || a.goalsConceded - b.goalsConceded);
      if (sortedGks[0] && sortedGks[0].cleanSheets > 0) {
        goldenGloveWinner = createPlayerRecord(sortedGks[0].player, allTeamsInComp, sortedGks[0].cleanSheets);
      }
    }

    // 3. Revelation
    let revelationWinner = { player: null, teamName: null };
    const u21players = allPlayersWithTeams.filter(p => p.player.age <= 21);
    if (u21players.length > 0) {
      u21players.sort((a, b) => performanceScore(b.player) - performanceScore(a.player));
      if (performanceScore(u21players[0].player) > 0) {
        revelationWinner = createPlayerRecord(u21players[0].player, allTeamsInComp, performanceScore(u21players[0].player));
      }
    }

    // 4. Edition Highlights
    let bestAttack = { teamName: '', goals: 0 };
    let bestDefense = { teamName: '', goals: Infinity };
    let biggestWin = { diff: 0, text: 'N/A' };
    let highestScoringMatch = { total: 0, text: 'N/A' };

    allTeamsInComp.forEach(team => {
      if (team.stats.goalsFor >= bestAttack.goals) {
        bestAttack = { teamName: team.teamName, goals: team.stats.goalsFor };
      }
      if (team.stats.goalsAgainst <= bestDefense.goals) {
        bestDefense = { teamName: team.teamName, goals: team.stats.goalsAgainst };
      }
    });

    allCompetitionMatches.forEach(match => {
      const goalDiff = Math.abs(match.homeScore - match.awayScore);
      if (goalDiff >= biggestWin.diff) {
        const winnerName = match.homeScore > match.awayScore ? match.homeTeamName : match.awayTeamName;
        const loserName = match.homeScore < match.awayScore ? match.homeTeamName : match.awayTeamName;
        const winnerScore = Math.max(match.homeScore, match.awayScore);
        const loserScore = Math.min(match.homeScore, match.awayScore);
        biggestWin = { diff: goalDiff, text: `${winnerName} ${winnerScore} x ${loserScore} ${loserName}` };
      }
      const totalGoals = match.homeScore + match.awayScore;
      if (totalGoals >= highestScoringMatch.total) {
        highestScoringMatch = { total: totalGoals, text: `${match.homeTeamName} ${match.homeScore} x ${match.awayScore} ${match.awayTeamName}` };
      }
    });

    const champion = competition.knockoutPhase?.champion || null;
    const runnerUp = competition.knockoutPhase?.runnerUp || null;

    const seasonRecord: InternationalSeasonRecord = {
      season: this.universeService.season(),
      name: competition.name,
      champion: champion,
      runnerUp: runnerUp,
      topScorer: createPlayerRecord(competition.topScorers[0], allTeamsInComp, competition.topScorers[0]?.[statType]?.goals),
      topAssister: createPlayerRecord(competition.topAssists[0], allTeamsInComp, competition.topAssists[0]?.[statType]?.assists),
      topMotm: createPlayerRecord(competition.topMotm[0], allTeamsInComp, competition.topMotm[0]?.[statType]?.motm),
      teamOfTheSeason: teamOfTheSeason,
      goldenGlove: goldenGloveWinner,
      revelation: revelationWinner,
      bestAttack: bestAttack,
      bestDefense: bestDefense,
      biggestWin: biggestWin.text,
      highestScoringMatch: highestScoringMatch.text,
    };

    competition.history.unshift(seasonRecord);
    if (competition.id === 'EUR_YCL') {
      this.universeService.addYouthChampionsLeagueRecord(seasonRecord);
    }
    if (champion) {
      this.competitionService.updateChampionshipRankings(competition.rankings, champion);
    }
  }

  public simulateInternationalCupMatch(competitionId: string, matchId: string, roundName: string, leg: 1 | 2) {
    let crownedChampionId: string | null = null;
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const competition = newComps.find((c: InternationalCompetition) => c.id === competitionId);
      if (!competition || (competition.status !== 'knockout' && competition.status !== 'playoffs' && competition.status !== 'pending')) return newComps;

      const isPlayoffs = competition.status === 'playoffs';
      const phase = isPlayoffs ? competition.playoffPhase! : competition.knockoutPhase;

      const round = phase.rounds.find(r => r.name === roundName);
      const match = round?.matches.find(m => m.id === matchId);

      if (match) {
        const allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);

        const onFinalCallback = () => {
          if (competitionId === 'WORLD_CWC' || competitionId === 'WC_FINALS' || competitionId === 'WC_U20_FINALS') {
            this.seasonService.calculateBestPlayerInTheWorld();
          }
        };

        // FIX: Replaced `competitionService.addTrophyToTeam` with local `addTrophyToTeam` to handle YCL trophy mapping.
        this.simulationService.simulateSingleCupLeg(match, roundName, leg, competition, allTeamsInComp, this.addTrophyToTeam.bind(this), this.captureInternationalHistory.bind(this), onFinalCallback);

        if (roundName === 'Final' && competition.knockoutPhase?.champion) {
          crownedChampionId = competition.knockoutPhase.champion.id;
        }

        if (isPlayoffs) {
          if (competition.continent === 'NCA') this.advanceNorthAmericaPlayoffs(competition);
          else if (competition.continent === 'SAM') this.advanceSouthAmericaPlayoffs(competition);
          else if (competition.continent === 'EUR') this.advanceEuropePlayoffs(competition);
        } else {
          this.advanceInternationalCupRound(competition);
        }

        this.updateInternationalPlayerRankings(competition);
      }

      return newComps;
    });

    if (crownedChampionId) {
      const comps = this.universeService.internationalCompetitions();
      const finalComp = comps.find(c => c.id === competitionId);
      const finalChampion = finalComp?.knockoutPhase?.champion;
      if (finalChampion && finalChampion.id === crownedChampionId) {
        this.propagateTeamUpdate(finalChampion);
      }
    }
  }

  public setInternationalLeagueMatchResult(continent: 'AFR' | 'ASI' | 'NCA' | 'SAM' | 'EUR' | 'WORLD', matchId: string, homeScore: number, awayScore: number): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      for (const competition of newComps) {
        if (competition.continent !== continent || competition.status !== 'league') continue;
        for (const division of competition.leaguePhase) {
          const roundFixtures = division.fixtures[competition.currentLeagueRound];
          const match = roundFixtures?.find((m: Match) => m.id === matchId);
          if (match) {
            this.simulationService.applyManualResultForInternational(match, division, competition.id, homeScore, awayScore);
            this.recalculateLeagueStandings(competition);
            this.updateInternationalPlayerRankings(competition);
            return newComps;
          }
        }
      }
      return newComps;
    });
  }

  public setInternationalCupMatchResult(competitionId: string, matchId: string, roundName: string, leg: 1 | 2, homeScore: number, awayScore: number): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const competition = newComps.find((c: InternationalCompetition) => c.id === competitionId);
      if (!competition) return newComps;

      const isPlayoffs = competition.status === 'playoffs';
      const phase = isPlayoffs ? competition.playoffPhase! : competition.knockoutPhase;
      const round = phase.rounds.find(r => r.name === roundName);
      const match = round?.matches.find(m => m.id === matchId);

      if (match) {
        const allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);
        this.simulationService.applyManualCupResultForInternational(
          match, roundName, leg, competition, allTeamsInComp, homeScore, awayScore,
          this.addTrophyToTeam.bind(this), this.captureInternationalHistory.bind(this)
        );

        if (isPlayoffs) {
          if (competition.continent === 'NCA') this.advanceNorthAmericaPlayoffs(competition);
          else if (competition.continent === 'SAM') this.advanceSouthAmericaPlayoffs(competition);
          else if (competition.continent === 'EUR') this.advanceEuropePlayoffs(competition);
        } else {
          this.advanceInternationalCupRound(competition);
        }

        this.updateInternationalPlayerRankings(competition);
      }

      return newComps;
    });
  }

  private advanceAfricaPlayoffs(competition: InternationalCompetition): void {
    const finalPlayoffRound = competition.playoffPhase!.rounds[2]; // A 3ª fase PRÉ
    if (!finalPlayoffRound || !finalPlayoffRound.matches.every(m => m.played)) {
      return; // A última fase de playoffs ainda não terminou
    }

    // 1. Pegar os 16 vencedores
    const winners = finalPlayoffRound.matches.map(m => {
      const winnerId = m.aggregateWinnerId || m.winner?.id;
      return competition.teams.find(t => t.id === winnerId)!;
    });

    // 2. Pegar os 16 times com "bye"
    // (São os times que estão na competição mas não jogaram a 1ª fase dos playoffs)
    const firstPlayoffRound = competition.playoffPhase!.rounds[0];
    const byesToLeaguePhase = competition.teams.filter(t =>
      !firstPlayoffRound.matches.some(m => m.homeTeam.id === t.id || m.awayTeam.id === t.id)
    );

    // 3. Juntar os times para formar a Fase de Liga de 32 equipes
    const leagueTeams = [...byesToLeaguePhase, ...winners];

    leagueTeams.forEach(team => {
      team.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    });

    competition.leaguePhase[0].teams = leagueTeams;

    // 4. Gerar os jogos da fase de liga (formato suíço)
    const fixtures: Match[][] = [];
    let schedule = [...leagueTeams];
    for (let round = 0; round < 7; round++) {
      const roundFixtures: Match[] = [];
      this.shuffle(schedule);
      for (let i = 0; i < leagueTeams.length / 2; i++) {
        roundFixtures.push(this.universeService.createMatch(round, schedule[i * 2], schedule[i * 2 + 1], 'Fase de Liga'));
      }
      fixtures.push(roundFixtures);
    }

    competition.leaguePhase[0].fixtures = fixtures;
    competition.status = 'league';
  }

  public simulateInternationalCupRound(competitionId: string, roundName: string) {
    let crownedChampionId: string | null = null;
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const competition = newComps.find((c: InternationalCompetition) => c.id === competitionId);
      if (!competition || (competition.status !== 'knockout' && competition.status !== 'playoffs' && competition.status !== 'pending')) return newComps;

      const isPlayoffs = competition.status === 'playoffs' || roundName.includes('PRÉ') || roundName.includes('Preliminar');
      const phase = isPlayoffs ? competition.playoffPhase! : competition.knockoutPhase;
      const round = phase.rounds.find(r => r.name === roundName);

      if (round) {
        const allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);

        const onFinalCallback = () => {
          if (competitionId === 'WORLD_CWC' || competitionId === 'WC_FINALS' || competitionId === 'WC_U20_FINALS') {
            this.seasonService.calculateBestPlayerInTheWorld();
          }
        };

        round.matches.forEach((match: CupMatch) => {
          // FIX: Replaced `competitionService.addTrophyToTeam` with local `addTrophyToTeam` to handle YCL trophy mapping.
          this.simulationService.simulateSingleCupLeg(match, round.name, 1, competition, allTeamsInComp, this.addTrophyToTeam.bind(this), this.captureInternationalHistory.bind(this), onFinalCallback);
          this.simulationService.simulateSingleCupLeg(match, round.name, 2, competition, allTeamsInComp, this.addTrophyToTeam.bind(this), this.captureInternationalHistory.bind(this), onFinalCallback);
        });

        if (roundName === 'Final' && competition.knockoutPhase?.champion) {
          crownedChampionId = competition.knockoutPhase.champion.id;
        }

        // ===================================================================
        // CORREÇÃO PRINCIPAL AQUI: Bloco 'isPlayoffs' reorganizado
        // ===================================================================
        if (isPlayoffs) {
          if (competition.continent === 'AFR' && round.name === '3ª Fase PRÉ') {
            this.advanceAfricaPlayoffs(competition);
          } else if (competition.continent === 'NCA' && round.name === '2ª Fase PRÉ') {
            this.advanceNorthAmericaPlayoffs(competition);
          } else if (competition.continent === 'SAM') {
            this.advanceSouthAmericaPlayoffs(competition);
          } else if (competition.continent === 'EUR') {
            this.advanceEuropePlayoffs(competition);
            // A LINHA ABAIXO FOI MOVIDA PARA DENTRO DESTE BLOCO 'IF'
          } else if (competition.id === 'EUR_NC' && round.name === 'Fase Preliminar') {
            this.advanceEuroQualifiers(competition);
          } else {
            // Avanço genérico para fases de playoffs intermediárias
            this.advanceInternationalCupRound(competition, true);
          }
        } else { // Se não for playoffs, é mata-mata normal
          this.advanceInternationalCupRound(competition);
        }
        // ===================================================================
        // FIM DA CORREÇÃO
        // ===================================================================

        this.updateInternationalPlayerRankings(competition);
      }
      return newComps;
    });

    if (crownedChampionId) {
      const comps = this.universeService.internationalCompetitions();
      const finalComp = comps.find(c => c.id === competitionId);
      const finalChampion = finalComp?.knockoutPhase?.champion;
      if (finalChampion && finalChampion.id === crownedChampionId) {
        this.propagateTeamUpdate(finalChampion);
      }
    }
  }

  private advanceInternationalCupRound(competition: InternationalCompetition, isPlayoffs: boolean = false): void {
    const phase = isPlayoffs ? competition.playoffPhase! : competition.knockoutPhase;

    let lastPlayedRoundIdx = -1;
    for (let i = 0; i < phase.rounds.length; i++) {
      const round = phase.rounds[i];
      if (round.matches.length > 0 && round.matches.every(m => m.played)) {
        lastPlayedRoundIdx = i;
      } else if (round.matches.length > 0 && round.matches.some(m => !m.played)) {
        break;
      }
    }

    if (lastPlayedRoundIdx === -1 || lastPlayedRoundIdx >= phase.rounds.length - 1) {
      return;
    }

    const lastPlayedRound = phase.rounds[lastPlayedRoundIdx];
    const nextRound = phase.rounds[lastPlayedRoundIdx + 1];

    if (nextRound.matches.length > 0) return;

    const allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);



    let winners: Team[] = [];

    if (lastPlayedRound.name === '1ª Fase (Play-in)') {
      const playInWinners = lastPlayedRound.matches.map(m => allTeamsInComp.find(t => t.id === m.aggregateWinnerId)!);
      const qualifiedTeams = [...allTeamsInComp].sort(this.universeService.sortTeams);
      const byes = qualifiedTeams.slice(0, 8);
      winners.push(...byes, ...playInWinners);
    } else {
      winners.push(...lastPlayedRound.matches.map(m => {
        const winnerId = m.aggregateWinnerId || m.winner?.id;
        return allTeamsInComp.find(t => t.id === winnerId)!;
      }));
    }

    for (let i = winners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [winners[i], winners[j]] = [winners[j], winners[i]];
    }

    for (let i = 0; i < winners.length / 2; i++) {
      nextRound.matches.push({
        id: `cup-intl-${nextRound.name.replace(/\s/g, '')}-${i}-${Date.now()}`,
        homeTeam: winners[i * 2],
        awayTeam: winners[i * 2 + 1],
        played: false, leg1Played: false, leg2Played: false,
      });
    }
  }

  private setupInternationalKnockout(competition: InternationalCompetition): void {
    if (competition.id === 'AFR_NC') {
      this.setupAcnKnockout(competition);
    } else if (competition.id === 'NCA_GC') {
      this.setupGoldCupKnockout(competition);
    } else if (competition.id === 'ASI_NC') {
      this.setupAsianCupKnockout(competition);

    } else if (competition.id === 'EUR_NC') {
      this.setupEuroCupKnockout(competition);
    } else if (competition.continent === 'AFR') {
      this.setupAfricaKnockout(competition);
    } else if (competition.continent === 'ASI') {
      this.setupAsiaKnockout(competition);
    } else if (competition.continent === 'NCA') {
      this.setupNorthAmericaKnockout(competition);
    } else if (competition.continent === 'SAM') {
      this.setupSouthAmericaKnockout(competition);
    } else if (competition.continent === 'EUR') {
      if (competition.id === 'EUR_YCL') {
        this.setupYouthChampionsLeagueKnockout(competition);
      } else {
        this.setupEuropeKnockout(competition);
      }
    }
    else if (competition.id === 'WC_FINALS' || competition.id === 'WC_U20_FINALS') {
      this.setupWorldCupFinalsKnockout(competition);
    }
  }

  private setupAcnKnockout(competition: InternationalCompetition): void {
    const groupWinners: Team[] = [];
    const groupRunnersUp: Team[] = [];

    competition.leaguePhase.forEach(group => {
      const sortedGroup = [...group.teams].sort(this.universeService.sortTeams);
      groupWinners.push(sortedGroup[0]);
      groupRunnersUp.push(sortedGroup[1]);
    });

    const ro16_matchups = [
      { home: groupWinners[0], away: groupRunnersUp[1] }, // A1 vs B2
      { home: groupWinners[2], away: groupRunnersUp[3] }, // C1 vs D2
      { home: groupWinners[4], away: groupRunnersUp[5] }, // E1 vs F2
      { home: groupWinners[6], away: groupRunnersUp[7] }, // G1 vs H2
      { home: groupWinners[1], away: groupRunnersUp[0] }, // B1 vs A2
      { home: groupWinners[3], away: groupRunnersUp[2] }, // D1 vs C2
      { home: groupWinners[5], away: groupRunnersUp[4] }, // F1 vs E2
      { home: groupWinners[7], away: groupRunnersUp[6] }, // H1 vs G2
    ];

    this.shuffle(ro16_matchups);

    const roundOf16: CupRound = { name: 'Oitavas de Final', matches: [] };
    ro16_matchups.forEach((matchup, i) => {
      roundOf16.matches.push(this.createCupMatch(`acn-r16-${i}`, matchup.home, matchup.away));
    });

    competition.knockoutPhase.rounds = [
      roundOf16,
      { name: 'Quartas de Final', matches: [] },
      { name: 'Semifinais', matches: [] },
      { name: 'Final', matches: [] }
    ];
  }

  private setupGoldCupKnockout(competition: InternationalCompetition): void {
    const groupWinners: Team[] = [];
    const groupRunnersUp: Team[] = [];

    // ALTERAÇÃO AQUI: Pega os classificados dos 8 grupos
    competition.leaguePhase.forEach(group => {
      const sortedGroup = [...group.teams].sort(this.universeService.sortTeams);
      groupWinners.push(sortedGroup[0]);
      groupRunnersUp.push(sortedGroup[1]);
    });

    // Define os confrontos das Oitavas de Final
    const ro16_matchups = [
      { home: groupWinners[0], away: groupRunnersUp[1] }, // A1 vs B2
      { home: groupWinners[2], away: groupRunnersUp[3] }, // C1 vs D2
      { home: groupWinners[4], away: groupRunnersUp[5] }, // E1 vs F2
      { home: groupWinners[6], away: groupRunnersUp[7] }, // G1 vs H2
      { home: groupWinners[1], away: groupRunnersUp[0] }, // B1 vs A2
      { home: groupWinners[3], away: groupRunnersUp[2] }, // D1 vs C2
      { home: groupWinners[5], away: groupRunnersUp[4] }, // F1 vs E2
      { home: groupWinners[7], away: groupRunnersUp[6] }, // H1 vs G2
    ];

    this.shuffle(ro16_matchups);

    // Cria a fase de Oitavas de Final
    const roundOf16: CupRound = { name: 'Oitavas de Final', matches: [] };
    ro16_matchups.forEach((matchup, i) => {
      roundOf16.matches.push(this.createCupMatch(`gc-r16-${i}`, matchup.home, matchup.away));
    });

    // Define a estrutura completa do mata-mata
    competition.knockoutPhase.rounds = [
      roundOf16,
      { name: 'Quartas de Final', matches: [] },
      { name: 'Semifinais', matches: [] },
      { name: 'Final', matches: [] }
    ];
  }

  private setupAsianCupKnockout(competition: InternationalCompetition): void {
    const groupWinners: Team[] = [];
    const groupRunnersUp: Team[] = [];

    // ALTERAÇÃO AQUI: Pega os classificados dos 8 grupos
    competition.leaguePhase.forEach(group => {
      const sortedGroup = [...group.teams].sort(this.universeService.sortTeams);
      groupWinners.push(sortedGroup[0]);
      groupRunnersUp.push(sortedGroup[1]);
    });

    // Define os confrontos das Oitavas de Final
    const ro16_matchups = [
      { home: groupWinners[0], away: groupRunnersUp[1] }, // A1 vs B2
      { home: groupWinners[2], away: groupRunnersUp[3] }, // C1 vs D2
      { home: groupWinners[4], away: groupRunnersUp[5] }, // E1 vs F2
      { home: groupWinners[6], away: groupRunnersUp[7] }, // G1 vs H2
      { home: groupWinners[1], away: groupRunnersUp[0] }, // B1 vs A2
      { home: groupWinners[3], away: groupRunnersUp[2] }, // D1 vs C2
      { home: groupWinners[5], away: groupRunnersUp[4] }, // F1 vs E2
      { home: groupWinners[7], away: groupRunnersUp[6] }, // H1 vs G2
    ];

    this.shuffle(ro16_matchups);

    // Cria a fase de Oitavas de Final
    const roundOf16: CupRound = { name: 'Oitavas de Final', matches: [] };
    ro16_matchups.forEach((matchup, i) => {
      roundOf16.matches.push(this.createCupMatch(`ac-r16-${i}`, matchup.home, matchup.away));
    });

    // Define a estrutura completa do mata-mata
    competition.knockoutPhase.rounds = [
      roundOf16,
      { name: 'Quartas de Final', matches: [] },
      { name: 'Semifinais', matches: [] },
      { name: 'Final', matches: [] }
    ];
  }

  private setupEuroCupKnockout(competition: InternationalCompetition): void {
    const groupWinners: Team[] = [];
    const groupRunnersUp: Team[] = [];

    competition.leaguePhase.forEach(group => {
      const sortedGroup = [...group.teams].sort(this.universeService.sortTeams);
      groupWinners.push(sortedGroup[0]);
      groupRunnersUp.push(sortedGroup[1]);
    });

    const ro16_matchups = [
      { home: groupWinners[0], away: groupRunnersUp[1] }, // A1 vs B2
      { home: groupWinners[2], away: groupRunnersUp[3] }, // C1 vs D2
      { home: groupWinners[4], away: groupRunnersUp[5] }, // E1 vs F2
      { home: groupWinners[6], away: groupRunnersUp[7] }, // G1 vs H2
      { home: groupWinners[1], away: groupRunnersUp[0] }, // B1 vs A2
      { home: groupWinners[3], away: groupRunnersUp[2] }, // D1 vs C2
      { home: groupWinners[5], away: groupRunnersUp[4] }, // F1 vs E2
      { home: groupWinners[7], away: groupRunnersUp[6] }, // H1 vs G2
    ];

    this.shuffle(ro16_matchups);

    const roundOf16: CupRound = { name: 'Oitavas de Final', matches: [] };
    ro16_matchups.forEach((matchup, i) => {
      roundOf16.matches.push(this.createCupMatch(`eur-r16-${i}`, matchup.home, matchup.away));
    });

    competition.knockoutPhase.rounds = [
      roundOf16,
      { name: 'Quartas de Final', matches: [] },
      { name: 'Semifinais', matches: [] },
      { name: 'Final', matches: [] }
    ];
  }

  private setupWorldCupFinalsKnockout(competition: InternationalCompetition): void {
    // ===================================================================
    // ALTERAÇÃO 3: NOVA LÓGICA COMPLETA DE CLASSIFICAÇÃO
    // ===================================================================

    // 1. Coleta os 2 primeiros de cada um dos 12 grupos
    const topTwoTeams: Team[] = [];
    competition.leaguePhase.forEach(group => {
      const sortedGroup = [...group.teams].sort(this.universeService.sortTeams);
      topTwoTeams.push(...sortedGroup.slice(0, 2));
    });

    // 2. Coleta e ordena os 12 terceiros colocados
    const thirdPlaceTeams: Team[] = [];
    competition.leaguePhase.forEach(group => {
      const sortedGroup = [...group.teams].sort(this.universeService.sortTeams);
      if (sortedGroup[2]) {
        thirdPlaceTeams.push(sortedGroup[2]);
      }
    });

    // Ordena os terceiros colocados (melhor para o pior)
    const sortedThirdPlace = thirdPlaceTeams.sort(this.universeService.sortTeams);

    // 3. Pega os 8 melhores terceiros colocados
    const bestThirdPlaceTeams = sortedThirdPlace.slice(0, 8);

    // 4. Junta todos os 32 times classificados
    const knockoutTeams = [...topTwoTeams, ...bestThirdPlaceTeams];

    // Embaralha os 32 times para o sorteio do mata-mata
    this.shuffle(knockoutTeams);

    // 5. Monta a fase de "Dezesseis avos de Final"
    const roundOf32: CupRound = { name: 'Dezesseis avos de Final', matches: [] };
    for (let i = 0; i < 16; i++) { // 32 times = 16 jogos
      roundOf32.matches.push(this.createCupMatch(`wc-r32-${i}`, knockoutTeams[i * 2], knockoutTeams[i * 2 + 1]));
    }

    // Limpa e define as novas fases do mata-mata
    competition.knockoutPhase.rounds = [
      roundOf32,
      { name: 'Oitavas de Final', matches: [] },
      { name: 'Quartas de Final', matches: [] },
      { name: 'Semifinais', matches: [] },
      { name: 'Final', matches: [] }
    ];
  }

  private setupAfricaKnockout(competition: InternationalCompetition): void {
    const qualifiedTeams = [...competition.leaguePhase[0].teams].sort(this.universeService.sortTeams);
    const top8 = qualifiedTeams.slice(0, 8);
    const playInTeams = qualifiedTeams.slice(8, 24);

    for (let i = playInTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playInTeams[i], playInTeams[j]] = [playInTeams[j], playInTeams[i]];
    }

    const playInRound: CupRound = { name: '1ª Fase (Play-in)', matches: [] };
    for (let i = 0; i < 8; i++) {
      playInRound.matches.push({
        id: `cup-intl-playin-${i}-${Date.now()}`,
        homeTeam: playInTeams[i * 2],
        awayTeam: playInTeams[i * 2 + 1],
        played: false, leg1Played: false, leg2Played: false,
      });
    }

    competition.knockoutPhase.rounds = [
      playInRound,
      { name: 'Oitavas de Final', matches: [] },
      { name: 'Quartas de Final', matches: [] },
      { name: 'Semifinais', matches: [] },
      { name: 'Final', matches: [] }
    ];
  }

  private setupEuropeKnockout(competition: InternationalCompetition): void {
    const qualifiedTeams = [...competition.leaguePhase[0].teams].sort(this.universeService.sortTeams);
    const top8 = qualifiedTeams.slice(0, 8);
    const playInTeams = qualifiedTeams.slice(8, 24);

    for (let i = playInTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playInTeams[i], playInTeams[j]] = [playInTeams[j], playInTeams[i]];
    }

    const playInRound: CupRound = { name: '1ª Fase (Play-in)', matches: [] };
    for (let i = 0; i < 8; i++) {
      playInRound.matches.push({
        id: `cup-intl-eur-playin-${i}-${Date.now()}`,
        homeTeam: playInTeams[i * 2],
        awayTeam: playInTeams[i * 2 + 1],
        played: false, leg1Played: false, leg2Played: false,
      });
    }

    competition.knockoutPhase.rounds = [
      playInRound,
      { name: 'Oitavas de Final', matches: [] },
      { name: 'Quartas de Final', matches: [] },
      { name: 'Semifinais', matches: [] },
      { name: 'Final', matches: [] }
    ];
  }

  private setupAsiaKnockout(competition: InternationalCompetition): void {
    // 1. Pega a classificação final do grupo único
    const standings = [...competition.leaguePhase[0].teams].sort(this.universeService.sortTeams);

    // 2. Pega os 8 melhores para as quartas de final
    const top8 = standings.slice(0, 8);
    
    if (top8.length < 8) {
      console.warn("[setupAsiaKnockout] Menos de 8 times classificados para o mata-mata.");
    }

    // 3. Cria os confrontos das quartas de final (Ex: 1º vs 8º, 2º vs 7º, etc.)
    const qf_matchups: { home: Team, away: Team }[] = [];
    const limit = Math.floor(top8.length / 2);
    for (let i = 0; i < limit; i++) {
      qf_matchups.push({ home: top8[i], away: top8[top8.length - 1 - i] });
    }

    // Embaralha a ordem dos jogos
    this.shuffle(qf_matchups);

    // 4. Cria a rodada de Quartas de Final
    const quartas: CupRound = { name: 'Quartas de Final', matches: [] };
    qf_matchups.forEach((matchup, i) => {
      quartas.matches.push(this.createCupMatch(`asi-cl-qf-${i}`, matchup.home, matchup.away));
    });

    // 5. Define a estrutura completa do mata-mata (começando direto em Quartas)
    competition.knockoutPhase = {
      rounds: [
        quartas,
        { name: 'Semifinais', matches: [] },
        { name: 'Final', matches: [] }
      ],
      topScorers: [],
      topAssists: [],
      topMotm: []
    };

    console.log(`✅ Mata-mata da Ásia Champions League definido com ${quartas.matches.length} jogos.`);
  }

  private setupNorthAmericaKnockout(competition: InternationalCompetition): void {
    // 1. Pega os classificados da fase de liga e ordena pela classificação final.
    const qualifiedTeams = [...competition.leaguePhase[0].teams].sort(this.universeService.sortTeams);
    const top8 = qualifiedTeams.slice(0, 8);

    if (top8.length < 8) {
      console.warn("[setupNorthAmericaKnockout] Menos de 8 times classificados para o mata-mata.");
    }

    // 2. Cria os confrontos das quartas de final (Ex: 1º vs 8º, 2º vs 7º, etc.)
    const qf_matchups: { home: Team, away: Team }[] = [];
    const limit = Math.floor(top8.length / 2);
    for (let i = 0; i < limit; i++) {
      qf_matchups.push({ home: top8[i], away: top8[top8.length - 1 - i] });
    }

    this.shuffle(qf_matchups);

    // 3. Cria a rodada de Quartas de Final
    const quartas: CupRound = { name: 'Quartas de Final', matches: [] };
    qf_matchups.forEach((matchup, i) => {
      quartas.matches.push(this.createCupMatch(`nca-cl-qf-${i}`, matchup.home, matchup.away));
    });

    // 4. Define a estrutura completa do mata-mata
    competition.knockoutPhase = {
      rounds: [
        quartas,
        { name: 'Semifinais', matches: [] },
        { name: 'Final', matches: [] }
      ],
      topScorers: [],
      topAssists: [],
      topMotm: []
    };

    console.log(`✅ Mata-mata da America Champions League definido com ${quartas.matches.length} jogos.`);
  }

  private setupSouthAmericaKnockout(competition: InternationalCompetition): void {
    const qualifiedTeams: Team[] = [];

    competition.leaguePhase.forEach(group => {
      const sortedGroup = [...group.teams].sort(this.universeService.sortTeams);
      qualifiedTeams.push(...sortedGroup.slice(0, 2)); // Top 2 de cada grupo se classificam
    });

    // A lógica agora é a mesma para Libertadores e Sulamericana
    // Sorteio: 1ºs colocados vs 2ºs colocados
    const firstPlaces = qualifiedTeams.filter((_, index) => index % 2 === 0);
    const secondPlaces = qualifiedTeams.filter((_, index) => index % 2 !== 0);

    this.shuffle(firstPlaces);
    this.shuffle(secondPlaces);

    const knockoutTeams = [];
    for (let i = 0; i < firstPlaces.length; i++) {
      knockoutTeams.push(firstPlaces[i], secondPlaces[i]);
    }

    const roundOf16: CupRound = { name: 'Oitavas de Final', matches: [] };
    for (let i = 0; i < 8; i++) { // 16 times = 8 jogos
      roundOf16.matches.push({
        id: `cup-${competition.id}-r16-${i}-${Date.now()}`,
        homeTeam: knockoutTeams[i * 2],
        awayTeam: knockoutTeams[i * 2 + 1],
        played: false, leg1Played: false, leg2Played: false,
      });
    }

    competition.knockoutPhase.rounds = [
      roundOf16,
      { name: 'Quartas de Final', matches: [] },
      { name: 'Semifinais', matches: [] },
      { name: 'Final', matches: [] }
    ];
  }

  private advanceNorthAmericaPlayoffs(competition: InternationalCompetition): void {
    // Verifica se a última fase de playoffs realmente terminou
    const finalPlayoffRound = competition.playoffPhase!.rounds[1]; // Lê a '2ª Fase PRÉ'
    if (!finalPlayoffRound || !finalPlayoffRound.matches.every(m => m.played)) {
      // Se não terminou, não faz nada para evitar erros.
      return;
    }

    // Pega todos os times que participaram da competição para fazer a busca
    const allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);

    // 1. Coleta os 24 vencedores da última fase de playoffs
    const playoffWinners = finalPlayoffRound.matches.map(match => {
      const winnerId = match.aggregateWinnerId || match.winner?.id;
      // Busca o objeto completo do time vencedor na lista de todos os times da competição
      return allTeamsInComp.find(team => team.id === winnerId);
    }).filter(Boolean) as Team[]; // O '.filter(Boolean)' é uma segurança extra para remover qualquer 'undefined'

    // 2. Coleta os 8 times que tiveram "bye" (classificados diretos)
    const byeTeams = competition.leaguePhase[0].teams;

    // 3. Junta os classificados diretos com os vencedores dos playoffs
    const leagueTeams = [...byeTeams, ...playoffWinners];

    // Validação de segurança
    if (leagueTeams.length !== 32) {
      return; // Interrompe a execução para não propagar o erro
    }

    // 4. Prepara os times para a nova fase (zera as estatísticas)
    leagueTeams.forEach(team => {
      if (team) { // Verificação para garantir que o time não é undefined
        team.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      }
    });

    // 5. Embaralha e atribui os 32 times à fase de liga
    this.shuffle(leagueTeams);
    competition.leaguePhase[0].teams = leagueTeams;

    // 6. Gera os jogos no formato suíço
    competition.leaguePhase[0].fixtures = (this as any).generateSwissFixtures(leagueTeams, 'Fase de Liga');

    // 7. Atualiza o status da competição
    competition.status = 'league';
  }

  private advanceSouthAmericaPlayoffs(competition: InternationalCompetition): void {
    const playoffRound = competition.playoffPhase!.rounds[0];
    if (!playoffRound.matches.every(m => m.played)) {
      return;
    }
    competition.status = 'playoffs_finished';
  }

  private updateInternationalPlayerRankings(competition: InternationalCompetition): void {
    const allPlayers: Player[] = this.universeService.getUpToDateTeamsForInternationalComp(competition).flatMap(t => t.players);
    const statType = competition.id === 'EUR_YCL' ? 'youthStats' :
      (competition.id === 'WORLD_CWC' || competition.id === 'WC_FINALS' || competition.id === 'WC_U20_FINALS' || competition.id === 'AFR_NC' || competition.id === 'EUR_NC') ? 'worldCupStats' : 'internationalStats';

    const sortByGoals = (a: Player, b: Player) => {
      const goalsA = a[statType]?.goals || 0;
      const goalsB = b[statType]?.goals || 0;
      if (goalsB !== goalsA) return goalsB - goalsA;
      const matchesA = a[statType]?.matchesPlayed || 0;
      const matchesB = b[statType]?.matchesPlayed || 0;
      if (matchesA !== matchesB) return matchesA - matchesB;
      return a.name.localeCompare(b.name);
    };

    const sortByAssists = (a: Player, b: Player) => {
      const assistsA = a[statType]?.assists || 0;
      const assistsB = b[statType]?.assists || 0;
      if (assistsB !== assistsA) return assistsB - assistsA;
      const matchesA = a[statType]?.matchesPlayed || 0;
      const matchesB = b[statType]?.matchesPlayed || 0;
      if (matchesA !== matchesB) return matchesA - matchesB;
      return a.name.localeCompare(b.name);
    };

    const sortByMotm = (a: Player, b: Player) => {
      const motmA = a[statType]?.motm || 0;
      const motmB = b[statType]?.motm || 0;
      if (motmB !== motmA) return motmB - motmA;
      const matchesA = a[statType]?.matchesPlayed || 0;
      const matchesB = b[statType]?.matchesPlayed || 0;
      if (matchesA !== matchesB) return matchesA - matchesB;
      return a.name.localeCompare(b.name);
    };

    competition.topScorers = [...allPlayers].sort(sortByGoals).slice(0, 10);
    competition.topAssists = [...allPlayers].sort(sortByAssists).slice(0, 10);
    competition.topMotm = [...allPlayers].sort(sortByMotm).slice(0, 10);
  }

  private cloneAndResetTeamStats(team: Team): Team {
    const cloned: Team = JSON.parse(JSON.stringify(team));
    cloned.players.forEach((p: Player) => {
      p.stats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
      p.cupStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
      p.internationalStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
      p.worldCupStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
      p.worldCupQualifierStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
      p.youthStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
    });
    cloned.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    return cloned;
  }

  private shuffle(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private createCupMatch(id: string, home: Team, away: Team): CupMatch {
    return {
      id: `${id}-${Date.now()}`,
      homeTeam: home,
      awayTeam: away,
      played: false, leg1Played: false, leg2Played: false,
    };
  }

  public startEuropePlayoffs(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const clComp = newComps.find((c: InternationalCompetition) => c.id === 'EUR_CL');
      const elComp = newComps.find((c: InternationalCompetition) => c.id === 'EUR_EL');

      if (!clComp) {
        console.warn('[startEuropePlayoffs] EUR_CL não encontrada — criando do zero.');
        const newCl: any = {
          id: 'EUR_CL', name: 'Champions League', continent: 'EUR',
          status: 'pending', season: this.universeService.season(),
          teams: [], leaguePhase: [{ id: 1, name: 'Fase de Liga', teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }],
          knockoutPhase: { rounds: [], topScorers: [], topAssists: [], topMotm: [] },
          currentLeagueRound: 0, totalLeagueRounds: 7,
          topScorers: [], topAssists: [], topMotm: [], history: [], rankings: [],
        };
        newComps.push(newCl);
      }
      if (!elComp) {
        console.warn('[startEuropePlayoffs] EUR_EL não encontrada — criando do zero.');
        const newEl: any = {
          id: 'EUR_EL', name: 'Europa League', continent: 'EUR',
          status: 'pending', season: this.universeService.season(),
          teams: [], leaguePhase: [{ id: 1, name: 'Fase de Liga', teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }],
          knockoutPhase: { rounds: [], topScorers: [], topAssists: [], topMotm: [] },
          currentLeagueRound: 0, totalLeagueRounds: 7,
          topScorers: [], topAssists: [], topMotm: [], history: [], rankings: [],
        };
        newComps.push(newEl);
      }

      // Re-buscar após possível criação
      const cl: any = newComps.find((c: InternationalCompetition) => c.id === 'EUR_CL');
      const el: any = newComps.find((c: InternationalCompetition) => c.id === 'EUR_EL');
      if (!cl || !el) return newComps;

      // Reset completo
      cl.currentLeagueRound = 0;
      el.currentLeagueRound = 0;
      cl.leaguePhase = [{ id: 1, name: 'Fase de Liga', teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }];
      el.leaguePhase = [{ id: 1, name: 'Fase de Liga', teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }];

      // Limpar e preparar
      cl.teams = [];
      cl.leaguePhase[0].teams = [];
      el.teams = [];
      el.leaguePhase[0].teams = [];

      const clTeams: Team[] = [];
      const elTeams: Team[] = [];

      // ESP, ENG, ITA, GER, FRA: 4 CL (pos 1-4) + 4 EL (pos 5-8)
      ['ESP', 'ENG', 'ITA', 'GER', 'FRA'].forEach(id => {
        clTeams.push(...this.getTeamsByStanding(id, 0, 4));
        elTeams.push(...this.getTeamsByStanding(id, 4, 4));
      });

      // POR: 4 CL (pos 1-4) + 3 EL (pos 5-7)
      clTeams.push(...this.getTeamsByStanding('POR', 0, 4));
      elTeams.push(...this.getTeamsByStanding('POR', 4, 3));

      // BEL: 2 CL (pos 1-2) + 3 EL (pos 3-5)
      clTeams.push(...this.getTeamsByStanding('BEL', 0, 2));
      elTeams.push(...this.getTeamsByStanding('BEL', 2, 3));

      // TUR, RUS, NED: 2 CL (pos 1-2) + 2 EL (pos 3-4)
      ['TUR', 'RUS', 'NED'].forEach(id => {
        clTeams.push(...this.getTeamsByStanding(id, 0, 2));
        elTeams.push(...this.getTeamsByStanding(id, 2, 2));
      });

      console.log(`[startEuropePlayoffs] CL teams: ${clTeams.length}, EL teams: ${elTeams.length}`);

      // Truncar para 32 times em cada competição e embaralhar
      const finalClTeams = clTeams.slice(0, 32);
      const finalElTeams = elTeams.slice(0, 32);
      this.shuffle(finalClTeams);
      this.shuffle(finalElTeams);

      // Zerar stats e configurar fase de liga direto
      const setupLeague = (comp: any, teams: Team[]) => {
        teams.forEach(t => {
          t.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        });
        comp.teams = teams;
        comp.leaguePhase[0].teams = teams;
        comp.leaguePhase[0].fixtures = this.generateSwissFixtures(teams, 'Fase de Liga');
        comp.status = 'league';
      };

      setupLeague(cl, finalClTeams);
      setupLeague(el, finalElTeams);

      return newComps;
    });
  }

  private getPlayoffResults(competition: InternationalCompetition, roundName: string): { winners: Team[], losers: Team[] } {
    const round = competition.playoffPhase?.rounds.find(r => r.name === roundName);
    if (!round) {
      console.error(`Playoff round "${roundName}" not found in ${competition.id}`);
      return { winners: [], losers: [] };
    }

    const winners: Team[] = [];
    const losers: Team[] = [];
    const allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);

    round.matches.forEach(match => {
      const winnerId = match.aggregateWinnerId;
      if (!winnerId) return;

      const winner = allTeamsInComp.find(t => t.id === winnerId);
      const loser = match.homeTeam.id === winnerId ? match.awayTeam : match.homeTeam;
      const loserFull = allTeamsInComp.find(t => t.id === loser.id);

      if (winner) winners.push(winner);
      if (loserFull) losers.push(loserFull);
    });

    return { winners, losers };
  }

  public startEuropeGroupStages(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const newComps = JSON.parse(JSON.stringify(comps));
      const clComp = newComps.find((c: InternationalCompetition) => c.id === 'EUR_CL');
      const elComp = newComps.find((c: InternationalCompetition) => c.id === 'EUR_EL');
      const eulComp = newComps.find((c: InternationalCompetition) => c.id === 'EUR_EUL');

      if (!clComp || !elComp || !eulComp || clComp.status !== 'playoffs_finished' || elComp.status !== 'playoffs_finished' || eulComp.status !== 'playoffs_finished') {
        return newComps;
      }

      // 1. Coletar vencedores e perdedores da ÚLTIMA fase de playoffs
      const getPlayoffResults = (comp: InternationalCompetition, roundName: string): { winners: Team[], losers: Team[] } => {
        const round = comp.playoffPhase!.rounds.find(r => r.name === roundName);
        if (!round) return { winners: [], losers: [] };
        const winners: Team[] = [];
        const losers: Team[] = [];
        round.matches.forEach(m => {
          const winner = comp.teams.find((t: Team) => t.id === m.aggregateWinnerId);
          if (winner) {
            winners.push(winner);
            const loser = m.homeTeam.id === winner.id ? m.awayTeam : m.homeTeam;
            losers.push(comp.teams.find((t: Team) => t.id === loser.id));
          }
        });
        return { winners, losers };
      };

      const cl_results = getPlayoffResults(clComp, '3ª Fase PRÉ'); // 8 vencedores, 8 perdedores
      const el_results = getPlayoffResults(elComp, '3ª Fase PRÉ'); // 8 vencedores, 8 perdedores
      const eul_results = getPlayoffResults(eulComp, '2ª Fase PRÉ'); // 16 vencedores

      // 2. Montar as listas de times para a Fase de Liga
      const cl_league_teams = [...clComp.leaguePhase[0].teams, ...cl_results.winners];
      const el_league_teams = [...elComp.leaguePhase[0].teams, ...el_results.winners, ...cl_results.losers];
      const eul_league_teams = [...eulComp.leaguePhase[0].teams, ...eul_results.winners, ...el_results.losers];

      // 3. Configurar cada competição
      const setupLeaguePhase = (comp: InternationalCompetition, teams: Team[], expectedCount: number) => {
        if (teams.length !== expectedCount) {
          console.error(`Contagem de times incorreta para ${comp.id}. Esperado: ${expectedCount}, Recebido: ${teams.length}`);
          return;
        }
        teams.forEach(t => { if (t) t.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }; });
        this.shuffle(teams);
        comp.teams = teams; // Atualiza a lista principal de times da competição
        comp.leaguePhase[0].teams = teams;
        comp.leaguePhase[0].fixtures = this.generateSwissFixtures(teams, 'Fase de Liga');
        comp.status = 'league';
      };

      setupLeaguePhase(clComp, cl_league_teams, 32); // 24 diretos + 8 vencedores
      setupLeaguePhase(elComp, el_league_teams, 32); // 16 diretos + 8 vencedores + 8 perdedores da CL
      setupLeaguePhase(eulComp, eul_league_teams, 32); // 8 diretos + 16 vencedores + 8 perdedores da EL

      return newComps;
    });
  }

  private generateSwissFixtures(teams: Team[], divisionName: string): Match[][] {
    const fixtures: Match[][] = [];
    let schedule = [...teams];
    const numRounds = 7; // Definido para o formato suíço com 32 times
    const matchesPerRound = teams.length / 2;

    for (let round = 0; round < numRounds; round++) {
      const roundFixtures: Match[] = [];
      this.shuffle(schedule); // Simplificação: embaralha a cada rodada. Um sistema suíço real é mais complexo.
      for (let i = 0; i < matchesPerRound; i++) {
        const home = schedule[i * 2];
        const away = schedule[i * 2 + 1];
        roundFixtures.push(this.universeService.createMatch(round, home, away, divisionName));
      }
      fixtures.push(roundFixtures);
    }
    return fixtures;
  }

  private advanceEuroQualifiers(competition: InternationalCompetition): void {
    const prelimRound = competition.playoffPhase!.rounds[0];
    if (!prelimRound.matches.every(m => m.played)) {
      return; // Ainda não terminou
    }

    const allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);
    const winners = prelimRound.matches.map(m => {
      const winnerId = m.aggregateWinnerId || m.winner?.id;
      return allTeamsInComp.find(t => t.id === winnerId)!;
    });

    const teamsWithBye = competition.teams.filter(t =>
      !prelimRound.matches.some(m => m.homeTeam.id === t.id || m.awayTeam.id === t.id)
    );

    // ===================================================================
    // INÍCIO DA LÓGICA DE POTES (NOVA)
    // ===================================================================

    // 1. Juntar todos os 48 times classificados e ORDENÁ-LOS por 'overall'
    const qualifyingTeams = [...teamsWithBye, ...winners].sort((a, b) => b.overall - a.overall);

    // 2. Dividir os 48 times em 6 potes de 8
    const pot1 = qualifyingTeams.slice(0, 8);
    const pot2 = qualifyingTeams.slice(8, 16);
    const pot3 = qualifyingTeams.slice(16, 24);
    const pot4 = qualifyingTeams.slice(24, 32);
    const pot5 = qualifyingTeams.slice(32, 40);
    const pot6 = qualifyingTeams.slice(40, 48);

    // 3. Embaralhar os times DENTRO de cada pote
    this.shuffle(pot1);
    this.shuffle(pot2);
    this.shuffle(pot3);
    this.shuffle(pot4);
    this.shuffle(pot5);
    this.shuffle(pot6);

    // 4. Montar os 8 grupos, pegando um time de cada pote
    for (let i = 0; i < 8; i++) {
      const group = competition.leaguePhase[i];
      const groupTeams = [
        pot1[i], pot2[i], pot3[i],
        pot4[i], pot5[i], pot6[i]
      ];

      groupTeams.forEach(team => {
        team.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      });

      group.teams = groupTeams;
      group.fixtures = this.universeService.generateFixtures(groupTeams, `Grupo ${String.fromCharCode(65 + i)}`);
    }
    // ===================================================================
    // FIM DA LÓGICA DE POTES
    // ===================================================================

    competition.status = 'league';
  }

  public advanceEuropePlayoffs(competition: InternationalCompetition): void {
    const rounds = competition.playoffPhase!.rounds;
    const allTeamsInComp = this.universeService.getUpToDateTeamsForInternationalComp(competition);

    const currentRoundIndex = rounds.findIndex(r => r.matches.length > 0 && r.matches.some(m => !m.played));

    // Se não há rodada atual para jogar, significa que estamos avançando de uma rodada concluída.
    if (currentRoundIndex === -1) {
      let lastPopulatedRoundIndex = -1;
      for (let i = rounds.length - 1; i >= 0; i--) {
        if (rounds[i].matches.length > 0) {
          lastPopulatedRoundIndex = i;
          break;
        }
      }

      if (lastPopulatedRoundIndex === -1 || !rounds[lastPopulatedRoundIndex].matches.every(m => m.played)) {
        // Ou nenhuma rodada foi jogada, ou a última rodada ainda não terminou. Não faz nada.
        return;
      }

      // Verifica se a última fase de playoffs terminou
      if (lastPopulatedRoundIndex + 1 >= rounds.length) {
        competition.status = 'playoffs_finished';
        return;
      }

      // Prepara a próxima fase
      const lastCompletedRound = rounds[lastPopulatedRoundIndex];
      const nextRound = rounds[lastPopulatedRoundIndex + 1];

      if (nextRound.matches.length > 0) return; // Próxima fase já populada

      const winners = lastCompletedRound.matches.map(m => {
        const winnerId = m.aggregateWinnerId || m.winner?.id;
        return allTeamsInComp.find(t => t.id === winnerId);
      }).filter((t): t is Team => t !== undefined);

      if (winners.length === 0 || winners.length % 2 !== 0) return;

      this.shuffle(winners);

      for (let i = 0; i < winners.length / 2; i++) {
        nextRound.matches.push(this.createCupMatch(`eur-${competition.id.toLowerCase()}-r${lastPopulatedRoundIndex + 1}-${i}`, winners[i * 2], winners[i * 2 + 1]));
      }
    }
  }

  private addTrophyToTeam(team: Team, trophyName: string, trophyType: Trophy['type']) {
    if (!team) return;

    let targetTeam = team;
    if (team.id.startsWith('YCL-')) {
      const originalId = team.id.replace('YCL-', '');
      const originalTeam = this.universeService.teams().find(t => t.id === originalId);
      if (originalTeam) {
        targetTeam = originalTeam;
      }
    }

    if (!targetTeam.trophies) {
      targetTeam.trophies = [];
    }
    const existingTrophy = targetTeam.trophies.find(t => t.name === trophyName);
    if (existingTrophy) {
      existingTrophy.count++;
    } else {
      targetTeam.trophies.push({ name: trophyName, count: 1, type: trophyType });
    }

    const budgetReward = (this.universeService as any)['budgetRewards'][trophyType];

    if (budgetReward) {
      targetTeam.budget += budgetReward;
    }
  }

  public setupYouthChampionsLeague(): void {
    this.universeService.internationalCompetitions.update(comps => {
      const yclIndex = comps.findIndex(c => c.id === 'EUR_YCL');
      if (yclIndex === -1 || comps[yclIndex].status !== 'pending') return comps;

      const newComps = [...comps];
      const ycl = { ...newComps[yclIndex] };
      newComps[yclIndex] = ycl;
      
      // Resetar propriedades para nova temporada
      ycl.leaguePhase = JSON.parse(JSON.stringify(ycl.leaguePhase || []));
      ycl.knockoutPhase = { ...ycl.knockoutPhase, rounds: [], champion: undefined, runnerUp: undefined };
      ycl.teams = [];

      // Pegar os campeões das 8 melhores ligas (Espanha, Inglaterra, Itália, Alemanha, França, Portugal, Holanda, Rússia)
      const qualifiedTeams: Team[] = [];
      const countries = ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'RUS']; // Troquei Rússia por Turquia por ser mais comum no jogo

      countries.forEach(countryId => {
        const teams = this.getTeamsByStanding(countryId, 0, 1);
        if (teams.length > 0) {
          const team = teams[0];
          // Criar uma cópia "Youth" do time
          const youthTeam: Team = JSON.parse(JSON.stringify(team));
          youthTeam.id = `YCL-${team.id}`;
          youthTeam.teamName = `${team.teamName} Youth`;
          // Troca os jogadores profissionais pelos da base para a competição
          youthTeam.players = team.youthAcademy && team.youthAcademy.length > 0
            ? team.youthAcademy
            : [];

          // Se a base estiver vazia por algum motivo, gera alguns jogadores
          if (youthTeam.players.length < 5) {
            for (let i = youthTeam.players.length; i < 5; i++) {
              youthTeam.players.push((this.universeService as any).generateYouthPlayer(team.countryId, i === 0));
            }
          }

          youthTeam.stats = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
          qualifiedTeams.push(youthTeam);
        }
      });

      if (qualifiedTeams.length < 8) return newComps;

      this.shuffle(qualifiedTeams);
      ycl.teams = qualifiedTeams;

      // Dividir em 2 grupos de 4
      const groupA = qualifiedTeams.slice(0, 4);
      const groupB = qualifiedTeams.slice(4, 8);

      ycl.leaguePhase[0].teams = groupA;
      ycl.leaguePhase[1].teams = groupB;

      ycl.leaguePhase[0].fixtures = this.universeService.generateFixtures(groupA, 'Grupo A');
      ycl.leaguePhase[1].fixtures = this.universeService.generateFixtures(groupB, 'Grupo B');

      ycl.status = 'league';
      ycl.currentLeagueRound = 0;
      ycl.totalLeagueRounds = 6;

      return newComps;
    });
  }

  private setupYouthChampionsLeagueKnockout(competition: InternationalCompetition): void {
    const semiFinalists: Team[] = [];

    // Pegar os 2 melhores de cada grupo
    competition.leaguePhase.forEach(group => {
      const sortedGroup = [...group.teams].sort(this.universeService.sortTeams);
      semiFinalists.push(sortedGroup[0], sortedGroup[1]);
    });

    // Sorteio das Semifinais (1º do A vs 2º do B, 1º do B vs 2º do A)
    const semi1 = this.createCupMatch('ycl-semi-1', semiFinalists[0], semiFinalists[3]); // A1 vs B2
    const semi2 = this.createCupMatch('ycl-semi-2', semiFinalists[2], semiFinalists[1]); // B1 vs A2

    competition.knockoutPhase.rounds = [
      { name: 'Semifinais', matches: [semi1, semi2] },
      { name: 'Final', matches: [] }
    ];
  }

  private updateChampionshipRankings(ranking: ChampionshipRankingRecord[], champion: Team | null) {
    if (!champion) return;

    let targetTeamId = champion.id;
    let targetTeamName = champion.teamName;

    if (champion.id.startsWith('YCL-')) {
      const originalId = champion.id.replace('YCL-', '');
      const originalTeam = this.universeService.teams().find(t => t.id === originalId);
      if (originalTeam) {
        targetTeamId = originalTeam.id;
        targetTeamName = originalTeam.teamName;
      }
    }

    const existingRecord = ranking.find(r => r.team.id === targetTeamId);
    if (existingRecord) {
      existingRecord.count++;
    } else {
      const championFull = this.universeService.teams().find(t => t.id === targetTeamId);
      ranking.push({ 
        team: { 
          id: targetTeamId, 
          teamName: targetTeamName,
          countryId: championFull?.countryId,
          logoUrl: championFull?.logoUrl
        }, 
        count: 1 
      });
    }
  }
}