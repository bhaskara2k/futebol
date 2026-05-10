
import { Injectable, inject } from '@angular/core';
import { League, Team, Player, Division, Match, Cup, CupMatch, CupRound, SeasonRecord, ChampionshipRankings, PlayerRecord, CompetitionRecord, Trophy, ChampionshipRankingRecord } from '../models';
import { UniverseService } from './universe.service';
import { SimulationService } from './simulation.service';
import { SeasonService } from './season.service';
import { CompetitionService } from './competition.service';

@Injectable({ providedIn: 'root' })
export class NationalCompetitionService {
  universeService = inject(UniverseService);
  simulationService = inject(SimulationService);
  seasonService = inject(SeasonService);
  // FIX: Injected competition service to use its shared methods.
  competitionService = inject(CompetitionService);
  private _isSimulatingMassive = false;

  // Otimizado: Remove Deep Clone massivo (JSON.parse/stringify) e aplica Shallow Clone cirúrgico
  public async simulateLeagueMatch(countryId: string, matchId: string): Promise<void> {
    this.universeService.leagues.update(currentLeagues => {
      const leagueIndex = currentLeagues.findIndex(l => l.countryId === countryId);
      if (leagueIndex === -1) return currentLeagues;

      const league = { ...currentLeagues[leagueIndex] };
      league.divisions = [...league.divisions];

      for (let i = 0; i < league.divisions.length; i++) {
        const div = league.divisions[i];
        const roundFixtures = div.fixtures[league.currentRound];
        const match = roundFixtures?.find((m: Match) => m.id === matchId);

        if (match && !match.played) {
          const newDivision = { ...div };
          this.simulationService.simulateMatch(match, newDivision);
          league.divisions[i] = newDivision;
          break;
        }
      }

      currentLeagues[leagueIndex] = league;
      this.competitionService.updatePlayerRankings(league);
      return [...currentLeagues];
    });
  }

  public async setLeagueMatchResult(countryId: string, matchId: string, homeGoals: number, awayGoals: number): Promise<void> {
    this.universeService.leagues.update(currentLeagues => {
      const leagueIndex = currentLeagues.findIndex(l => l.countryId === countryId);
      if (leagueIndex === -1) return currentLeagues;

      const league = { ...currentLeagues[leagueIndex] };
      league.divisions = [...league.divisions];

      for (let i = 0; i < league.divisions.length; i++) {
        const div = league.divisions[i];
        const roundFixtures = div.fixtures[league.currentRound];
        const match = roundFixtures?.find((m: Match) => m.id === matchId);

        if (match && !match.played) {
          const newDivision = { ...div };
          this.simulationService.recordMatchResult(match, newDivision, homeGoals, awayGoals);
          
          // Force reference change to trigger UI update
          const updatedMatch = { ...match };
          const roundIdx = league.currentRound;
          newDivision.fixtures = [...div.fixtures];
          newDivision.fixtures[roundIdx] = [...div.fixtures[roundIdx]];
          const matchIdx = newDivision.fixtures[roundIdx].findIndex(m => m.id === matchId);
          if (matchIdx !== -1) {
            newDivision.fixtures[roundIdx][matchIdx] = updatedMatch;
          }

          league.divisions[i] = newDivision;
          break;
        }
      }

      currentLeagues[leagueIndex] = league;
      this.competitionService.updatePlayerRankings(league);
      return [...currentLeagues];
    });
  }

  // Otimizado: Remove Deep Clone massivo + Shallow Clone
  public async simulateDivisionRound(countryId: string, divisionIndex: number): Promise<void> {
    const leagues = this.universeService.leagues();
    const leagueIndex = leagues.findIndex(l => l.countryId === countryId);
    if (leagueIndex === -1) return;

    // Criamos um clone profundo para trabalhar na simulação sem mutar o sinal prematuramente
    const league = JSON.parse(JSON.stringify(leagues[leagueIndex]));

    if (league.status === 'finished' || league.status === 'waiting_international') {
      return;
    }

    const division = league.divisions[divisionIndex];
    const roundFixtures = division.fixtures[league.currentRound];

    if (roundFixtures) {
      for (const match of roundFixtures) {
        if (!match.played) {
          // A simulação é rápida, mas pode ser async. Aguardamos cada uma.
          await this.simulationService.simulateMatch(match, division);
        }
      }
    }

    // Atualizamos os rankings de jogadores após as simulações
    this.competitionService.updatePlayerRankings(league);

    // Agora atualizamos o sinal global com a liga simulada
    this.universeService.leagues.update(currentLeagues => {
      const newLeagues = [...currentLeagues];
      newLeagues[leagueIndex] = league;
      return newLeagues;
    });
  }

