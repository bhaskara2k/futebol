import { Injectable, inject } from '@angular/core';
import { League, Team, Player, Division, Match, Cup, CupMatch, CupRound, SeasonRecord, ChampionshipRankings, PlayerRecord, CompetitionRecord, InternationalCompetition, Trophy, InternationalSeasonRecord, ChampionshipRankingRecord } from '../models';
import { UniverseService } from './universe.service';
import { SimulationService } from './simulation.service';
import { SeasonService } from './season.service';

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  universeService = inject(UniverseService);
  simulationService = inject(SimulationService);
  seasonService = inject(SeasonService);

  private readonly budgetRewards = {
    national_league: 30_000_000,
    national_cup: 20_000_000,
    international: 40_000_000,
    world: 50_000_000,
    lower_division: 0,
  };

  public getLeagueTrophyName(countryId: string): string {
    const names: { [key: string]: string } = {
      'BRA': 'Série A', 'ARG': 'Liga Profesional', 'ESP': 'La Liga', 'ENG': 'Premier League', 'ITA': 'Serie A', 'GER': 'Bundesliga', 'FRA': 'Ligue 1', 'POR': 'Primeira Liga', 'NED': 'Eredivisie', 'RUS': 'Russian Premier League', 'BEL': 'Jupiler Pro League', 'TUR': 'Süper Lig', 'MEX': 'Liga MX', 'USA': 'Conferência Leste', 'JPN': 'J1 League', 'KOR': 'K League 1', 'SAU': 'Saudi Pro League', 'AUS': 'A-League',
    };
    return names[countryId] || 'Campeonato Nacional';
  }

  public getCupTrophyName(countryId: string): string {
    const names: { [key: string]: string } = {
      'BRA': 'Copa do Brasil', 'ARG': 'Copa Argentina', 'ESP': 'Copa del Rey', 'ENG': 'FA Cup', 'ITA': 'Coppa Italia', 'GER': 'DFB-Pokal', 'FRA': 'Coupe de France', 'POR': 'Taça de Portugal', 'NED': 'KNVB Cup', 'RUS': 'Russian Cup', 'BEL': 'Belgian Cup', 'TUR': 'Turkish Cup', 'MEX': 'Copa MX', 'USA': 'US Open Cup', 'JPN': 'Emperor\'s Cup', 'KOR': 'FA Cup Coreia', 'SAU': 'King Cup', 'AUS': 'Australia Cup',
    };
    return names[countryId] || 'Copa Nacional';
  }

  public getLeagueCupTrophyName(countryId: string): string {
    const names: { [key: string]: string } = { 'ENG': 'EFL Cup', 'BRA': 'Série E Play-offs', 'USA': 'MLS Cup' };
    return names[countryId] || 'Copa da Liga';
  }

  public getSupercupTrophyName(countryId: string): string {
    const names: { [key: string]: string } = {
      'ENG': 'Community Shield', 'ESP': 'Supercopa de España', 'GER': 'DFL-Supercup', 'ITA': 'Supercoppa Italiana', 'FRA': 'Trophée des Champions', 'POR': 'Supertaça Cândido de Oliveira', 'NED': 'Johan Cruyff Shield', 'BRA': 'Supercopa do Brasil', 'ARG': 'Supercopa Argentina',
    };
    return names[countryId] || 'Supercopa Nacional';
  }

  public getTeamsByStanding(countryId: string, startIdx: number, count: number): Team[] {
    const league = this.universeService.leagues().find(l => l.countryId === countryId);
    if (!league) return [];
    const sortedTeams = [...league.divisions[0].teams].sort(this.universeService.sortTeams);
    return JSON.parse(JSON.stringify(sortedTeams.slice(startIdx, startIdx + count)));
  }

  public updatePlayerRankings(league: League): void {
    league.divisions.forEach(division => {
      const allPlayers: Player[] = division.teams.flatMap(t => t.players);
      division.topScorers = [...allPlayers].sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 10);
      division.topAssists = [...allPlayers].sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 10);
      division.topMotm = [...allPlayers].sort((a, b) => (b.stats.motm || 0) - (a.stats.motm || 0)).slice(0, 10);
    });
  }

  public determineCupRunnerUp(league: League) {
    const processCup = (cup?: Cup) => {
      if (!cup || !cup.champion) return;
      const final = cup.rounds.find(r => r.name === 'Final')?.matches[0];
      if (final) {
        cup.runnerUp = final.homeTeam.id === cup.champion.id ? final.awayTeam : final.homeTeam;
      }
    };
    processCup(league.cup);
    processCup(league.leagueCup);
    processCup(league.supercup);
  }

  public captureSeasonHistory(league: League): void {
    if (league.history.some(h => h.season === this.universeService.season())) {
      return;
    }
    const div1Standings = [...league.divisions[0].teams].sort(this.universeService.sortTeams);
    const div2Standings = league.divisions.length > 1 ? [...league.divisions[1].teams].sort(this.universeService.sortTeams) : [];
    const div3Standings = league.divisions.length > 2 ? [...league.divisions[2].teams].sort(this.universeService.sortTeams) : [];
    const div4Standings = league.divisions.length > 3 ? [...league.divisions[3].teams].sort(this.universeService.sortTeams) : [];
    const div5Standings = league.divisions.length > 4 ? [...league.divisions[4].teams].sort(this.universeService.sortTeams) : [];
    const div6Standings = league.divisions.length > 5 ? [...league.divisions[5].teams].sort(this.universeService.sortTeams) : [];
    const div7Standings = league.divisions.length > 6 ? [...league.divisions[6].teams].sort(this.universeService.sortTeams) : [];
    const div8Standings = league.divisions.length > 7 ? [...league.divisions[7].teams].sort(this.universeService.sortTeams) : [];

    const rCount = league.divisions[0].relegationSlots ?? 0;
    const pCount = (league.divisions.length > 1 && league.divisions[0].relegationSlots !== undefined) ? league.divisions[0].relegationSlots : 3;

    let relegated: Team[] = div1Standings.slice(-rCount);
    let promoted: Team[] = div2Standings.slice(0, pCount);

    const createPlayerRecord = (player: Player | undefined, teams: Team[], value?: number): PlayerRecord => {
      if (!player) return { player: null, teamName: null, value: 0 };
      const team = teams.find(t => t.players.some(p => p.id === player.id));
      const simplifiedPlayer = { id: player.id, name: player.name, overall: player.overall, isGoalkeeper: player.isGoalkeeper, nationalityId: player.nationalityId } as Player;
      return { player: simplifiedPlayer, teamName: team?.teamName || null, value: value || 0 };
    };

    const teamOfTheSeason: PlayerRecord[] = [];
    const allDiv1Players = div1Standings.flatMap(team => team.players.map(player => ({ player, teamName: team.teamName })));
    const goalkeepers = allDiv1Players.filter(p => p.player.isGoalkeeper).sort((a, b) => (b.player.stats.motm || 0) - (a.player.stats.motm || 0));
    if (goalkeepers.length > 0) teamOfTheSeason.push(createPlayerRecord(goalkeepers[0].player, div1Standings, goalkeepers[0].player.stats.motm));
    
    const performanceScore = (p: Player) => (p.stats.goals * 3) + (p.stats.assists * 2) + (p.stats.motm * 5);
    const outfieldPlayers = allDiv1Players.filter(p => !p.player.isGoalkeeper).sort((a, b) => performanceScore(b.player) - performanceScore(a.player));
    outfieldPlayers.slice(0, 10).forEach(p => teamOfTheSeason.push(createPlayerRecord(p.player, div1Standings, performanceScore(p.player))));

    const allTeamsInLeague = league.divisions.flatMap(d => d.teams);
    let leagueChampion = div1Standings[0];
    if (league.countryId === 'USA' && league.leagueCup?.champion) leagueChampion = allTeamsInLeague.find(t => t.id === league.leagueCup!.champion!.id) || leagueChampion;
    
    if (leagueChampion) this.addTrophyToTeam(leagueChampion, this.getLeagueTrophyName(league.countryId), 'national_league');
    if (league.cup.champion) {
      const fullChamp = allTeamsInLeague.find(t => t.id === league.cup.champion!.id);
      if (fullChamp) this.addTrophyToTeam(fullChamp, this.getCupTrophyName(league.countryId), 'national_cup');
    }

    const seasonRecord: SeasonRecord = {
      season: this.universeService.season(),
      division1: {
        name: league.divisions[0].name,
        champion: div1Standings[0] || null, runnerUp: div1Standings[1] || null,
        topScorer: createPlayerRecord(league.divisions[0].topScorers[0], div1Standings, league.divisions[0].topScorers[0]?.stats.goals),
        topAssister: createPlayerRecord(league.divisions[0].topAssists[0], div1Standings, league.divisions[0].topAssists[0]?.stats.assists),
        topMotm: createPlayerRecord(league.divisions[0].topMotm[0], div1Standings, league.divisions[0].topMotm[0]?.stats.motm),
      },
      cup: {
        name: this.getCupTrophyName(league.countryId),
        champion: league.cup.champion || null, runnerUp: league.cup.runnerUp || null,
        topScorer: createPlayerRecord(league.cup.topScorers[0], allTeamsInLeague, league.cup.topScorers[0]?.cupStats.goals),
        topAssister: createPlayerRecord(league.cup.topAssists[0], allTeamsInLeague, league.cup.topAssists[0]?.cupStats.assists),
        topMotm: createPlayerRecord(league.cup.topMotm[0], allTeamsInLeague, league.cup.topMotm[0]?.cupStats.motm),
      },
      promotedTeams: promoted.map(t => t.teamName),
      relegatedTeams: relegated.map(t => t.teamName),
      teamOfTheSeason
    };

    const fillDivisionRecord = (divIdx: number, standings: Team[]): CompetitionRecord | undefined => {
      if (!league.divisions[divIdx] || standings.length === 0) return undefined;
      const div = league.divisions[divIdx];
      return {
        name: div.name, champion: standings[0] || null, runnerUp: standings[1] || null,
        topScorer: createPlayerRecord(div.topScorers[0], standings, div.topScorers[0]?.stats.goals),
        topAssister: createPlayerRecord(div.topAssists[0], standings, div.topAssists[0]?.stats.assists),
        topMotm: createPlayerRecord(div.topMotm[0], standings, div.topMotm[0]?.stats.motm),
      };
    };

    seasonRecord.division2 = fillDivisionRecord(1, div2Standings);
    seasonRecord.division3 = fillDivisionRecord(2, div3Standings);
    seasonRecord.division4 = fillDivisionRecord(3, div4Standings);
    seasonRecord.division5 = fillDivisionRecord(4, div5Standings);
    seasonRecord.division6 = fillDivisionRecord(5, div6Standings);
    seasonRecord.division7 = fillDivisionRecord(6, div7Standings);
    seasonRecord.division8 = fillDivisionRecord(7, div8Standings);

    // Registrar troféus para campeões de divisões inferiores
    // (necessário pois o Hall da Fama lê os troféus dos times, não o seasonRecord)
    if (seasonRecord.division2?.champion && league.countryId !== 'USA') {
      this.addTrophyToTeam(seasonRecord.division2.champion, seasonRecord.division2.name, 'lower_division');
    }
    if (seasonRecord.division3?.champion) {
      this.addTrophyToTeam(seasonRecord.division3.champion, seasonRecord.division3.name, 'lower_division');
    }
    if (seasonRecord.division4?.champion) {
      this.addTrophyToTeam(seasonRecord.division4.champion, seasonRecord.division4.name, 'lower_division');
    }
    if (seasonRecord.division5?.champion) {
      this.addTrophyToTeam(seasonRecord.division5.champion, seasonRecord.division5.name, 'lower_division');
    }
    if (seasonRecord.division6?.champion) {
      this.addTrophyToTeam(seasonRecord.division6.champion, seasonRecord.division6.name, 'lower_division');
    }
    if (seasonRecord.division7?.champion) {
      this.addTrophyToTeam(seasonRecord.division7.champion, seasonRecord.division7.name, 'lower_division');
    }
    if (seasonRecord.division8?.champion) {
      this.addTrophyToTeam(seasonRecord.division8.champion, seasonRecord.division8.name, 'lower_division');
    }

    if (league.leagueCup?.champion) {
      const name = this.getLeagueCupTrophyName(league.countryId);
      const fullChamp = allTeamsInLeague.find(t => t.id === league.leagueCup.champion.id);
      if (fullChamp) this.addTrophyToTeam(fullChamp, name, 'national_cup');
      seasonRecord.leagueCup = {
        name, champion: league.leagueCup.champion, runnerUp: league.leagueCup.runnerUp || null,
        topScorer: createPlayerRecord(league.leagueCup.topScorers[0], allTeamsInLeague, league.leagueCup.topScorers[0]?.cupStats.goals),
        topAssister: createPlayerRecord(league.leagueCup.topAssists[0], allTeamsInLeague, league.leagueCup.topAssists[0]?.cupStats.assists),
        topMotm: createPlayerRecord(league.leagueCup.topMotm[0], allTeamsInLeague, league.leagueCup.topMotm[0]?.cupStats.motm),
      };
    }

    if (league.supercup?.champion) {
      const name = this.getSupercupTrophyName(league.countryId);
      const fullChamp = allTeamsInLeague.find(t => t.id === league.supercup.champion.id);
      if (fullChamp) this.addTrophyToTeam(fullChamp, name, 'national_cup');
      seasonRecord.supercup = {
        name, champion: league.supercup.champion, runnerUp: league.supercup.runnerUp || null,
        topScorer: createPlayerRecord(league.supercup.topScorers[0], allTeamsInLeague, league.supercup.topScorers[0]?.cupStats.goals),
        topAssister: createPlayerRecord(league.supercup.topAssists[0], allTeamsInLeague, league.supercup.topAssists[0]?.cupStats.assists),
        topMotm: createPlayerRecord(league.supercup.topMotm[0], allTeamsInLeague, league.supercup.topMotm[0]?.cupStats.motm),
      };
    }

    league.history.unshift(seasonRecord);

    // Inicializa arrays de ranking apenas para divisões/competições que existem
    if (league.divisions[1] && !league.rankings.division2) league.rankings.division2 = [];
    if (league.divisions[2] && !league.rankings.division3) league.rankings.division3 = [];
    if (league.divisions[3] && !league.rankings.division4) league.rankings.division4 = [];
    if (league.divisions[4] && !league.rankings.division5) league.rankings.division5 = [];
    if (league.divisions[5] && !league.rankings.division6) league.rankings.division6 = [];
    if (league.divisions[6] && !league.rankings.division7) league.rankings.division7 = [];
    if (league.divisions[7] && !league.rankings.division8) league.rankings.division8 = [];
    if (league.leagueCup && !league.rankings.leagueCup) league.rankings.leagueCup = [];
    if (league.supercup && !league.rankings.supercup) league.rankings.supercup = [];

    this.updateChampionshipRankings(league.rankings.division1, seasonRecord.division1.champion);
    if (seasonRecord.division2) this.updateChampionshipRankings(league.rankings.division2, seasonRecord.division2.champion);
    if (seasonRecord.division3) this.updateChampionshipRankings(league.rankings.division3, seasonRecord.division3.champion);
    if (seasonRecord.division4) this.updateChampionshipRankings(league.rankings.division4, seasonRecord.division4.champion);
    if (seasonRecord.division5) this.updateChampionshipRankings(league.rankings.division5, seasonRecord.division5.champion);
    if (seasonRecord.division6) this.updateChampionshipRankings(league.rankings.division6, seasonRecord.division6.champion);
    if (seasonRecord.division7) this.updateChampionshipRankings(league.rankings.division7, seasonRecord.division7.champion);
    if (seasonRecord.division8) this.updateChampionshipRankings(league.rankings.division8, seasonRecord.division8.champion);
    this.updateChampionshipRankings(league.rankings.cup, seasonRecord.cup.champion);
    if (seasonRecord.leagueCup) this.updateChampionshipRankings(league.rankings.leagueCup, seasonRecord.leagueCup.champion);
    if (seasonRecord.supercup) this.updateChampionshipRankings(league.rankings.supercup, seasonRecord.supercup.champion);
  }

  public addTrophyToTeam(team: Team, trophyName: string, trophyType: Trophy['type']) {
    if (!team) return;
    
    // Atualiza o objeto diretamente para que a referência na liga/divisão receba o troféu
    if (!team.trophies) team.trophies = [];
    const existing = team.trophies.find(t => t.name === trophyName);
    if (existing) {
      existing.count++;
    } else {
      team.trophies.push({ name: trophyName, count: 1, type: trophyType });
    }
    team.budget += (this.budgetRewards[trophyType] || 0);

    // Sincroniza com o sinal global para persistência
    this.universeService.teams.update(teams => [...teams]);
  }

  public updateChampionshipRankings(ranking: ChampionshipRankingRecord[] | undefined, champion: Team | null) {
    if (!champion || !ranking) return;
    const existing = ranking.find(r => r.team.id === champion.id);
    if (existing) existing.count++; else ranking.push({ team: { id: champion.id, teamName: champion.teamName, countryId: champion.countryId, logoUrl: champion.logoUrl }, count: 1 });
  }

  public advanceCupRound(league: League, cupType: 'main' | 'league' | 'supercup' = 'main'): void {
    const cup = cupType === 'league' ? league.leagueCup : cupType === 'supercup' ? league.supercup : league.cup;
    if (!cup) return;
    let lastRoundIdx = -1;
    for (let i = 0; i < cup.rounds.length; i++) {
      if (cup.rounds[i].matches.length > 0 && cup.rounds[i].matches.every(m => m.played)) lastRoundIdx = i;
      else if (cup.rounds[i].matches.length > 0) break;
    }
    if (lastRoundIdx === -1 || lastRoundIdx >= cup.rounds.length - 1) return;
    const nextRound = cup.rounds[lastRoundIdx + 1];
    if (nextRound.matches.length > 0) return;
    const allTeams = league.divisions.flatMap(d => d.teams);
    const winners = cup.rounds[lastRoundIdx].matches.map(m => allTeams.find(t => t.id === (m.aggregateWinnerId || m.winner?.id))!).filter(Boolean);
    
    // Seed byes if needed (simple logic)
    if (cup.rounds[lastRoundIdx].name === 'Fase Preliminar') {
       const allSorted = allTeams.sort((a,b) => b.overall - a.overall);
       const target = nextRound.name === 'Oitavas de Final' ? 16 : 8;
       winners.push(...allSorted.slice(0, target - winners.length));
    }

    for (let i = winners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [winners[i], winners[j]] = [winners[j], winners[i]];
    }
    for (let i = 0; i < winners.length / 2; i++) {
      nextRound.matches.push({ id: `cup-${Date.now()}-${i}`, homeTeam: winners[i * 2], awayTeam: winners[i * 2 + 1], played: false, leg1Played: false, leg2Played: false });
    }
  }

  public generatePlayoffs(league: League): Cup {
    const rounds: CupRound[] = [
      { name: 'Oitavas de Final', matches: [] }, { name: 'Quartas de Final', matches: [] }, { name: 'Semifinais', matches: [] }, { name: 'Final', matches: [] }
    ];
    let playoffTeams: Team[] = [];
    if (league.countryId === 'BRA') {
      for (let i = 4; i < 8; i++) {
        if (league.divisions[i] && league.divisions[i].teams.length > 0) {
          playoffTeams.push(...[...league.divisions[i].teams].sort(this.universeService.sortTeams).slice(0, 4));
        } else {
          console.warn(`[generatePlayoffs] BRA: divisão ${i} não encontrada ou sem times`);
        }
      }
    } else if (league.countryId === 'USA') {
      playoffTeams.push(...[...league.divisions[0].teams].sort(this.universeService.sortTeams).slice(0, 8));
      playoffTeams.push(...[...league.divisions[1].teams].sort(this.universeService.sortTeams).slice(0, 8));
    }

    if (playoffTeams.length < 2) {
      console.error(`[generatePlayoffs] Não foi possível gerar playoffs para ${league.countryId}: apenas ${playoffTeams.length} times encontrados`);
      return { rounds, topScorers: [], topAssists: [], topMotm: [] };
    }

    for (let i = 0; i < Math.floor(playoffTeams.length / 2); i++) {
      rounds[0].matches.push({ id: `po-${Date.now()}-${i}`, homeTeam: playoffTeams[i * 2], awayTeam: playoffTeams[i * 2 + 1], played: false, leg1Played: false, leg2Played: false });
    }
    return { rounds, topScorers: [], topAssists: [], topMotm: [] };
  }

  public updateCupPlayerRankings(league: League, cupType: 'main' | 'league' | 'supercup' = 'main'): void {
    const cup = cupType === 'league' ? league.leagueCup : cupType === 'supercup' ? league.supercup : league.cup;
    if (!cup) return;
    const players = league.divisions.flatMap(d => d.teams).flatMap(t => t.players);
    cup.topScorers = [...players].sort((a, b) => b.cupStats.goals - a.cupStats.goals).slice(0, 10);
    cup.topAssists = [...players].sort((a, b) => b.cupStats.assists - a.cupStats.assists).slice(0, 10);
    cup.topMotm = [...players].sort((a, b) => (b.cupStats.motm || 0) - (a.cupStats.motm || 0)).slice(0, 10);
  }
}
