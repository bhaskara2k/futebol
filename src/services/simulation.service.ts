import { Injectable, inject } from '@angular/core';
import { League, Team, Player, Division, Match, Cup, CupMatch, CupRound, SeasonRecord, ChampionshipRankings, PlayerRecord, CompetitionRecord, InternationalCompetition, Trophy, InternationalSeasonRecord, ChampionshipRankingRecord, BestPlayerAwardRecord, TransferRecord, HistoricMatch, H2HData, WorldCupRecord } from '../models';
import { UniverseService } from './universe.service';
import { SeasonService } from './season.service';

@Injectable({ providedIn: 'root' })
export class SimulationService {
  universeService = inject(UniverseService);
  seasonService = inject(SeasonService);

  private ensureCareerStats(player: Player, competitionId: string) {
    if (!player.careerStats) {
      player.careerStats = {};
    }
    if (!player.careerStats[competitionId]) {
      player.careerStats[competitionId] = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
    }
  }

  private ensureCareerStatsByClub(player: Player, clubId: string) {
    if (!player.careerStatsByClub) {
      player.careerStatsByClub = {};
    }
    if (!player.careerStatsByClub[clubId]) {
      player.careerStatsByClub[clubId] = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
    }
  }

  public simulateMatch(match: Match, division: Division): void {
    if (match.played) return;

    const homeTeam = division.teams.find(t => t.id === match.homeTeam.id);
    const awayTeam = division.teams.find(t => t.id === match.awayTeam.id);

    if (!homeTeam || !awayTeam) return;

    const homeOverall = homeTeam.overall || 60;
    const awayOverall = awayTeam.overall || 60;

    const { homeGoals, awayGoals } = this._calculateMatchScore(homeOverall, awayOverall);
    this.recordMatchResult(match, division, homeGoals, awayGoals);
  }

  public recordMatchResult(match: Match, division: Division, homeGoals: number, awayGoals: number): void {
    if (match.played) {
      console.warn(`[SECURITY] Tentativa de gravar resultado em jogo já finalizado: ${match.id}`);
      return;
    }
    
    match.homeScore = homeGoals;

    const homeTeam = division.teams.find(t => t.id === match.homeTeam.id);
    const awayTeam = division.teams.find(t => t.id === match.awayTeam.id);

    if (!homeTeam || !awayTeam) return;

    // Garante que o objeto stats exista
    if (!homeTeam.stats) homeTeam.stats = this.createEmptyStats();
    if (!awayTeam.stats) awayTeam.stats = this.createEmptyStats();

    const countryId = homeTeam.countryId;

    match.homeScore = homeGoals;
    match.awayScore = awayGoals;
    match.played = true;

    // Nota: Eventos de jogadores (gols, MOTM) desativados 
    // para focar no sistema de Overall Base puro.
    // this.assignGoalEvents(match.events, homeTeam, homeGoals, 'stats', countryId);
    // this.assignGoalEvents(match.events, awayTeam, awayGoals, 'stats', countryId);
    // this.assignMotm(match.events, homeTeam, awayTeam, 'stats', countryId);

    // History
    this.universeService._recordHistoricMatch(
      homeTeam,
      awayTeam,
      homeGoals,
      awayGoals,
      match.divisionName || 'Liga',
      match.id,
      this._extractScorers(match.events, homeTeam, awayTeam),
      match.round
    );

    // Update Team Stats
    homeTeam.stats.matchesPlayed++;
    awayTeam.stats.matchesPlayed++;
    homeTeam.stats.goalsFor += homeGoals;
    awayTeam.stats.goalsFor += awayGoals;
    homeTeam.stats.goalsAgainst += awayGoals;
    awayTeam.stats.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      homeTeam.stats.wins++;
      awayTeam.stats.losses++;
      homeTeam.stats.points += 3;
    } else if (awayGoals > homeGoals) {
      awayTeam.stats.wins++;
      homeTeam.stats.losses++;
      awayTeam.stats.points += 3;
    } else {
      homeTeam.stats.draws++;
      awayTeam.stats.draws++;
      homeTeam.stats.points += 1;
      awayTeam.stats.points += 1;
    }

