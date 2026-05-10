export interface Player {
  id: string;
  teamId?: string;
  teamName?: string;
  isGoalkeeper: boolean;
  number: number;
  name: string;
  nationalityId: string;
  age: number;
  overall: number;
  marketValue: number;
  contractYears: number;
  bestPlayerInTheWorldAwards?: number;
  nationalTeamOverrides?: {
    number?: number;
  };
  stats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    motm: number; // Man of the Match awards
  };
  cupStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    motm: number;
  };
  internationalStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    motm: number;
  };
  worldCupStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    motm: number;
  };
  worldCupQualifierStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    motm: number;
  };
  youthStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    motm: number;
  };
  careerStats: {
    [countryId: string]: {
      matchesPlayed: number;
      goals: number;
      assists: number;
      motm: number;
    }
  };
  careerStatsByClub?: {
    [clubId: string]: {
      matchesPlayed: number;
      goals: number;
      assists: number;
      motm: number;
    }
  };
  clubHistory?: { season: number; teamId: string; teamName: string; }[];
  overallHistory: { season: number; overall: number; }[];
}

export interface Trophy {
  name: string;
  count: number;
  type: 'national_league' | 'national_cup' | 'league_cup' | 'supercup' | 'international' | 'world' | 'lower_division';
}

export interface Team {
  id: string;
  teamName: string;
  countryId: string;
  budget: number;
  players?: Player[];
  youthAcademy?: Player[];
  overall: number;
  logoUrl?: string;
  trophies?: Trophy[];
  rivalId?: string;
  overallVariation?: number; // Adicionado: +2, -1, 0, etc.
  // Dynasty Engine Fields
  tier?: 'WORLD_CLASS' | 'ELITE' | 'PROFESSIONAL' | 'DEVELOPING' | 'FALLEN_GIANT';
  cycleStep?: number; // 1-8 (Squad Lifecycle)
  volatility?: number; // 0.1 to 1.0
  momentum?: number; // -5 to +5 (Sequence of good/bad results)
  stats: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  };
}

export interface Match {
  id: string;
  round: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
  divisionName?: string;
  events: {
    goals: { player: Player; minute: number }[];
    assists: { player: Player; minute: number }[];
    motm: Player | null;
  };
}

export interface Division {
  id: number;
  name: string;
  teams: Team[];
  fixtures: Match[][]; // Array of rounds, each round is an array of matches
  topScorers: Player[];
  topAssists: Player[];
  topMotm: Player[];
  relegationSlots?: number;
  promotionSlots?: number;
}

export interface CupMatch {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScoreLeg1?: number;
  awayScoreLeg1?: number;
  homeScoreLeg2?: number;
  awayScoreLeg2?: number;
  homePenalties?: number;
  awayPenalties?: number;
  aggregateWinnerId?: string;
  winner?: Team;
  leg1Played: boolean;
  leg2Played: boolean;
  played: boolean;
  eventsLeg1?: Match['events'];
  eventsLeg2?: Match['events'];
}

export interface CupRound {
  name: string;
  matches: CupMatch[];
}

export interface Cup {
  rounds: CupRound[];
  champion?: Team;
  runnerUp?: Team;
  topScorers: Player[];
  topAssists: Player[];
  topMotm: Player[];
}

// Interfaces for History
export interface PlayerRecord {
  player: Player | null;
  teamName: string | null;
  value?: number;
}

// playerClubHistory record removed to save space, use careerStatsByClub on Player instead

export interface CompetitionRecord {
  name: string;
  champion: Team | null;
  runnerUp: Team | null;
  topScorer: PlayerRecord;
  topAssister: PlayerRecord;
  topMotm: PlayerRecord;
}

export interface InternationalSeasonRecord extends CompetitionRecord {
  season: number;
  teamOfTheSeason?: PlayerRecord[];
  goldenGlove?: PlayerRecord;
  revelation?: PlayerRecord;
  bestAttack?: { teamName: string; goals: number; };
  bestDefense?: { teamName: string; goals: number; };
  biggestWin?: string;
  highestScoringMatch?: string;
}