  public advanceToNextRound(countryId: string): void {
    this.universeService.leagues.update(leagues => {
      const leagueIndex = leagues.findIndex(l => l.countryId === countryId);
      if (leagueIndex === -1) return leagues;

      // Mutação controlada (Shallow Clone)
      const league = { ...leagues[leagueIndex] };

      league.currentRound++;

      if (league.currentRound >= league.totalRounds) {
        if ((league.countryId === 'USA' || league.countryId === 'BRA') && (!league.leagueCup || !league.leagueCup.champion)) {
          // Gera playoffs se não existir ou se a primeira rodada não tiver partidas
          const hasMatches = league.leagueCup?.rounds?.[0]?.matches?.length > 0;
          if (!league.leagueCup || !hasMatches) {
            league.leagueCup = this.competitionService.generatePlayoffs(league);
          }
          if (league.leagueCup && league.leagueCup.champion) {
            league.status = 'waiting_international';
          } else if (league.leagueCup && league.leagueCup.rounds[0]?.matches?.length > 0) {
             // Mantém ongoing para jogar os playoffs
             league.status = 'ongoing';
          } else {
            league.status = 'waiting_international';
          }
        } else {
          league.status = 'waiting_international';
        }

        if (league.status === 'waiting_international') {
          this.competitionService.determineCupRunnerUp(league);
          if (!league.history.some((h: SeasonRecord) => h.season === this.universeService.season())) {
            this.competitionService.captureSeasonHistory(league);
          }
        }
      }

      // Atualiza referência no array
      leagues[leagueIndex] = league;

      return [...leagues];
    });
  }

  public simulateCupMatch(leagueId: string, matchId: string, roundName: string, leg: 1 | 2, cupType: 'main' | 'league' | 'supercup' = 'main') {
    this.universeService.leagues.update(leagues => {
      const leagueIndex = leagues.findIndex(l => l.countryId === leagueId);
      if (leagueIndex === -1) return leagues;

      const league = { ...leagues[leagueIndex] };
      
      // Clone a Copa específica
      if (cupType === 'main') league.cup = { ...league.cup };
      else if (cupType === 'league') league.leagueCup = { ...league.leagueCup! };
      else if (cupType === 'supercup') league.supercup = { ...league.supercup! };

      const cupToSim = cupType === 'league' ? league.leagueCup! : (cupType === 'supercup' ? league.supercup! : league.cup);
      cupToSim.rounds = [...cupToSim.rounds];
      
      const roundIndex = cupToSim.rounds.findIndex(r => r.name === roundName);
      if (roundIndex === -1) return leagues;
      
      const round = { ...cupToSim.rounds[roundIndex] };
      round.matches = [...round.matches];
      cupToSim.rounds[roundIndex] = round;

      const matchIndex = round.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return leagues;

      const match = { ...round.matches[matchIndex] };
      round.matches[matchIndex] = match;

      const homeTeam = league.divisions.flatMap(d => d.teams).find(t => t.id === match.homeTeam.id)!;
      const awayTeam = league.divisions.flatMap(d => d.teams).find(t => t.id === match.awayTeam.id)!;
      const isNationalTeamMatch = homeTeam.budget === 0;

      this.simulationService.simulateSingleCupLeg(
        match,
        roundName,
        leg,
        league,
        league.divisions.flatMap(d => d.teams),
        this.competitionService.addTrophyToTeam.bind(this.competitionService),
        (l: League) => {
          if (cupType === 'main') this.competitionService.updateChampionshipRankings(l.rankings.cup, l.cup.champion);
          else if (cupType === 'league') this.competitionService.updateChampionshipRankings(l.rankings.leagueCup, l.leagueCup?.champion);
          else if (cupType === 'supercup') this.competitionService.updateChampionshipRankings(l.rankings.supercup, l.supercup?.champion);
        },
        () => { },
        cupType
      );

      this.competitionService.advanceCupRound(league, cupType);
      
      const newLeagues = [...leagues];
      newLeagues[leagueIndex] = league;
      return newLeagues;
    });
  }

