import { Injectable, inject } from '@angular/core';
import { League, Division, Team, Player, CompetitionRecord, SeasonRecord, InternationalCompetition, InternationalSeasonRecord, ChampionshipRankingRecord, BestPlayerAwardRecord, WorldCupRecord, PlayerRecord, SeasonAwardsHistoryRecord } from '../models';
import { UniverseService } from './universe.service';

@Injectable({ providedIn: 'root' })
export class SeasonService {
  universeService = inject(UniverseService);

  public startNewSeason(): void {
    this.universeService.gamePhase.set('regular_season');

    const mostUpToDateTeamsMap = this.getConsolidatedTeamsAtSeasonEnd();
    const leaguesAtSeasonEnd = this.universeService.leagues();
    const internationalCompsAtSeasonEnd = this.universeService.internationalCompetitions();

    const newLeagueTeamArrangements = new Map<string, Team[]>();

    leaguesAtSeasonEnd.forEach((league: League) => {
      const getTeamsFromMap = (teamList: Team[]): Team[] => {
        return teamList.map(t => {
          const updatedTeam = mostUpToDateTeamsMap.get(t.id);
          if (!updatedTeam) {
            console.error(`CRITICAL: Team ${t.teamName} (ID: ${t.id}) not found in master map during P/R. This indicates a data consistency issue.`);
            return t;
          }
          return updatedTeam;
        });
      };

      const divCount = league.divisions.length;
      if (divCount === 0) {
        newLeagueTeamArrangements.set(league.countryId, []);
        return;
      }

      const getSwapCount = (idx: number) => {
        if (idx < 0 || idx >= league.divisions.length) return 0;
        const div = league.divisions[idx];
        if (div.relegationSlots !== undefined) return div.relegationSlots;
        return Math.min(3, Math.floor(div.teams.length / 4)) || 1;
      };

      // Helper robusto de ordenação por mérito (Pontos > Saldo > Gols)
      const sortByMerit = (a: Team, b: Team) => {
        const ptsA = a.stats?.points ?? 0;
        const ptsB = b.stats?.points ?? 0;
        if (ptsA !== ptsB) return ptsB - ptsA;
        const gdA = (a.stats?.goalsFor ?? 0) - (a.stats?.goalsAgainst ?? 0);
        const gdB = (b.stats?.goalsFor ?? 0) - (b.stats?.goalsAgainst ?? 0);
        if (gdA !== gdB) return gdB - gdA;
        return (b.stats?.goalsFor ?? 0) - (a.stats?.goalsFor ?? 0);
      };

      let finalTeamListForNextSeason: Team[] = [];

      if (league.countryId === 'BRA') {
        // snapshot das divisões com auditoria de pontos
        const snapshot = league.divisions.map((div, dIdx) => {
          // Ordenar diretamente os times que estavam jogando na divisão
          const sorted = [...div.teams].sort(sortByMerit);
          
          console.log(`[AUDITORIA PONTOS] Divisão ${dIdx}: Top=${sorted[0]?.teamName}(${sorted[0]?.stats?.points}pts), Bottom=${sorted[sorted.length-1]?.teamName}(${sorted[sorted.length-1]?.stats?.points}pts)`);
          
          return sorted;
        });

        const finalDivisions: Team[][] = [];
        console.log(`\n🇧🇷 --- AUDITORIA DE TRANSIÇÃO: BRASIL (Temporada ${this.universeService.season()}) ---`);

        // 1. Processar Séries A, B e C (Symmetrical 4-down/4-up)
        for (let i = 0; i < 3; i++) {
          const divName = league.divisions[i].name;
          const swap = league.divisions[i].relegationSlots ?? 4;
          
          const relegated = snapshot[i].slice(-swap);
          const promoted = snapshot[i+1].slice(0, swap);

          console.log(`[${divName}] Rebaixando: ${relegated.map(t => t.teamName).join(', ')}`);
          console.log(`[${divName}] Promovendo de baixo: ${promoted.map(t => t.teamName).join(', ')}`);

          const stayers = (i === 0) 
            ? snapshot[0].slice(0, snapshot[0].length - swap)
            : snapshot[i].slice(getSwapCount(i-1), snapshot[i].length - swap);

          const arrivalsFromAbove = (i > 0) ? snapshot[i-1].slice(-(league.divisions[i-1].relegationSlots ?? 4)) : [];
          const arrivalsFromBelow = promoted;

          finalDivisions[i] = [...stayers, ...arrivalsFromAbove, ...arrivalsFromBelow];
          console.log(`[${divName}] Nova formação: ${finalDivisions[i].length} times.`);
        }

        // 2. Processar Série D (Acesso da Série E é especial)
        const swapC = league.divisions[2].relegationSlots ?? 4;
        const swapD = league.divisions[3].relegationSlots ?? 4;
        
        let promotedFromE: Team[] = [];
        if (league.divisions.length === 8) {
          if (league.leagueCup && league.leagueCup.rounds.length >= 3) {
            const semiMatches = league.leagueCup.rounds.find(r => r.name.includes('Semifinais'))?.matches || [];
            semiMatches.forEach(m => {
              if (m.homeTeam) promotedFromE.push(mostUpToDateTeamsMap.get(m.homeTeam.id)!);
              if (m.awayTeam) promotedFromE.push(mostUpToDateTeamsMap.get(m.awayTeam.id)!);
            });
          }
          if (promotedFromE.length < 4) {
            promotedFromE = [snapshot[4][0], snapshot[5][0], snapshot[6][0], snapshot[7][0]];
          }
        }

        console.log(`[Série D] Promovendo da Série E: ${promotedFromE.map(t => t.teamName).join(', ')}`);
        const relegatedD = snapshot[3].slice(-swapD);
        console.log(`[Série D] Rebaixando para Série E: ${relegatedD.map(t => t.teamName).join(', ')}`);

        const stayersD = snapshot[3].slice(swapC, snapshot[3].length - swapD);
        const arrivalsFromC = snapshot[2].slice(-swapC);
        finalDivisions[3] = [...stayersD, ...arrivalsFromC, ...promotedFromE];

        // 3. Processar Série E (Módulos 4-7)
        if (league.divisions.length === 8) {
          const relegatedFromD = snapshot[3].slice(-swapD);
          const eModules = [snapshot[4], snapshot[5], snapshot[6], snapshot[7]];
          
          for (let m = 0; m < 4; m++) {
            const moduleIdx = 4 + m;
            const remainingInModule = eModules[m].filter(t => !promotedFromE.map(p => p.id).includes(t.id));
            const arrivals = relegatedFromD[m] ? [relegatedFromD[m]] : [];
            finalDivisions[moduleIdx] = [...remainingInModule, ...arrivals];
          }
        }

        console.log(`🇧🇷 --- FIM DA AUDITORIA BRASIL ---\n`);

        // --- GUARDA DE DUPLICIDADE: Limpeza e Resgate ---
        const allBrazilianTeams = snapshot.flat(); // Todos os 128 times originais
        const assignedIds = new Set<string>();
        const uniqueDivisions: Team[][] = [];

        finalDivisions.forEach((div, i) => {
          const uniqueDiv: Team[] = [];
          div.forEach(team => {
            if (!assignedIds.has(team.id)) {
              uniqueDiv.push(team);
              assignedIds.add(team.id);
            } else {
              console.warn(`⚠️ DUPLICIDADE: ${team.teamName} removido da divisão ${i}.`);
            }
          });
          uniqueDivisions[i] = uniqueDiv;
        });

        // Identificar times que "ficaram sem cadeira"
        const unassignedTeams = allBrazilianTeams.filter(t => !assignedIds.has(t.id));

        // Preencher buracos usando os times que ficaram de fora
        uniqueDivisions.forEach((div, i) => {
          const targetSize = i < 4 ? 20 : (snapshot[i]?.length || 10);
          while (div.length < targetSize && unassignedTeams.length > 0) {
            const rescuedTeam = unassignedTeams.shift()!;
            div.push(rescuedTeam);
            assignedIds.add(rescuedTeam.id);
            console.log(`✅ RESGATE: ${rescuedTeam.teamName} inserido na divisão ${i} para completar a liga.`);
          }
        });

        finalTeamListForNextSeason = uniqueDivisions.flat();
      } else if (divCount > 1) {
        // Lógica Customizada de Promoção e Rebaixamento por País
        // Snapshot original para consulta (ORDENADO POR PONTOS DIRETOS DA DIVISÃO)
        const snapshot = league.divisions.map(div => [...div.teams].sort(sortByMerit));
        const finalDivisions: Team[][] = [];

        for (let i = 0; i < snapshot.length; i++) {
          const currentDiv = snapshot[i];
          
          // Definição de fluxos para a Divisão [i]
          const relegateOutCount = (i < snapshot.length - 1) ? getSwapCount(i) : 0;
          const promoteOutCount = (i > 0) ? getSwapCount(i - 1) : 0;

          // 1. Quem FICA (Quem não subiu e nem desceu)
          const stayers = currentDiv.slice(promoteOutCount, currentDiv.length - relegateOutCount);

          // 2. Quem ENTRA vindo de cima (Rebaixados da i-1)
          const arrivalsFromAbove = (i > 0) ? snapshot[i-1].slice(-promoteOutCount) : [];

          // 3. Quem ENTRA vindo de baixo (Promovidos da i+1)
          const arrivalsFromBelow = (i < snapshot.length - 1) ? snapshot[i+1].slice(0, relegateOutCount) : [];

          // Montagem final da divisão i
          finalDivisions[i] = [...stayers, ...arrivalsFromAbove, ...arrivalsFromBelow];
          
          console.log(`[P/R GENERIC] Divisão ${i} (${league.countryId}): ${stayers.length} mantidos, ${arrivalsFromAbove.length} rebaixados, ${arrivalsFromBelow.length} promovidos.`);
        }
        
        finalTeamListForNextSeason = finalDivisions.flat();
      } else {
        finalTeamListForNextSeason = league.divisions.flatMap(d => getTeamsFromMap(d.teams));
      }

      newLeagueTeamArrangements.set(league.countryId, finalTeamListForNextSeason);
    });

    this.universeService.teams.set(Array.from(mostUpToDateTeamsMap.values()));

    // --- LIMPEZA DE ESTATÍSTICAS (SÓ OCORRE APÓS AS TROCAS) ---
    this.universeService.teams.update(teams => {
      teams.forEach(t => {
        t.stats = {
          matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
          goalsFor: 0, goalsAgainst: 0, points: 0
        };
        // Limpar também estatísticas de copas dos jogadores
        t.players.forEach(p => {
          p.stats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p.cupStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p.internationalStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p.worldCupStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p.worldCupQualifierStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p.youthStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
        });
      });
      return [...teams];
    });

    // Limpar histórico de jogos e transferências
    this.universeService.matchHistory.set([]);
    this.universeService.transferHistory.set([]);
    // ---------------------------------------------------------

    const newSeason = this.universeService.season();

    const newLeagues = leaguesAtSeasonEnd.map((league: League) => {
      const arrangement = newLeagueTeamArrangements.get(league.countryId);
      if (!arrangement) {
        return league;
      }
      const teamArrangementIds = arrangement.map(t => t.id);

      const finalTeamObjectsForNewLeague = teamArrangementIds.map(id => {
        return mostUpToDateTeamsMap.get(id);
      }).filter(t => t !== undefined) as Team[];

      return this.universeService.createLeague(league.countryId, finalTeamObjectsForNewLeague, league.history, league.rankings);
    });
    this.universeService.leagues.set(newLeagues);

    const oldIntCompData = new Map<string, { history: InternationalSeasonRecord[], rankings: ChampionshipRankingRecord[] }>();
    internationalCompsAtSeasonEnd.forEach((c: InternationalCompetition) => {
      if (!c.id.startsWith('WC_')) {
        oldIntCompData.set(c.id, { history: c.history || [], rankings: c.rankings || [] });
      }
    });

    this.universeService.setupInternationalCompetitions();
    this.universeService.internationalCompetitions.update(newlyCreatedComps => {
      return newlyCreatedComps.map(comp => {
        const oldData = oldIntCompData.get(comp.id);
        if (oldData) {
          return { ...comp, history: oldData.history, rankings: oldData.rankings };
        }
        return comp;
      });
    });
  }