export interface WorldCupRecord {
  season: number;
  host: string;
  champion: Team | null;
  runnerUp: Team | null;
  topScorer: PlayerRecord;
  topAssister: PlayerRecord;
  bestPlayer: PlayerRecord;
  bestGoalkeeper: PlayerRecord;
}

export interface SeasonRecord {
  season: number;
  division1: CompetitionRecord;
  division2?: CompetitionRecord;
  division3?: CompetitionRecord;
  division4?: CompetitionRecord;
  division5?: CompetitionRecord;
  division6?: CompetitionRecord;
  division7?: CompetitionRecord;
  division8?: CompetitionRecord;
  cup: CompetitionRecord;
  leagueCup?: CompetitionRecord;
  supercup?: CompetitionRecord;
  promotedTeams: string[];
  relegatedTeams: string[];
  teamOfTheSeason: PlayerRecord[];
  goldenGlove?: PlayerRecord;
  revelation?: PlayerRecord;
  bestAttack?: { teamName: string; goals: number; };
  bestDefense?: { teamName: string; goals: number; };
  biggestWin?: string;
  highestScoringMatch?: string;
}

export interface ChampionshipRankingRecord {
  team: { id: string, teamName: string, countryId?: string, logoUrl?: string };
  count: number;
}

export interface ChampionshipRankings {
  division1: ChampionshipRankingRecord[];
  division2?: ChampionshipRankingRecord[];
  division3?: ChampionshipRankingRecord[];
  division4?: ChampionshipRankingRecord[];
  division5?: ChampionshipRankingRecord[];
  division6?: ChampionshipRankingRecord[];
  division7?: ChampionshipRankingRecord[];
  division8?: ChampionshipRankingRecord[];
  cup: ChampionshipRankingRecord[];
  leagueCup?: ChampionshipRankingRecord[];
  supercup?: ChampionshipRankingRecord[];
}


export interface League {
  countryId: string;
  countryName: string;
  continent: 'EUR' | 'SAM' | 'AFR' | 'ASI' | 'NCA' | 'OCE' | 'WORLD'; // Adicionado
  currentRound: number;
  totalRounds: number;
  status: 'ongoing' | 'finished' | 'waiting_international';
  divisions: Division[];
  cup: Cup;
  leagueCup?: Cup;
  supercup?: Cup;
  history: SeasonRecord[];
  rankings: ChampionshipRankings;
}

export interface InternationalCompetition {
  id: string; // e.g., 'AFR_CL'
  name: string;
  continent: 'AFR' | 'EUR' | 'SAM' | 'NCA' | 'ASI' | 'WORLD';
  status: 'pending' | 'playoffs' | 'playoffs_finished' | 'league' | 'knockout' | 'finished';
  season: number;
  teams: Team[];
  playoffPhase?: Cup;
  leaguePhase: Division[]; // Reuse Division model for the league table
  knockoutPhase: Cup;    // Reuse Cup model for the bracket
  currentLeagueRound: number;
  totalLeagueRounds: number;
  topScorers: Player[];
  topAssists: Player[];
  topMotm: Player[];
  history: InternationalSeasonRecord[];
  rankings: ChampionshipRankingRecord[];
}

export interface BestPlayerAwardRecord {
  season: number;
  player: Player;
  teamName: string;
  stats: {
    goals: number;
    assists: number;
    motm: number;
  }
}

export interface SeasonAwardsHistoryRecord {
  season: number;
  podium: BestPlayerAwardRecord[];
  goldenGlove: BestPlayerAwardRecord;
  revelation: BestPlayerAwardRecord;
}

export interface TransferRecord {
  season: number;
  playerName: string;
  playerOverall: number;
  playerNationalityId?: string;
  fromTeamName: string;
  fromTeamCountryId?: string;
  toTeamName: string;
  toTeamCountryId?: string;
  fee: number;
}

export interface HistoricMatch {
  id: string;
  season: number;
  round_number?: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  competitionName: string;
  homeScorers?: { name: string; goals: number }[];
  awayScorers?: { name: string; goals: number }[];
}

export interface H2HData {
  teamAWins: number;
  teamBWins: number;
  draws: number;
  history: HistoricMatch[];
}

export interface PlayerOfTheRound {
  player: Player;
  team: Team;
  matchStats: {
    goals: number;
    assists: number;
    isMotm: boolean;
  };
}