  public setCupMatchResult(leagueId: string, matchId: string, roundName: string, leg: 1 | 2, homeGoals: number, awayGoals: number, cupType: 'main' | 'league' | 'supercup' = 'main') {
    this.universeService.leagues.update(leagues => {
      const leagueIndex = leagues.findIndex(l => l.countryId === leagueId);
      if (leagueIndex === -1) return leagues;

      const league = { ...leagues[leagueIndex] };
      
      // Clone the specific cup type
      if (cupType === 'main') league.cup = { ...league.cup };
      else if (cupType === 'league') league.leagueCup = { ...league.leagueCup! };
      else if (cupType === 'supercup') league.supercup = { ...league.supercup! };

      const cupToSim = cupType === 'league' ? league.leagueCup! : (cupType === 'supercup' ? league.supercup! : league.cup);
      cupToSim.rounds = [...cupToSim.rounds];
      
      const roundIndex = cupToSim.rounds.findIndex(r => r.name === roundName);
      if (roundIndex === -1) return leagues;
      
      const round = { ...cupToSim.rounds[roundIndex] };
      round.matches = [...round.matches];
      cupToSim.rounds[roundIndex] = round;

      const matchIndex = round.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return leagues;

      const match = { ...round.matches[matchIndex] };
      round.matches[matchIndex] = match;

      const homeTeam = league.divisions.flatMap(d => d.teams).find(t => t.id === match.homeTeam.id)!;
      const awayTeam = league.divisions.flatMap(d => d.teams).find(t => t.id === match.awayTeam.id)!;
      const isNationalTeamMatch = homeTeam.budget === 0;

      this.simulationService.recordCupMatchResult(
        match,
        roundName,
        leg,
        league,
        homeGoals,
        awayGoals,
        'cupStats',
        league.countryId,
        "Copa Nacional",
        homeTeam,
        awayTeam,
        isNationalTeamMatch,
        cupType
      );

      // Atualiza Ranking se for Final
      if (match.winner && (roundName === 'Final' || cupType === 'supercup')) {
        if (cupType === 'main') this.competitionService.updateChampionshipRankings(league.rankings.cup, league.cup.champion);
        else if (cupType === 'league') this.competitionService.updateChampionshipRankings(league.rankings.leagueCup, league.leagueCup?.champion);
        else if (cupType === 'supercup') this.competitionService.updateChampionshipRankings(league.rankings.supercup, league.supercup?.champion);
      }

      this.competitionService.advanceCupRound(league, cupType);
      
      const newLeagues = [...leagues];
      newLeagues[leagueIndex] = league;
      return newLeagues;
    });
  }

  public simulateCupRound(leagueId: string, roundName: string, cupType: 'main' | 'league' | 'supercup' = 'main') {
    this.universeService.leagues.update(leagues => {
      const leagueIndex = leagues.findIndex(l => l.countryId === leagueId);
      if (leagueIndex === -1) return leagues;

      const league = leagues[leagueIndex];
      const cupToSim =
        cupType === 'league' && league.leagueCup ? league.leagueCup :
          cupType === 'supercup' && league.supercup ? league.supercup :
            league.cup;
      const round = cupToSim.rounds.find((r: CupRound) => r.name === roundName);

      if (round) {
        round.matches.forEach((match: CupMatch) => {
          this.simulationService.simulateSingleCupLeg(match, round.name, 1, league, league.divisions.flatMap(d => d.teams), this.competitionService.addTrophyToTeam.bind(this.competitionService), (l: League) => {
            if (cupType === 'main') this.competitionService.updateChampionshipRankings(l.rankings.cup, l.cup.champion);
            else if (cupType === 'league') this.competitionService.updateChampionshipRankings(l.rankings.leagueCup, l.leagueCup?.champion);
            else if (cupType === 'supercup') this.competitionService.updateChampionshipRankings(l.rankings.supercup, l.supercup?.champion);
          }, () => { }, cupType);
          this.simulationService.simulateSingleCupLeg(match, round.name, 2, league, league.divisions.flatMap(d => d.teams), this.competitionService.addTrophyToTeam.bind(this.competitionService), (l: League) => {
            if (cupType === 'main') this.competitionService.updateChampionshipRankings(l.rankings.cup, l.cup.champion);
            else if (cupType === 'league') this.competitionService.updateChampionshipRankings(l.rankings.leagueCup, l.leagueCup?.champion);
            else if (cupType === 'supercup') this.competitionService.updateChampionshipRankings(l.rankings.supercup, l.supercup?.champion);
          }, () => { }, cupType);
        });
        this.competitionService.advanceCupRound(league, cupType);
        this.competitionService.updateCupPlayerRankings(league, cupType);
      }
      return [...leagues];
    });
  }