  public getConsolidatedTeamsAtSeasonEnd(): Map<string, Team> {
    const mostUpToDateTeamsMap = new Map<string, Team>();
    
    // 1. PRIORIDADE: Pegar times das ligas (onde os pontos e gols estão ATUALIZADOS pela simulação)
    this.universeService.leagues().forEach(l => {
      l.divisions.forEach(d => {
        d.teams.forEach(t => {
          if (t) mostUpToDateTeamsMap.set(t.id, JSON.parse(JSON.stringify(t)));
        });
      });
    });

    // 2. FALLBACK: Pegar do sinal global para garantir que nenhum time (ex: sem liga) seja perdido
    this.universeService.teams().forEach(t => {
      if (t && !mostUpToDateTeamsMap.has(t.id)) {
        mostUpToDateTeamsMap.set(t.id, JSON.parse(JSON.stringify(t)));
      }
    });

    return mostUpToDateTeamsMap;
  }

  public calculateBestPlayerInTheWorld(): void {
    console.log('🏆 Temporada finalizada! Preparando resumo de campeões...');
    
    /* 
    if (typeof window !== 'undefined') {
      const app = (window as any).appComponent;
      if (app) {
        // Garantimos que a visão mude para o resumo da temporada
        // O template HTML usa isEndOfSeason() que depende do status do Mundial.
        app.view.set('continent_menu'); // Voltamos para o menu onde o resumo aparece
      }
    }
    */
  }
}