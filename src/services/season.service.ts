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

      let finalTeamListForNextSeason: Team[] = [];

      if (league.countryId === 'BRA' && divCount === 8) {
        const d1s = [...getTeamsFromMap(league.divisions[0].teams)].sort(this.universeService.sortTeams);
        const d2s = [...getTeamsFromMap(league.divisions[1].teams)].sort(this.universeService.sortTeams);
        const d3s = [...getTeamsFromMap(league.divisions[2].teams)].sort(this.universeService.sortTeams);
        const d4s = [...getTeamsFromMap(league.divisions[3].teams)].sort(this.universeService.sortTeams);
        
        const m1s = [...getTeamsFromMap(league.divisions[4].teams)].sort(this.universeService.sortTeams);
        const m2s = [...getTeamsFromMap(league.divisions[5].teams)].sort(this.universeService.sortTeams);
        const m3s = [...getTeamsFromMap(league.divisions[6].teams)].sort(this.universeService.sortTeams);
        const m4s = [...getTeamsFromMap(league.divisions[7].teams)].sort(this.universeService.sortTeams);

        const swapA = league.divisions[0].relegationSlots ?? 4;
        const swapB = league.divisions[1].relegationSlots ?? 4;
        const swapC = league.divisions[2].relegationSlots ?? 4;
        const swapD = league.divisions[3].relegationSlots ?? 4;

        const relegatedFromA = d1s.slice(-swapA);
        const promotedFromB = d2s.slice(0, swapA);
        const relegatedFromB = d2s.slice(-swapB);
        const promotedFromC = d3s.slice(0, swapB);
        const relegatedFromC = d3s.slice(-swapC);
        const promotedFromD = d4s.slice(0, swapC);
        const relegatedFromD = d4s.slice(-swapD);
        
        let promotedFromE: Team[] = [];
        if (league.leagueCup && league.leagueCup.rounds.length >= 3) {
          const semiMatches = league.leagueCup.rounds.find(r => r.name.includes('Semifinais'))?.matches || [];
          semiMatches.forEach(m => {
            if (m.homeTeam) promotedFromE.push(mostUpToDateTeamsMap.get(m.homeTeam.id)!);
            if (m.awayTeam) promotedFromE.push(mostUpToDateTeamsMap.get(m.awayTeam.id)!);
          });
        }

        if (promotedFromE.length < 4) {
          promotedFromE = [m1s[0], m2s[0], m3s[0], m4s[0]];
        }

        const newD1Teams = [...d1s.slice(0, d1s.length - swapA), ...promotedFromB];
        const newD2Teams = [...d2s.slice(swapA, d2s.length - swapB), ...relegatedFromA, ...promotedFromC];
        const newD3Teams = [...d3s.slice(swapB, d3s.length - swapC), ...relegatedFromB, ...promotedFromD];
        const newD4Teams = [...d4s.slice(swapC, d4s.length - swapD), ...relegatedFromC, ...promotedFromE];

        const allRemainingETeams = [
          ...m1s.filter(t => !promotedFromE.includes(t)),
          ...m2s.filter(t => !promotedFromE.includes(t)),
          ...m3s.filter(t => !promotedFromE.includes(t)),
          ...m4s.filter(t => !promotedFromE.includes(t)),
          ...relegatedFromD
        ];

        finalTeamListForNextSeason = [...newD1Teams, ...newD2Teams, ...newD3Teams, ...newD4Teams, ...allRemainingETeams];

      } else if (league.countryId === 'BRA' && divCount === 4) {
        const d1s = [...getTeamsFromMap(league.divisions[0].teams)].sort(this.universeService.sortTeams);
        const d2s = [...getTeamsFromMap(league.divisions[1].teams)].sort(this.universeService.sortTeams);
        const d3s = [...getTeamsFromMap(league.divisions[2].teams)].sort(this.universeService.sortTeams);
        const swapA = league.divisions[0].relegationSlots ?? 4;
        const swapB = league.divisions[1].relegationSlots ?? 4;

        const relegatedFromA = d1s.slice(-swapA);
        const promotedFromB = d2s.slice(0, swapA);
        const relegatedFromB = d2s.slice(-swapB); 
        const promotedFromC = d3s.slice(0, swapB);   

        const newD1Teams = [...d1s.slice(0, d1s.length - swapA), ...promotedFromB];
        const newD2Teams = [...d2s.slice(swapA, d2s.length - swapB), ...relegatedFromA, ...promotedFromC];
        const newD3Teams = [...d3s.slice(swapB), ...relegatedFromB];

        finalTeamListForNextSeason = [...newD1Teams, ...newD2Teams, ...newD3Teams];

      } else if (divCount > 1) {
        // Lógica Customizada de Promoção e Rebaixamento por País
        const divisions = league.divisions.map(d => [...getTeamsFromMap(d.teams)].sort(this.universeService.sortTeams));
        
        // Define o número de vagas baseado no país (respeitando a realidade)
        const getSwapCount = (div: Division) => {
          if (div.relegationSlots !== undefined) return div.relegationSlots;
          
          // Fallback dinâmico apenas se não estiver definido
          return Math.min(3, Math.floor(div.teams.length / 4)) || 1;
        };

        for (let i = 0; i < divisions.length - 1; i++) {
          const upperDiv = divisions[i];
          const lowerDiv = divisions[i + 1];
          
          const numToSwap = getSwapCount(league.divisions[i]);
          
          if (numToSwap > 0) {
            const relegated = upperDiv.splice(upperDiv.length - numToSwap, numToSwap);
            const promoted = lowerDiv.splice(0, numToSwap);
            
            upperDiv.push(...promoted);
            lowerDiv.push(...relegated);
          }
        }
        
        finalTeamListForNextSeason = divisions.flat();
      } else {
        finalTeamListForNextSeason = league.divisions.flatMap(d => getTeamsFromMap(d.teams));
      }

      newLeagueTeamArrangements.set(league.countryId, finalTeamListForNextSeason);
    });

    this.universeService.teams.set(Array.from(mostUpToDateTeamsMap.values()));

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
    const teams = this.universeService.teams();
    const mostUpToDateTeamsMap = new Map<string, Team>();
    
    // Agora pegamos diretamente do sinal de times, que é onde a evolução acontece
    teams.forEach(t => {
      if (t) mostUpToDateTeamsMap.set(t.id, JSON.parse(JSON.stringify(t)));
    });

    return mostUpToDateTeamsMap;
  }

  public calculateBestPlayerInTheWorld(): void {
    // Player system disabled
  }
}