    match.homeTeam = homeTeam;
    match.awayTeam = awayTeam;
  }

  public simulateMatchForInternational(match: Match, division: Division, competitionId: string): void {
    if (match.played) return;

    const homeTeamInDivision = division.teams.find(t => t.id === match.homeTeam.id);
    const awayTeamInDivision = division.teams.find(t => t.id === match.awayTeam.id);

    if (!homeTeamInDivision || !awayTeamInDivision) {
      console.error("Could not find teams in division for international match", match);
      return;
    }

    const isQualifier = competitionId.startsWith('WC_Q_');
    const isWorldCupTier = competitionId === 'WORLD_CWC';
    const statType: 'internationalStats' | 'worldCupStats' | 'worldCupQualifierStats' | 'youthStats' =
      competitionId === 'EUR_YCL' ? 'youthStats' :
        isQualifier ? 'worldCupQualifierStats' :
          isWorldCupTier ? 'worldCupStats' :
            'internationalStats';

    const competitionContextId = competitionId;

    const homeOverall = homeTeamInDivision.overall || 60;
    const awayOverall = awayTeamInDivision.overall || 60;

    const { homeGoals, awayGoals } = this._calculateMatchScore(homeOverall, awayOverall);

    match.homeScore = homeGoals;
    match.awayScore = awayGoals;
    match.played = true;

    // Nota: Atribuição de eventos de jogadores (gols, MOTM) desativada 
    // para focar no sistema de Overall Base puro.
    // this.assignGoalEvents(match.events, homeTeamInDivision, homeGoals, statType, competitionContextId);
    // this.assignGoalEvents(match.events, awayTeamInDivision, awayGoals, statType, competitionContextId);
    // this.assignMotm(match.events, homeTeamInDivision, awayTeamInDivision, statType, competitionContextId);

    const competitionName = this.universeService.TROPHY_NAMES[competitionId] || match.divisionName || 'Internacional';
    this.universeService._recordHistoricMatch(
      homeTeamInDivision,
      awayTeamInDivision,
      homeGoals,
      awayGoals,
      competitionName,
      match.id,
      this._extractScorers(match.events, homeTeamInDivision, awayTeamInDivision),
      match.round
    );

    // Atualização de stats dos times
    homeTeamInDivision.stats.matchesPlayed++;
    awayTeamInDivision.stats.matchesPlayed++;
    homeTeamInDivision.stats.goalsFor += homeGoals;
    awayTeamInDivision.stats.goalsFor += awayGoals;
    homeTeamInDivision.stats.goalsAgainst += awayGoals;
    awayTeamInDivision.stats.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      homeTeamInDivision.stats.wins++;
      awayTeamInDivision.stats.losses++;
      homeTeamInDivision.stats.points += 3;
    } else if (awayGoals > homeGoals) {
      awayTeamInDivision.stats.wins++;
      homeTeamInDivision.stats.losses++;
      awayTeamInDivision.stats.points += 3;
    } else {
      homeTeamInDivision.stats.draws++;
      awayTeamInDivision.stats.draws++;
      homeTeamInDivision.stats.points += 1;
      awayTeamInDivision.stats.points += 1;
    }
  }

  public applyManualResultForInternational(match: Match, division: Division, competitionId: string, homeGoals: number, awayGoals: number): void {
    if (match.played) return;

    const homeTeamInDivision = division.teams.find(t => t.id === match.homeTeam.id);
    const awayTeamInDivision = division.teams.find(t => t.id === match.awayTeam.id);

    if (!homeTeamInDivision || !awayTeamInDivision) return;

    const isQualifier = competitionId.startsWith('WC_Q_');
    const isWorldCupTier = competitionId === 'WORLD_CWC';
    const statType: 'internationalStats' | 'worldCupStats' | 'worldCupQualifierStats' | 'youthStats' =
      competitionId === 'EUR_YCL' ? 'youthStats' :
        isQualifier ? 'worldCupQualifierStats' :
          isWorldCupTier ? 'worldCupStats' :
            'internationalStats';

    match.homeScore = homeGoals;
    match.awayScore = awayGoals;
    match.played = true;

    this.assignGoalEvents(match.events, homeTeamInDivision, homeGoals, statType, competitionId);
    this.assignGoalEvents(match.events, awayTeamInDivision, awayGoals, statType, competitionId);
    this.assignMotm(match.events, homeTeamInDivision, awayTeamInDivision, statType, competitionId);

    const competitionName = this.universeService.TROPHY_NAMES[competitionId] || match.divisionName || 'Internacional';
    this.universeService._recordHistoricMatch(
      homeTeamInDivision,
      awayTeamInDivision,
      homeGoals,
      awayGoals,
      competitionName,
      match.id,
      this._extractScorers(match.events, homeTeamInDivision, awayTeamInDivision),
      match.round
    );

    homeTeamInDivision.stats.matchesPlayed++;
    awayTeamInDivision.stats.matchesPlayed++;
    homeTeamInDivision.stats.goalsFor += homeGoals;
    awayTeamInDivision.stats.goalsFor += awayGoals;
    homeTeamInDivision.stats.goalsAgainst += awayGoals;
    awayTeamInDivision.stats.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      homeTeamInDivision.stats.wins++;
      awayTeamInDivision.stats.losses++;
      homeTeamInDivision.stats.points += 3;
    } else if (awayGoals > homeGoals) {
      awayTeamInDivision.stats.wins++;
      homeTeamInDivision.stats.losses++;
      awayTeamInDivision.stats.points += 3;
    } else {
      homeTeamInDivision.stats.draws++;
      awayTeamInDivision.stats.draws++;
      homeTeamInDivision.stats.points += 1;
      awayTeamInDivision.stats.points += 1;
    }
  }

  public applyManualCupResultForInternational(match: CupMatch, roundName: string, leg: 1 | 2, competition: InternationalCompetition, allTeams: Team[], homeGoals: number, awayGoals: number, addTrophyFn: (team: Team, trophyName: string, type: Trophy['type']) => void, captureHistoryFn: (comp: InternationalCompetition) => void): void {
    const isFinal = roundName === 'Final';
    const isLeg1 = leg === 1;

    if (isLeg1) {
      match.homeScoreLeg1 = homeGoals;
      match.awayScoreLeg1 = awayGoals;
      match.leg1Played = true;
    } else {
      match.homeScoreLeg2 = homeGoals;
      match.awayScoreLeg2 = awayGoals;
      match.leg2Played = true;
    }

    if (!isFinal && !isLeg1) {
      match.played = true;
    } else if (isFinal) {
      match.played = true;
    }

    const homeTeam = allTeams.find(t => t.id === match.homeTeam.id)!;
    const awayTeam = allTeams.find(t => t.id === match.awayTeam.id)!;

    const statType: 'internationalStats' | 'worldCupStats' | 'worldCupQualifierStats' | 'youthStats' =
      competition.id === 'EUR_YCL' ? 'youthStats' :
        competition.id.startsWith('WC_Q_') ? 'worldCupQualifierStats' :
          competition.id === 'WORLD_CWC' ? 'worldCupStats' :
            'internationalStats';

    const events = isLeg1 ? (match.eventsLeg1 || (match.eventsLeg1 = { goals: [], assists: [], motm: null })) : (match.eventsLeg2 || (match.eventsLeg2 = { goals: [], assists: [], motm: null }));

    this.assignGoalEvents(events, homeTeam, homeGoals, statType, competition.id);
    this.assignGoalEvents(events, awayTeam, awayGoals, statType, competition.id);
    
    if (match.played) {
      this.assignMotm(events, homeTeam, awayTeam, statType, competition.id);
      
      const totalHome = (match.homeScoreLeg1 || 0) + (match.homeScoreLeg2 || 0);
      const totalAway = (match.awayScoreLeg1 || 0) + (match.awayScoreLeg2 || 0);

      if (totalHome > totalAway) {
        match.winner = match.homeTeam;
        match.aggregateWinnerId = match.homeTeam.id;
      } else if (totalAway > totalHome) {
        match.winner = match.awayTeam;
        match.aggregateWinnerId = match.awayTeam.id;
      } else {
        match.homePenalties = 5;
        match.awayPenalties = 4;
        match.winner = match.homeTeam;
        match.aggregateWinnerId = match.homeTeam.id;
      }

      if (isFinal) {
        competition.knockoutPhase.champion = match.winner;
        competition.status = 'finished';
        const trophyName = this.universeService.TROPHY_NAMES[competition.id] || competition.name;
        const trophyType = competition.continent === 'WORLD' ? 'world' : 'international';
        const fullWinner = allTeams.find(t => t.id === match.winner?.id)!;
        addTrophyFn(fullWinner, trophyName, trophyType);
        captureHistoryFn(competition);
      }
    }

    this.universeService._recordHistoricMatch(
      homeTeam, awayTeam, homeGoals, awayGoals, competition.name, match.id,
      this._extractScorers(events, homeTeam, awayTeam)
    );
  }


  public simulateSingleCupLeg(match: CupMatch, roundName: string, leg: 1 | 2, context: League | InternationalCompetition, allTeamsInContext: Team[], addTrophyCallback: (team: Team, trophyName: string, trophyType: Trophy['type']) => void, captureHistoryCallback: (comp: any) => void, onFinalCallback: () => void, cupType?: 'main' | 'league' | 'supercup') {
    const homeTeam = (match.homeTeam && typeof match.homeTeam === 'object' && match.homeTeam.id) ? allTeamsInContext.find(t => t.id === match.homeTeam.id) : null;
    const awayTeam = (match.awayTeam && typeof match.awayTeam === 'object' && match.awayTeam.id) ? allTeamsInContext.find(t => t.id === match.awayTeam.id) : null;

    if (!homeTeam || !awayTeam) {
      console.warn('⚠️ Simulation skipped: One or both teams are not ready for this cup leg.', match.id);
      return;
    }

    match.homeTeam = homeTeam;
    match.awayTeam = awayTeam;

    let competitionId: string;
    let statType: 'cupStats' | 'internationalStats' | 'worldCupStats' | 'worldCupQualifierStats' | 'youthStats';
    let contextName: string;

    if ('countryId' in context) {
      competitionId = context.countryId;
      statType = 'cupStats';
      contextName = "Copa Nacional"; // Simplified name for history
    } else {
      competitionId = context.id;
      const isQualifier = competitionId.startsWith('WC_Q_');
      const isWorldCupTier = context.id === 'WORLD_CWC';
      statType = competitionId === 'EUR_YCL' ? 'youthStats' :
        isQualifier ? 'worldCupQualifierStats' :
          isWorldCupTier ? 'worldCupStats' :
            'internationalStats';
      contextName = context.name;
    }

    const isNationalTeamMatch = homeTeam.budget === 0;

    const simulateSingleLegAction = () => {
      if (match.played) return;

      homeTeam.players?.forEach(p => {
        this.ensureCareerStats(p, competitionId);
        if (!(p as any)[statType]) (p as any)[statType] = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
        p[statType].matchesPlayed++;
        p.careerStats[competitionId].matchesPlayed++;
        if (!isNationalTeamMatch) {
          this.ensureCareerStatsByClub(p, homeTeam.id);
          p.careerStatsByClub![homeTeam.id].matchesPlayed++;
        }
      });
      awayTeam.players?.forEach(p => {
        this.ensureCareerStats(p, competitionId);
        if (!(p as any)[statType]) (p as any)[statType] = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
        p[statType].matchesPlayed++;
        p.careerStats[competitionId].matchesPlayed++;
        if (!isNationalTeamMatch) {
          this.ensureCareerStatsByClub(p, awayTeam.id);
          p.careerStatsByClub![awayTeam.id].matchesPlayed++;
        }
      });

      const homeOverall = homeTeam.overall || 60;
      const awayOverall = awayTeam.overall || 60;
      const { homeGoals, awayGoals } = this._calculateMatchScore(homeOverall, awayOverall);
      match.homeScoreLeg1 = homeGoals;
      match.awayScoreLeg1 = awayGoals;

      this.universeService._recordHistoricMatch(homeTeam, awayTeam, homeGoals, awayGoals, `${contextName} - ${roundName}`);

      match.eventsLeg1 = { goals: [], assists: [], motm: null };
      this.assignGoalEvents(match.eventsLeg1, homeTeam, homeGoals, statType, competitionId);
      this.assignGoalEvents(match.eventsLeg1, awayTeam, awayGoals, statType, competitionId);
      this.assignMotm(match.eventsLeg1, homeTeam, awayTeam, statType, competitionId);

      if (homeGoals === awayGoals) {
        match.homePenalties = Math.floor(Math.random() * 5) + 1;
        match.awayPenalties = Math.floor(Math.random() * 5) + 1;
        if (match.homePenalties === match.awayPenalties) match.homePenalties++;
        match.winner = match.homePenalties > match.awayPenalties ? homeTeam : awayTeam;
      } else {
        match.winner = homeGoals > awayGoals ? homeTeam : awayTeam;
      }
      match.aggregateWinnerId = match.winner.id;
      match.played = true;
      match.leg1Played = true;
      match.leg2Played = true; // Mark as complete
    };

    const isSingleLegRound = cupType === 'supercup' || roundName === 'Final' || roundName === 'Playoffs' || (('id' in context && context.id === 'WORLD_CWC') && (roundName === 'Play-in' || roundName === 'Semifinais')) || ('id' in context && (context.id === 'SAM_REC' || context.id === 'EUR_SUP'));

    if (isSingleLegRound) {
      const wasAlreadyPlayed = match.played;
      simulateSingleLegAction();
      if ((roundName === 'Final' || cupType === 'supercup') && !wasAlreadyPlayed) {
        if (match.winner) {
          const champion = allTeamsInContext.find(t => t.id === match.winner!.id);
          const runnerUp = allTeamsInContext.find(t => t.id === (match.winner!.id === homeTeam.id ? awayTeam.id : homeTeam.id));

          if ('countryId' in context) { // It's a League context
            let cupToUpdate: Cup | undefined;
            if (cupType === 'supercup' && context.supercup) {
              cupToUpdate = context.supercup;
            } else if (cupType === 'league' && context.leagueCup) {
              cupToUpdate = context.leagueCup;
            } else {
              cupToUpdate = context.cup;
            }
            if (cupToUpdate) {
              cupToUpdate.champion = champion;
              cupToUpdate.runnerUp = runnerUp;
            }
          } else { // International Competition Final
            if (champion && !context.knockoutPhase.champion) { // Guard to prevent duplicate trophies
              const trophyType = (context.id === 'WORLD_CWC') ? 'world' : 'international';
              const trophyName = context.name;
              addTrophyCallback(champion, trophyName, trophyType);
              context.knockoutPhase.champion = champion;
            }
            if (runnerUp) {
              context.knockoutPhase.runnerUp = runnerUp;
            }
            context.status = 'finished';
            captureHistoryCallback(context);

            onFinalCallback();
          }
        }
      }
    } else { // Two-leg logic for other cups
      if (leg === 1 && !match.leg1Played) {
        homeTeam.players?.forEach(p => {
          this.ensureCareerStats(p, competitionId);
          if (!(p as any)[statType]) (p as any)[statType] = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p[statType].matchesPlayed++;
          p.careerStats[competitionId].matchesPlayed++;
          if (!isNationalTeamMatch) {
            this.ensureCareerStatsByClub(p, homeTeam.id);
            p.careerStatsByClub![homeTeam.id].matchesPlayed++;
          }
        });
        awayTeam.players?.forEach(p => {
          this.ensureCareerStats(p, competitionId);
          if (!(p as any)[statType]) (p as any)[statType] = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p[statType].matchesPlayed++;
          p.careerStats[competitionId].matchesPlayed++;
          if (!isNationalTeamMatch) {
            this.ensureCareerStatsByClub(p, awayTeam.id);
            p.careerStatsByClub![awayTeam.id].matchesPlayed++;
          }
        });
        const homeOverall = homeTeam.overall || 60;
        const awayOverall = awayTeam.overall || 60;
        const { homeGoals, awayGoals } = this._calculateMatchScore(homeOverall, awayOverall);
        match.homeScoreLeg1 = homeGoals;
        match.awayScoreLeg1 = awayGoals;
        this.universeService._recordHistoricMatch(homeTeam, awayTeam, match.homeScoreLeg1, match.awayScoreLeg1, `${contextName} - ${roundName} (Ida)`);
        match.leg1Played = true;
        match.eventsLeg1 = { goals: [], assists: [], motm: null };
        this.assignGoalEvents(match.eventsLeg1, homeTeam, match.homeScoreLeg1, statType, competitionId);
        this.assignGoalEvents(match.eventsLeg1, awayTeam, match.awayScoreLeg1, statType, competitionId);
        this.assignMotm(match.eventsLeg1, homeTeam, awayTeam, statType, competitionId);

      } else if (leg === 2 && match.leg1Played && !match.leg2Played) {
        awayTeam.players?.forEach(p => {
          this.ensureCareerStats(p, competitionId);
          if (!(p as any)[statType]) (p as any)[statType] = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p[statType].matchesPlayed++;
          p.careerStats[competitionId].matchesPlayed++;
          if (!isNationalTeamMatch) {
            this.ensureCareerStatsByClub(p, awayTeam.id);
            p.careerStatsByClub![awayTeam.id].matchesPlayed++;
          }
        });
        homeTeam.players?.forEach(p => {
          this.ensureCareerStats(p, competitionId);
          if (!(p as any)[statType]) (p as any)[statType] = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
          p[statType].matchesPlayed++;
          p.careerStats[competitionId].matchesPlayed++;
          if (!isNationalTeamMatch) {
            this.ensureCareerStatsByClub(p, homeTeam.id);
            p.careerStatsByClub![homeTeam.id].matchesPlayed++;
          }
        });
        const homeOverall = homeTeam.overall || 60;
        const awayOverall = awayTeam.overall || 60;
        const { homeGoals, awayGoals } = this._calculateMatchScore(awayOverall, homeOverall);
        match.homeScoreLeg2 = homeGoals;
        match.awayScoreLeg2 = awayGoals;
        this.universeService._recordHistoricMatch(awayTeam, homeTeam, match.homeScoreLeg2, match.awayScoreLeg2, `${contextName} - ${roundName} (Volta)`);
        match.leg2Played = true;
        match.played = true;

        match.eventsLeg2 = { goals: [], assists: [], motm: null };
        this.assignGoalEvents(match.eventsLeg2, awayTeam, match.homeScoreLeg2, statType, competitionId);
        this.assignGoalEvents(match.eventsLeg2, homeTeam, match.awayScoreLeg2, statType, competitionId);
        this.assignMotm(match.eventsLeg2, awayTeam, homeTeam, statType, competitionId);

        const totalHome = match.homeScoreLeg1! + match.awayScoreLeg2!;
        const totalAway = match.awayScoreLeg1! + match.homeScoreLeg2!;
        const homeAwayGoals = match.awayScoreLeg2!;
        const awayAwayGoals = match.awayScoreLeg1!;

        if (totalHome > totalAway) match.aggregateWinnerId = match.homeTeam.id;
        else if (totalAway > totalHome) match.aggregateWinnerId = match.awayTeam.id;
        else {
          match.homePenalties = Math.floor(Math.random() * 5) + 3;
          match.awayPenalties = Math.floor(Math.random() * 5) + 3;
          while (match.homePenalties === match.awayPenalties) match.awayPenalties = Math.floor(Math.random() * 5) + 3;
          match.aggregateWinnerId = match.homePenalties > match.awayPenalties ? match.homeTeam.id : match.awayTeam.id;
        }

        // Se for uma final, definir o campeão
        if (roundName === 'Final' || roundName === 'Final (Série E)' || roundName === 'Supercopa' || roundName === 'Finalíssima') {
          const winnerId = match.aggregateWinnerId;
          const champion = allTeamsInContext.find(t => t.id === winnerId);
          const runnerUp = allTeamsInContext.find(t => t.id === (winnerId === homeTeam.id ? awayTeam.id : homeTeam.id));

          if ('countryId' in context) {
            const league = context as League;
            let cupToUpdate: Cup | undefined;
            if ((cupType as any) === 'supercup' && league.supercup) cupToUpdate = league.supercup;
            else if (cupType === 'league' && league.leagueCup) cupToUpdate = league.leagueCup;
            else cupToUpdate = league.cup;

            if (cupToUpdate) {
              cupToUpdate.champion = champion;
              cupToUpdate.runnerUp = runnerUp;
            }
          }
        }
      }
    }
  }

  private _calculateMatchScore(homeOverall: number, awayOverall: number): { homeGoals: number, awayGoals: number } {
    const generateGoals = (teamOverall: number, opponentOverall: number, isHome: boolean): number => {
      // Base lambda mais realista (divisor maior reduz a média de gols)
      let lambda = teamOverall / 68; 
      
      if (isHome) {
        lambda += 0.18; // Vantagem de casa levemente reduzida
      }
      
      const diff = teamOverall - opponentOverall;
      lambda += diff / 40; // O peso da diferença de qualidade é mais sutil
      
      lambda = Math.max(0.15, lambda);
      
      // Algoritmo de Poisson (Knuth)
      const L = Math.exp(-lambda);
      let p = 1.0;
      let k = 0;
      do {
        k++;
        p *= Math.random();
      } while (p > L);
      
      let goals = k - 1;

      // Lógica de "Saturação": Placares altos são muito mais difíceis de acontecer
      // Se o sorteio inicial for alto, aplicamos uma "barreira" de probabilidade
      if (goals > 3) {
        const excess = goals - 3;
        let reducedExcess = 0;
        for (let i = 0; i < excess; i++) {
          // A cada gol extra acima de 3, a chance de ele "existir" cai drasticamente
          if (Math.random() < 0.35) { 
            reducedExcess++;
          }
        }
        goals = 3 + reducedExcess;
      }

      return Math.min(goals, 10); // Teto absoluto, mas raríssimo chegar aqui
    };

    let homeGoals = generateGoals(homeOverall, awayOverall, true);
    let awayGoals = generateGoals(awayOverall, homeOverall, false);

    // Ajuste de "Equilíbrio de Jogo": Se o placar total for muito alto (ex: 5-4), 
    // há uma chance de o jogo ter "esfriado" na vida real.
    if (homeGoals + awayGoals > 6 && Math.random() < 0.6) {
      if (homeGoals > 3) homeGoals -= 1;
      if (awayGoals > 3) awayGoals -= 1;
    }

    return { homeGoals, awayGoals };
  }

  private assignGoalEvents(events: Match['events'], team: Team, goals: number, statType: 'stats' | 'cupStats' | 'internationalStats' | 'worldCupStats' | 'worldCupQualifierStats' | 'youthStats', competitionId: string): void {
    // Player events disabled
  }

  private assignMotm(events: Match['events'], homeTeam: Team, awayTeam: Team, statType: 'stats' | 'cupStats' | 'internationalStats' | 'worldCupStats' | 'worldCupQualifierStats' | 'youthStats', competitionId: string): void {
    // MOTM disabled
  }

  private pickPlayerByWeight(players: Player[]): Player {
    if (players.length === 0) throw new Error("Cannot pick player from empty array");

    const totalWeight = players.reduce((sum, player) => sum + (player.overall * player.overall), 0);
    let random = Math.random() * totalWeight;

    for (const player of players) {
      random -= (player.overall * player.overall);
      if (random <= 0) {
        return player;
      }
    }

    return players[players.length - 1];
  }
  private _extractScorers(events: Match['events'], homeTeam: Team, awayTeam: Team): { home: { name: string, goals: number }[], away: { name: string, goals: number }[] } {
    return { home: [], away: [] };
  }

  public recordCupMatchResult(
    match: CupMatch,
    roundName: string,
    leg: 1 | 2,
    context: League | InternationalCompetition,
    homeGoals: number,
    awayGoals: number,
    statType: 'cupStats' | 'internationalStats' | 'worldCupStats' | 'worldCupQualifierStats' | 'youthStats',
    competitionId: string,
    contextName: string,
    homeTeam: Team,
    awayTeam: Team,
    isNationalTeamMatch: boolean,
    cupType?: 'main' | 'league' | 'supercup'
  ): void {
    if (leg === 1 && match.leg1Played) return;
    if (leg === 2 && match.leg2Played) return;

    if (leg === 1) {
      match.homeScoreLeg1 = homeGoals;
      match.awayScoreLeg1 = awayGoals;
      match.leg1Played = true;

      // Se for Supercopa ou Final (Jogo Único), já encerra a partida
      const isSingleLeg = cupType === 'supercup' || roundName === 'Final' || roundName === 'Supercopa' || roundName === 'Finalíssima';
      if (isSingleLeg) {
        match.played = true;
        match.leg2Played = true;
        match.winner = homeGoals > awayGoals ? homeTeam : (awayGoals > homeGoals ? awayTeam : undefined);
      }
      
      if (!match.eventsLeg1) match.eventsLeg1 = { goals: [], assists: [], motm: null };
      this.assignGoalEvents(match.eventsLeg1, awayTeam, awayGoals, statType, competitionId);
      this.assignMotm(match.eventsLeg1, homeTeam, awayTeam, statType, competitionId);
    } else {
      match.homeScoreLeg2 = homeGoals;
      match.awayScoreLeg2 = awayGoals;
      match.leg2Played = true;
      if (!match.eventsLeg2) match.eventsLeg2 = { goals: [], assists: [], motm: null };
      this.assignGoalEvents(match.eventsLeg2, homeTeam, homeGoals, statType, competitionId);
      this.assignGoalEvents(match.eventsLeg2, awayTeam, awayGoals, statType, competitionId);
      this.assignMotm(match.eventsLeg2, homeTeam, awayTeam, statType, competitionId);
    }

    // Record History
    this.universeService._recordHistoricMatch(
      homeTeam,
      awayTeam,
      homeGoals,
      awayGoals,
      `${contextName} - ${roundName}`,
      match.id,
      this._extractScorers(leg === 1 ? match.eventsLeg1! : match.eventsLeg2!, homeTeam, awayTeam),
      0
    );

    const isSingleLegRound = roundName === 'Final' || roundName === 'Playoffs' || (('id' in context && context.id === 'WORLD_CWC') && (roundName === 'Play-in' || roundName === 'Semifinais')) || ('id' in context && (context.id === 'SAM_REC' || context.id === 'EUR_SUP'));

    if (isSingleLegRound || match.leg2Played) {
      match.played = true;
      const h1 = match.homeScoreLeg1 || 0;
      const a1 = match.awayScoreLeg1 || 0;
      const h2 = match.homeScoreLeg2 || 0;
      const a2 = match.awayScoreLeg2 || 0;

      const aggHome = h1 + (isSingleLegRound ? 0 : a2);
      const aggAway = a1 + (isSingleLegRound ? 0 : h2);

      if (aggHome > aggAway) {
        match.winner = homeTeam;
        match.aggregateWinnerId = homeTeam.id;
      } else if (aggAway > aggHome) {
        match.winner = awayTeam;
        match.aggregateWinnerId = awayTeam.id;
      } else {
        const hPens = Math.floor(Math.random() * 5) + 3;
        let aPens = Math.floor(Math.random() * 5) + 3;
        while (aPens === hPens) aPens = Math.floor(Math.random() * 5) + 3;
        match.homePenalties = hPens;
        match.awayPenalties = aPens;
        match.winner = hPens > aPens ? homeTeam : awayTeam;
        match.aggregateWinnerId = match.winner.id;
      }

      // Se for uma final, definir o campeão
      if (roundName === 'Final' || roundName === 'Final (Série E)' || roundName === 'Supercopa' || roundName === 'Finalíssima') {
        const winner = match.winner;
        const runnerUp = (winner?.id === homeTeam.id) ? awayTeam : homeTeam;

        if ('countryId' in context) {
          const league = context as League;
          let cupToUpdate: Cup | undefined;
          if ((cupType as any) === 'supercup' && league.supercup) cupToUpdate = league.supercup;
          else if (cupType === 'league' && league.leagueCup) cupToUpdate = league.leagueCup;
          else cupToUpdate = league.cup;

          if (cupToUpdate) {
            cupToUpdate.champion = winner;
            cupToUpdate.runnerUp = runnerUp;
          }
        }
      }
    }
  }

  private createEmptyStats() {
    return {
      points: 0,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    };
  }
}