  public simulateAllNationalLeagues(continentArg: 'EUR' | 'SAM' | 'NCA' | 'ASI' | 'AFR'): void {
    if (this._isSimulatingMassive) return;
    this._isSimulatingMassive = true;

    this.universeService.leagues.update(currentLeagues => {
      try {
        const continent = continentArg;
        const leaguesToSimulate = currentLeagues.filter((l: League) =>
          this.universeService.getContinentForLeague(l.countryId) === continent && l.status === 'ongoing'
        );

      console.log(`[SIMULATION] Starting mass simulation for ${continent}. Total leagues: ${leaguesToSimulate.length}`);

      for (const league of leaguesToSimulate) {
        try {
          console.log(`[SIMULATION] Processing ${league.countryId}...`);
          
          if (['POR', 'NED', 'RUS'].includes(league.countryId)) {
            league.supercup = undefined;
          }

          const allTeamsInLeague = league.divisions.flatMap((d: Division) => d.teams);

          // 1. League
          console.log(`[SIMULATION] [${league.countryId}] Simulating League Matches (${league.totalRounds} rounds)...`);
          for (let r = 0; r < league.totalRounds; r++) {
            for (const division of league.divisions) {
              const roundFixtures = division.fixtures[r];
              if (roundFixtures) {
                roundFixtures.forEach((match: Match) => {
                  if (!match.played) this.simulationService.simulateMatch(match, division);
                });
              }
            }
            league.currentRound = r + 1;
          }
          this.competitionService.updatePlayerRankings(league);

          // 2. Play-offs
          if ((league.countryId === 'BRA' || league.countryId === 'USA') && !league.leagueCup) {
            console.log(`[SIMULATION] [${league.countryId}] Generating Play-offs...`);
            league.leagueCup = this.competitionService.generatePlayoffs(league);
          }

          // 3. Cups
          const cupsToSimulate = [
            { cup: league.cup, type: 'main' as const },
            { cup: league.leagueCup, type: 'league' as const },
            { cup: league.supercup, type: 'supercup' as const }
          ];

          for (const { cup, type } of cupsToSimulate) {
            if (!cup) continue;
            console.log(`[SIMULATION] [${league.countryId}] Simulating Cup: ${type}...`);
            let safetyBreak = 0;
            while (!cup.champion && safetyBreak < 50) {
              const currentRound = cup.rounds.find(r => r.matches.length > 0 && r.matches.some(m => !m.played));
              if (currentRound) {
                for (const match of currentRound.matches) {
                  if (!match.played) {
                    this.simulationService.simulateSingleCupLeg(match, currentRound.name, 1, league, allTeamsInLeague, this.competitionService.addTrophyToTeam.bind(this.competitionService), () => { }, () => { }, type);
                    this.simulationService.simulateSingleCupLeg(match, currentRound.name, 2, league, allTeamsInLeague, this.competitionService.addTrophyToTeam.bind(this.competitionService), () => { }, () => { }, type);
                  }
                }
                this.competitionService.advanceCupRound(league, type);
              } else {
                this.competitionService.advanceCupRound(league, type);
              }
              safetyBreak++;
            }
            this.competitionService.updateCupPlayerRankings(league, type);
          }

          // 4. Finalize
          console.log(`[SIMULATION] [${league.countryId}] Finalizing...`);
          league.status = 'waiting_international';
          this.competitionService.determineCupRunnerUp(league);
          if (!league.history.some((h: SeasonRecord) => h.season === this.universeService.season())) {
            this.competitionService.captureSeasonHistory(league);
          }
          console.log(`[SIMULATION] [${league.countryId}] COMPLETED.`);
        } catch (err) {
          console.error(`[SIMULATION] [${league.countryId}] CRITICAL ERROR:`, err);
        }
      }

      console.log(`[SIMULATION] Mass simulation for ${continent} finished.`);
      return [...currentLeagues];
      } catch (err) {
        console.error('Erro crítico na simulação massiva:', err);
        return currentLeagues;
      }
    });

    this._isSimulatingMassive = false;
  }
}
