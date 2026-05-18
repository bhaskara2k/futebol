import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, effect, ChangeDetectorRef } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { UniverseService } from './services/universe.service';
import { NationalCompetitionService } from './services/national-competition.service';
import { InternationalCompetitionService } from './services/international-competition.service';
import { SeasonService } from './services/season.service';
import { LeagueTableComponent } from './components/league-table/league-table.component';
import { FixturesComponent } from './components/fixtures/fixtures.component';
import { PlayerStatsComponent } from './components/player-stats/player-stats.component';
import { CupViewComponent } from './components/cup-view/cup-view.component';
import { MatchDetailsModalComponent } from './components/round-summary-modal/round-summary-modal.component';
import { HistoryViewComponent } from './components/history-view/history-view.component';
import { TeamsViewComponent } from './components/teams-view/teams-view.component';
import { TransfersViewComponent } from './components/transfers-view/transfers-view.component';
import { PlayerDetailsModalComponent } from './components/player-details-modal/player-details-modal.component';
import { TeamDetailsModalComponent } from './components/team-details-modal/team-details-modal.component';
import { InternationalCompetitionViewComponent } from './components/international-competition-view/international-competition-view.component';
import { RecordsViewComponent } from './components/records-view/records-view.component';
import { NewsCenterComponent } from './components/news-center/news-center.component';
import { DivisionSetupComponent } from './components/division-setup/division-setup.component';
import { Match, Player, Team, H2HData, Division, PlayerOfTheRound, CupMatch, League, InternationalCompetition } from './models';
import { NATIONALITIES } from './nationalities.data';
import { OverallColorPipe } from './pipes/overall-color.pipe';
import { AnalysisCenterComponent } from './components/analysis-center/analysis-center.component';
import { RivalriesComponent } from './components/rivalries/rivalries.component';
import { GlobalScoutComponent } from './components/global-scout/global-scout.component';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';

import { customPlayersData } from './data';

import { NextGenHubComponent } from './components/next-gen-hub/next-gen-hub.component';
import { LegendsHallComponent } from './components/legends-hall/legends-hall.component';
import { ReportsComponent } from './components/reports/reports.component';
import { GameStateService } from './services/game-state.service';
import { SeasonLifecycleService } from './services/season-lifecycle.service';
import { FirebasePersistenceService } from './services/firebase-persistence.service';
import { SqlitePersistenceService } from './services/sqlite-persistence.service';
import { provideHttpClient } from '@angular/common/http';
import { ApiTestComponent } from './components/api-test.component';
import { SaveLoadMenuComponent } from './components/save-load-menu/save-load-menu.component';
import { SavesManagerComponent } from './components/saves-manager/saves-manager.component';
import { TransferHistoryComponent } from './components/transfer-history/transfer-history.component';
import { MatchResultModalComponent, MatchResultData } from './components/match-result-modal/match-result-modal.component';


declare global {
  interface Document {
    startViewTransition(callback: () => void): { ready: Promise<void>, finished: Promise<void>, updateCallbackDone: Promise<void> };
  }
}

type Continent = 'EUR' | 'SAM' | 'NCA' | 'ASI' | 'AFR';
type View = 'main_menu' | 'saves_manager' | 'news_center' | 'teams_hub' | 'teams_global' | 'global_transfers' | 'transfer_history' | 'league_rankings' | 'analysis_center' | 'rivalries' | 'global_scout' | 'next_gen_hub' | 'legends_hall' | 'reports' | 'hall_of_fame' | 'best_player_history' | 'records' | 'trophy_gallery' | 'youth_cl_history' | 'world_cwc_history' | 'eur_cl_history' | 'continents' | 'continent_menu' | 'national_leagues' | 'international_leagues' | 'club_world_cup' | 'end_of_season' | 'recopa' | 'supercup' | 'api_test';
type SamTab = 'libertadores' | 'sulamericana';
type EurTab = 'cl' | 'el' | 'eul' | 'ycl';
type MainLeagueView = 'league' | 'cup' | 'league_cup' | 'supercup' | 'history' | 'teams' | 'transfers' | 'calendar';


interface FeaturedMatch {
  match: Match;
  leagueName: string;
  leagueCountryId: string;
  rankA: number;
  rankB: number;
}

interface QuickRanking {
  leagueName: string;
  leagueCountryId: string;
  teams: {
    rank: number;
    team: Team;
  }[];
}

interface PlayerOfTheRoundWithScore extends PlayerOfTheRound {
  score: number;
  isGoalkeeper: boolean;
}

import { SaveSelectionComponent } from './components/save-selection/save-selection.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LeagueTableComponent, FixturesComponent, PlayerStatsComponent, CupViewComponent, MatchDetailsModalComponent, HistoryViewComponent, TeamsViewComponent, TransfersViewComponent, PlayerDetailsModalComponent, TeamDetailsModalComponent, InternationalCompetitionViewComponent, RecordsViewComponent, NewsCenterComponent, OverallColorPipe, DivisionSetupComponent, AnalysisCenterComponent, RivalriesComponent, GlobalScoutComponent, CalendarViewComponent, NextGenHubComponent, LegendsHallComponent, ReportsComponent, ApiTestComponent, SaveLoadMenuComponent, SavesManagerComponent, TransferHistoryComponent, MatchResultModalComponent, SaveSelectionComponent],
})
export class AppComponent implements OnInit {
  universeService = inject(UniverseService);
  nationalCompetitionService = inject(NationalCompetitionService);
  internationalCompetitionService = inject(InternationalCompetitionService);
  seasonService = inject(SeasonService);
  gameStateService = inject(GameStateService);
  lifecycle = inject(SeasonLifecycleService);
  firebaseService = inject(FirebasePersistenceService);
  sqliteService = inject(SqlitePersistenceService);
  titleService = inject(Title);
  meta = inject(Meta);
  cdr = inject(ChangeDetectorRef);


  // --- SIGNALS STATE ---
  isSetupComplete = signal<boolean>(false);
  isGameLoaded = signal<boolean>(false); // Controla se um save foi aberto ou novo jogo iniciado

  handleSaveSelected(saveId: string) {
    this.isLoading.set(true);
    this.loadStatus.set('loading');
    this.cdr.detectChanges(); // Forçar renderização imediata
    
    // Pequeno delay para garantir que o Angular renderize o overlay de loading
    setTimeout(() => {
      this.firebaseService.loadSave(saveId).then(async state => {
        if (state) {
          // Definir o ID do save no lifecycle
          this.lifecycle.setSaveId(saveId);
          
          // Injetar o estado no Universo
          this.universeService.loadFromFirebaseState(state);
          
          // Injetar o estado na UI
          this.isGameLoaded.set(true);
          this.isSetupComplete.set(true);
          
          // Sincronizar UI
          this.lifecycle.syncStateAfterLoad();
          
          this.loadStatus.set('success');
          await new Promise(r => setTimeout(r, 1000));
          this.isLoading.set(false);
          this.loadStatus.set('idle');
        } else {
          this.loadStatus.set('error');
          await new Promise(r => setTimeout(r, 2000));
          this.isLoading.set(false);
          this.loadStatus.set('idle');
        }
      });
    }, 50);
  }

  handleStartNewGame() {
    this.isGameLoaded.set(true);
    this.isSetupComplete.set(false); // Forçar setup inicial
  }
  view = signal<View>('main_menu');

  changeView(newView: View) {
    if (!document.startViewTransition) {
      this.view.set(newView);
      return;
    }
    document.startViewTransition(() => {
      this.view.set(newView);
    });
  }

  selectedContinent = signal<Continent | null>(null);
  selectedLeagueId = signal<string | null>(null);
  currentYear = new Date().getFullYear();
  rivalsMap = signal<Map<string, string>>(new Map());

  // Signals para controlar o estado da UI
  mainView = signal<MainLeagueView>('league');
  activeDivisionTab = signal<number>(0); // 0 for Primera, 1 for Segunda
  activeInfoTab = signal<'fixtures' | 'stats'>('fixtures');
  samActiveTab = signal<SamTab>('libertadores');
  eurActiveTab = signal<EurTab>('cl');
  selectedMatchForDetails = signal<{ match: Match; h2h: H2HData } | null>(null);
  selectedPlayerForDetails = signal<{ player: Player, team: Team } | null>(null);
  selectedTeamForDetails = signal<Team | null>(null);
  manualResultModalData = signal<MatchResultData | null>(null);
  playerOfTheRound = signal<PlayerOfTheRound | null>(null);
  teamOfTheRound = signal<{ goalkeeper: PlayerOfTheRound | null, outfielders: PlayerOfTheRound[] }>({ goalkeeper: null, outfielders: [] });
  quickRankingLeagueId = signal<string>('BRA');
  showSaveMenu = signal(false);
  showSaveSelection = signal(false); // NOVO: Controla modal de saves
  isProcessingSeason = signal(false);
  isSaving = signal(false);
  isLoading = signal(false);
  saveStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  loadStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  isSeasonSummaryVisible = signal(false); // Gatekeeper para a tela de gala/resumo

  private nationalityMap = new Map<string, string>(NATIONALITIES.map(n => [n.code3, n.code2]));





  async ngOnInit(): Promise<void> {
    if (typeof window !== 'undefined') {
      (window as any).appComponent = this;
    }
    this.titleService.setTitle('Futebol Universe');

    this.isLoading.set(true);
    this.loadStatus.set('loading');

    setTimeout(async () => {
      try {
        // Inicializar banco de dados/API
        await this.sqliteService.initDatabase();

        const setupDone = typeof window !== 'undefined' && localStorage.getItem('futsal_setup_complete') === 'true';
        this.isSetupComplete.set(setupDone);

        if (setupDone) {
          console.log('🏁 Setup complete detected. Carregando estado do jogo...');
          
          // ✅ PRIORIDADE 1: Carregar do sistema de saves por slots (/api/saves)
          const saves = await this.sqliteService.listSaves();

          if (saves && saves.length > 0) {
            const latestSave = saves[0];
            const saveData = await this.sqliteService.loadSave(latestSave.id);

            if (saveData) {
              this.gameStateService.importGameState(saveData);
              if (this.universeService.leagues().length === 0 && this.universeService.teams().length > 0) {
                this.universeService.setupLeagues();
              }
              this.activeSaveId.set(latestSave.id);
              this.lifecycle.syncStateAfterLoad();
            }
          } else {
            // ✅ FALLBACK: Sistema antigo de snapshots por temporada
            const latestSeason = await this.sqliteService.getLatestSeason();
            if (latestSeason > 0) {
              const seasonData = await this.sqliteService.loadSeasonState(latestSeason);
              if (seasonData) {
                this.gameStateService.importGameState(seasonData);
                if (this.universeService.leagues().length === 0 && this.universeService.teams().length > 0) {
                  this.universeService.setupLeagues();
                }
                this.lifecycle.syncStateAfterLoad();
              }
            } else {
              this.universeService.initializeTeams();
              this.universeService.setupLeagues();
              this.universeService.setupInternationalCompetitions();
            }
          }
        } else {
          await this.universeService.initializeUniverse();
        }
        
        this.loadStatus.set('success');
        await new Promise(r => setTimeout(r, 800));
      } catch (error) {
        console.error('❌ Erro ao carregar jogo na inicialização:', error);
        this.loadStatus.set('error');
        await new Promise(r => setTimeout(r, 1500));
        // Fallback
        this.universeService.initializeTeams();
        this.universeService.setupLeagues();
        this.universeService.setupInternationalCompetitions();
      } finally {
        this.isLoading.set(false);
        this.loadStatus.set('idle');
      }
    }, 50);
  }

  forceReset() {
    if (confirm('Deseja REALMENTE resetar TODO o universo? Isso apagará o progresso atual e forçará o carregamento dos novos dados (Espanha real, etc).')) {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        // Limpar banco de dados backend também
        this.sqliteService.clearAllData().then(() => {
          console.log('✅ Banco de dados backend resetado.');
          // Recarregar a página para limpar todos os estados e sinais
          window.location.reload();
        }).catch(err => {
          console.error('❌ Erro ao resetar banco backend:', err);
          window.location.reload();
        });
      }
    }
  }

  constructor() {
    // Autostart season removed to allow summary view
    /*
    effect(() => {
      if (this.isNewSeasonAvailable() && !this.isProcessingSeason()) {
        console.log('🔄 Avanço automático de temporada detectado!');
        this.startNewSeason();
      }
    });
    */

    if (typeof window !== 'undefined') {
      const savedRivals = localStorage.getItem('futsal_rivals');
      if (savedRivals) {
        try {
          this.rivalsMap.set(new Map(JSON.parse(savedRivals)));
        } catch (e) {
          console.error('Failed to parse rivals from localStorage', e);
        }
      }
    }
  }

  featuredMatches = computed<FeaturedMatch[]>(() => {
    const leagues = this.universeService.leagues();
    const matches: FeaturedMatch[] = [];
    const featuredTeamIds = new Set<string>();
    const majorLeagueIds = ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'BRA', 'ARG', 'POR', 'NED', 'USA', 'MEX', 'JPN'];

    // --- Phase 1: Find top-of-the-table clashes ---
    for (const leagueId of majorLeagueIds) {
      if (matches.length >= 3) break;

      const league = leagues.find(l => l.countryId === leagueId && l.status === 'ongoing');
      if (!league) continue;

      const division = league.divisions[0];
      if (!division || division.teams.length < 8) continue;

      const standings = [...division.teams].sort(this.universeService.sortTeams);
      const top8TeamIds = new Set(standings.slice(0, 8).map(t => t.id));

      const fixtures = division.fixtures[league.currentRound];
      if (!fixtures) continue;

      for (const match of fixtures) {
        if (matches.length >= 3) break;

        const isTopClash = top8TeamIds.has(match.homeTeam.id) && top8TeamIds.has(match.awayTeam.id);
        const teamsAreNew = !featuredTeamIds.has(match.homeTeam.id) && !featuredTeamIds.has(match.awayTeam.id);

        if (!match.played && isTopClash && teamsAreNew) {
          const rankA = standings.findIndex(t => t.id === match.homeTeam.id) + 1;
          const rankB = standings.findIndex(t => t.id === match.awayTeam.id) + 1;
          matches.push({ match, leagueName: league.countryName, leagueCountryId: league.countryId, rankA, rankB });
          featuredTeamIds.add(match.homeTeam.id);
          featuredTeamIds.add(match.awayTeam.id);
        }
      }
    }

    // --- Phase 2: Fill remaining slots with any other major league matches ---
    if (matches.length < 3) {
      for (const leagueId of majorLeagueIds) {
        if (matches.length >= 3) break;

        const league = leagues.find(l => l.countryId === leagueId && l.status === 'ongoing');
        if (!league) continue;

        const division = league.divisions[0];
        const fixtures = division.fixtures[league.currentRound];
        if (!fixtures) continue;

        const standings = [...division.teams].sort(this.universeService.sortTeams);

        for (const match of fixtures) {
          if (matches.length >= 3) break;
          const teamsAreNew = !featuredTeamIds.has(match.homeTeam.id) && !featuredTeamIds.has(match.awayTeam.id);

          if (!match.played && teamsAreNew) {
            const rankA = standings.findIndex(t => t.id === match.homeTeam.id) + 1;
            const rankB = standings.findIndex(t => t.id === match.awayTeam.id) + 1;
            matches.push({ match, leagueName: league.countryName, leagueCountryId: league.countryId, rankA, rankB });
            featuredTeamIds.add(match.homeTeam.id);
            featuredTeamIds.add(match.awayTeam.id);
          }
        }
      }
    }

    return matches;
  });

  leaguesForQuickRankingFilter = computed(() => {
    return this.universeService.leagues()
      .filter(l => l.divisions[0]?.teams.length >= 8)
      .map(l => ({ countryId: l.countryId, countryName: l.countryName }))
      .sort((a, b) => {
        const major = ['BRA', 'ESP', 'ENG', 'ITA', 'GER', 'ARG', 'FRA', 'POR', 'NED'];
        const aIsMajor = major.includes(a.countryId);
        const bIsMajor = major.includes(b.countryId);
        if (aIsMajor && !bIsMajor) return -1;
        if (!aIsMajor && bIsMajor) return 1;
        return a.countryName.localeCompare(b.countryName);
      });
  });

  quickRanking = computed<QuickRanking | null>(() => {
    const leagueId = this.quickRankingLeagueId();
    const league = this.universeService.leagues().find(l => l.countryId === leagueId);

    if (!league) return null;

    const division = league.divisions[0];
    if (!division || division.teams.length < 4) return null;

    const standings = [...division.teams].sort(this.universeService.sortTeams);

    const top4 = standings.slice(0, 4).map((team, index) => ({
      rank: index + 1,
      team
    }));

    return {
      leagueName: league.countryName,
      leagueCountryId: league.countryId,
      teams: top4
    };
  });

  visibleLeagues = computed(() => {
    const continent = this.selectedContinent();
    if (!continent) return [];

    const leagues = this.universeService.leagues()
      .filter(l => this.universeService.getContinentForLeague(l.countryId) === continent);

    // Ordenar por força da liga (overall médio da 1ª divisão)
    return leagues.sort((a, b) => {
      const getLeagueStrength = (league: any) => {
        const topDivision = league.divisions[0];
        if (!topDivision || topDivision.teams.length === 0) return 0;
        return topDivision.teams.reduce((sum: number, team: any) => sum + team.overall, 0) / topDivision.teams.length;
      };

      const strengthA = getLeagueStrength(a);
      const strengthB = getLeagueStrength(b);

      // Ordenar do mais forte para o mais fraco
      return strengthB - strengthA;
    });
  });

  selectedLeague = computed(() => {
    const leagueId = this.selectedLeagueId();
    if (!leagueId) return undefined;
    const league = this.visibleLeagues().find(l => l.countryId === leagueId);
    return league;
  });

  leagueRankings = computed(() => {
    return this.universeService.leagues()
      .map(league => {
        const topDivision = league.divisions[0];
        if (!topDivision || topDivision.teams.length === 0) {
          return null;
        }
        const averageOverall = Math.round(
          topDivision.teams.reduce((sum, team) => sum + team.overall, 0) / topDivision.teams.length
        );
        const continentCode = this.universeService.getContinentForLeague(league.countryId);
        const continentName = this.universeService.CONTINENT_NAMES[continentCode] || 'Desconhecido';
        const teamCount = topDivision.teams.length;

        return {
          countryId: league.countryId,
          countryName: league.countryName,
          averageOverall,
          continentName,
          teamCount
        };
      })
      .filter((l): l is { countryId: string; countryName: string; averageOverall: number; continentName: string, teamCount: number } => l !== null)
      .sort((a, b) => b.averageOverall - a.averageOverall);
  });

  selectedLeagueStrength = computed(() => {
    const league = this.selectedLeague();
    if (!league) return null;

    const topDivision = league.divisions[0];
    if (!topDivision || topDivision.teams.length === 0) {
      return null;
    }
    return Math.round(
      topDivision.teams.reduce((sum, team) => sum + team.overall, 0) / topDivision.teams.length
    );
  });

  selectedLeagueTeams = computed(() => {
    const league = this.selectedLeague();
    if (!league) return [];
    return league.divisions.flatMap(d => d.teams);
  });

  activeDivision = computed(() => {
    const league = this.selectedLeague();
    if (!league) return null;
    return league.divisions[this.activeDivisionTab()];
  });

  currentRoundDivisionFixtures = computed(() => {
    const league = this.selectedLeague();
    const division = this.activeDivision();
    if (!league || !division || league.status === 'finished' || league.status === 'waiting_international') return [];

    const roundIndex = league.currentRound;

    if (roundIndex >= division.fixtures.length) return [];

    return division.fixtures[roundIndex] || [];
  });

  activeDivisionAllFixtures = computed(() => {
    const division = this.activeDivision();
    if (!division) return [];
    return division.fixtures;
  });

  showAdvanceButton = computed(() => {
    const league = this.selectedLeague();
    if (!league || league.status === 'finished' || league.status === 'waiting_international') return false;

    const roundIndex = league.currentRound;
    const allFixtures = league.divisions.flatMap(d => d.fixtures[roundIndex] || []);

    return allFixtures.length > 0 && allFixtures.every(match => match.played);
  });

  isTransferWindowOpen = computed(() => {
    const leagues = this.universeService.leagues();
    if (leagues.length === 0) return true;

    // Se o usuário está jogando uma liga específica, a janela segue as regras dessa liga.
    const league = this.selectedLeague();
    if (league) {
      const anyMatchPlayed = league.divisions.some(d => d.fixtures.flat().some(m => m.played));
      return league.currentRound === 0 && !anyMatchPlayed;
    }

    // No Mercado Global, permitimos transações enquanto o mundo não entrou em "modo de jogo" pesado.
    // Verifica se mais da metade das ligas ainda está na rodada 0 e sem jogos realizados.
    const activeLeagues = leagues.filter(l => l.currentRound === 0 && !l.divisions.some(d => d.fixtures.flat().some(m => m.played)));
    return activeLeagues.length >= (leagues.length / 2);
  });

  continentName = computed(() => {
    const continentCode = this.selectedContinent();
    if (!continentCode) return '';
    return this.universeService.CONTINENT_NAMES[continentCode];
  });

  areNationalLeaguesFinished = computed(() => {
    const continent = this.selectedContinent();
    if (!continent) return false;
    const continentLeagues = this.universeService.leagues().filter(l => this.universeService.getContinentForLeague(l.countryId) === continent);
    return continentLeagues.length > 0 && continentLeagues.every(l => l.status !== 'ongoing');
  });

  areContinentalCompetitionsOngoingAndUnfinished = computed(() => {
    const continent = this.selectedContinent();
    const continentComps = this.selectedInternationalCompetitions();

    if (continent === 'EUR') {
      const cl = continentComps.find(c => c.id === 'EUR_CL');
      const el = continentComps.find(c => c.id === 'EUR_EL');
      const clActive = cl?.status === 'league' || cl?.status === 'knockout';
      const elActive = el?.status === 'league' || el?.status === 'knockout';
      const clDone = !cl || cl.status === 'finished';
      const elDone = !el || el.status === 'finished';
      // Aparece quando CL ou EL está ativa; some quando ambas terminaram
      return (clActive || elActive) && !(clDone && elDone);
    }

    if (continent === 'SAM') {
      const lib = continentComps.find(c => c.id === 'SAM_LIB');
      const sul = continentComps.find(c => c.id === 'SAM_SUL');
      const libActive = lib?.status === 'league' || lib?.status === 'knockout';
      const sulActive = sul?.status === 'league' || sul?.status === 'knockout';
      const libDone = !lib || lib.status === 'finished';
      const sulDone = !sul || sul.status === 'finished';
      return (libActive || sulActive) && !(libDone && sulDone);
    }

    if (continentComps.length === 0) return false;
    const hasStarted = this.areNationalLeaguesFinished();
    const notFinished = continentComps.some(c => c.status !== 'finished' && c.status !== 'pending');
    return hasStarted && notFinished;
  });

  selectedInternationalCompetitions = computed(() => {
    const continent = this.selectedContinent();
    if (!continent) return [];
    return this.universeService.internationalCompetitions().filter(c => c.continent === continent);
  });

  isAnyContinentalCompPending = computed(() => {
    return this.selectedInternationalCompetitions().some(c => c.status === 'pending');
  });

  isAnyNonSAM_EUR_Pending = computed(() => {
    const continent = this.selectedContinent();
    if (continent === 'SAM' || continent === 'EUR' || !continent) return false;
    return this.selectedInternationalCompetitions().some(c => c.status === 'pending');
  });

  libertadores = computed(() => {
    if (this.selectedContinent() !== 'SAM') return null;
    return this.selectedInternationalCompetitions().find(c => c.id === 'SAM_LIB') ?? null;
  });

  sulamericana = computed(() => {
    if (this.selectedContinent() !== 'SAM') return null;
    return this.selectedInternationalCompetitions().find(c => c.id === 'SAM_SUL') ?? null;
  });

  eur_cl = computed(() => {
    return this.universeService.internationalCompetitions().find(c => c.id === 'EUR_CL') ?? null;
  });

  eur_el = computed(() => {
    return this.universeService.internationalCompetitions().find(c => c.id === 'EUR_EL') ?? null;
  });


  recopa = computed(() => {
    return this.universeService.internationalCompetitions().find(c => c.id === 'SAM_REC') ?? null;
  });

  supercup = computed(() => {
    return this.universeService.internationalCompetitions().find(c => c.id === 'EUR_SUP') ?? null;
  });

  isRecopaAvailable = computed(() => {
    const lib = this.libertadores();
    const sul = this.sulamericana();
    const rec = this.recopa();
    return lib?.status === 'finished' && sul?.status === 'finished' && (rec?.status === 'pending' || rec?.status === 'knockout');
  });

  isSupercupAvailable = computed(() => {
    const cl = this.eur_cl();
    const el = this.eur_el();
    const sup = this.supercup();
    // Aparece se ambos terminaram e a Supercopa está pendente OU se está em andamento (para poder ver o placar)
    return cl?.status === 'finished' && el?.status === 'finished' && (sup?.status === 'pending' || sup?.status === 'knockout');
  });

  areEuropeanPlayoffsFinished = computed(() => {
    // Sem playoffs agora — CL e EL já entram direto na fase de liga
    return false;
  });

  isNewSeasonAvailable = computed(() => {
    const gamePhase = this.universeService.gamePhase();
    const wc = this.worldCup();
    
    // A nova temporada fica "disponível" quando a fase atual (seja regular ou copas) 
    // chega ao fim com o Mundial de Clubes ou Mundial de Seleções finalizado.
    const isWCFinished = wc?.status === 'finished';
    
    return isWCFinished;
  });

  isEndOfSeason = computed(() => {
    // A tela de campeões só aparece quando o usuário estiver no menu do continente
    return this.isNewSeasonAvailable() && this.view() === 'continent_menu';
  });

  showSeasonSummary(): void {
    this.isSeasonSummaryVisible.set(true);
    this.view.set('continent_menu');
  }

  isQualifierPending = computed(() => false);
  isWorldCupPending = computed(() => false);

  teamsHubInitialTab = signal<'season' | 'career' | 'ranking' | 'titles' | null>(null);

  isWorldCupAvailable = computed(() => {
    const intComps = this.universeService.internationalCompetitions();
    const requiredCompIds = ['EUR_CL', 'SAM_LIB', 'NCA_CL', 'ASI_CL'];
    const finishedComps = intComps.filter(c => requiredCompIds.includes(c.id) && c.status === 'finished');
    const wc = this.worldCup();
    return finishedComps.length === requiredCompIds.length && (!wc || wc.status === 'pending');
  });

  worldCup = computed(() => {
    return this.universeService.internationalCompetitions().find(c => c.id === 'WORLD_CWC') ?? null;
  });

  isWorldCupCycleActive = computed(() => {
    return true; // Mundial de clubes é anual ou disponível se as continentais acabarem
  });





  internationalCompetitionsWithRankings = computed(() => {
    // IDs das competições a exibir (Mundial, Continentais Tier 1, 2 e 3)
    // CORRIGIDO: IDs corretos conforme universe.service.ts
    const displayIds = ['WORLD_CWC', 'EUR_CL', 'SAM_LIB', 'EUR_EL', 'SAM_SUL', 'EUR_SUP', 'SAM_REC', 'AFR_CL', 'ASI_CL', 'NCA_CL'];

    const displayOrder: { [key: string]: number } = {
      'WORLD_CWC': 1,
      'EUR_CL': 2, 'SAM_LIB': 3,
      'EUR_EL': 4, 'SAM_SUL': 5,
      'EUR_SUP': 6, 'SAM_REC': 7,
      'AFR_CL': 8, 'ASI_CL': 9, 'NCA_CL': 10
    };

    const allTeams = this.universeService.teams();
    const leagues = this.universeService.leagues();

    return this.universeService.internationalCompetitions()
      .filter(comp => displayIds.includes(comp.id))
      // Filtra duplicatas (caso haja bugs de criação duplicada como no EUR_SUP)
      .filter((comp, index, self) => index === self.findIndex((t) => t.id === comp.id))
      .map(comp => {
        const rankings: { team: { id: string, name: string, countryName?: string }, count: number }[] = [];
        allTeams.forEach(team => {
          const trophy = team.trophies?.find(t => t.name === comp.name);
          if (trophy && trophy.count > 0) {

            // Buscar nome do país
            let cName = '';

            // 1. Pelo ID da Liga
            const league = leagues.find(l =>
              l.divisions.some(d => d.teams.some((t: any) => (typeof t === 'string' ? t === team.id : t.id === team.id)))
            );

            if (league) {
              cName = league.countryName;
            } else if (team.countryId) {
              // 2. Fallback pelo countryId
              const l2 = leagues.find(l => l.countryId === team.countryId);
              cName = l2 ? l2.countryName : team.countryId;
            }

            rankings.push({
              team: { id: team.id, name: team.teamName, countryName: cName },
              count: trophy.count
            });
          }
        });

        return {
          ...comp,
          rankings: rankings.sort((a, b) => b.count - a.count)
        };
      })
      .filter(comp => comp.rankings.length > 0)
      .sort((a, b) => (displayOrder[a.id] || 99) - (displayOrder[b.id] || 99));
  });

  nationalTeamCompetitionsWithRankings = computed(() => {
    const nationalCompIds = ['WC_FINALS', 'AFR_NC', 'ASI_NC', 'NCA_GC'];

    return this.universeService.internationalCompetitions()
      .filter(comp => nationalCompIds.includes(comp.id) && comp.rankings.length > 0)
      .map(comp => ({
        ...comp,
        rankings: [...comp.rankings].sort((a, b) => b.count - a.count)
      }))
      .sort((a, b) => {
        const order: { [key: string]: number } = { 'WC_FINALS': 1, 'AFR_NC': 4, 'ASI_NC': 5, 'NCA_GC': 6 };
        return (order[a.id] || 99) - (order[b.id] || 99);
      });
  });

  // -- EDITOR DE TROFÉUS DE SELEÇÕES --
  showNationalTeamTrophyEditor = signal(false);
  editingNationalTrophy = signal<{ name: string, id: string } | null>(null);

  nationalTeamsForEditor = computed(() => {
    const trophy = this.editingNationalTrophy();
    if (!trophy) return [];

    let continentFilter: string | null = null;
    

    if (trophy.id === 'AFR_NC') continentFilter = 'AFR';
    else if (trophy.id === 'ASI_NC') continentFilter = 'ASI';
    else if (trophy.id === 'NCA_GC') continentFilter = 'NCA';

    // Obter todas as "nações" (ligas)
    let nations = this.universeService.leagues().map(l => ({
      id: l.countryId, // O ID da seleção é geralmente o código do país
      teamName: l.countryName,
      continent: this.universeService.getContinentForLeague(l.countryId)
    }));

    if (continentFilter) {
      nations = nations.filter(n => n.continent === continentFilter);
    }

    // Adicionar também seleções que já estão no ranking mas talvez não tenham liga associada
    const comp = this.universeService.internationalCompetitions().find(c => c.id === trophy.id);
    if (comp) {
      comp.rankings.forEach(r => {
        if (!nations.find(n => n.id === r.team.id)) {
          nations.push({
            id: r.team.id,
            teamName: r.team.teamName,
            continent: ''
          });
        }
      });
    }

    return nations.sort((a, b) => a.teamName.localeCompare(b.teamName));
  });

  openNationalTeamTrophyEditor(name: string, id: string) {
    this.editingNationalTrophy.set({ name, id });
    this.showNationalTeamTrophyEditor.set(true);
  }

  closeNationalTeamTrophyEditor() {
    this.showNationalTeamTrophyEditor.set(false);
    this.editingNationalTrophy.set(null);
  }

  getNationalTeamTrophyCount(team: any): number {
    const trophy = this.editingNationalTrophy();
    if (!trophy) return 0;

    const comp = this.universeService.internationalCompetitions().find(c => c.id === trophy.id);
    if (!comp) return 0;

    const ranking = comp.rankings.find(r => r.team.id === team.id);
    return ranking ? ranking.count : 0;
  }

  updateNationalTeamTrophyCount(team: any, change: number) {
    const trophy = this.editingNationalTrophy();
    if (!trophy) return;

    const comps = this.universeService.internationalCompetitions();
    const compIndex = comps.findIndex(c => c.id === trophy.id);

    if (compIndex === -1) return;

    const updatedComps = [...comps];
    const comp = { ...updatedComps[compIndex] }; // Clone shallow

    // Clonar rankings para não mutar original diretamente
    let rankings = comp.rankings ? [...comp.rankings] : [];
    const rankingIndex = rankings.findIndex(r => r.team.id === team.id);

    if (rankingIndex !== -1) {
      // Atualizar existente
      const newCount = rankings[rankingIndex].count + change;
      if (newCount <= 0) {
        // Remover se zero
        rankings = rankings.filter((_, i) => i !== rankingIndex);
      } else {
        rankings[rankingIndex] = { ...rankings[rankingIndex], count: newCount };
      }
    } else if (change > 0) {
      // Adicionar novo
      rankings.push({
        team: { id: team.id, teamName: team.teamName },
        count: change
      });
    }

    comp.rankings = rankings;
    updatedComps[compIndex] = comp;

    // Atualizar estado global
    this.universeService.internationalCompetitions.set(updatedComps);
  }





  async onSetupComplete(assignments: Map<string, string[]>): Promise<void> {
    console.log('🔄 Finalizando setup e iniciando persistência...');
    this.universeService.initializeLeagues(assignments);

    // PERSISTÊNCIA INICIAL: Salvamos o estado inicial no SQLite ANTES de marcar como completo
    try {
      const currentSeason = this.universeService.season() || 1;
      const teams = this.universeService.teams();
      const leagues = this.universeService.leagues();

      console.log(`💾 Tentando salvar setup inicial (Temporada ${currentSeason})...`);
      await this.sqliteService.saveSeasonState(currentSeason, teams, leagues);

      console.log('🏁 Persistência concluída! Ativando modo jogo.');

      if (typeof window !== 'undefined') {
        localStorage.setItem('futsal_setup_complete', 'true');
      }
      this.isSetupComplete.set(true);

      // Iniciar o lifecycle da temporada 1
      await this.lifecycle.startSeason();
    } catch (err) {
      console.error('❌ Falha crítica ao persistir setup inicial:', err);
      alert('Erro ao salvar no banco de dados. Verifique se o backend está rodando na porta 3008.');
    }
  }

  toggleSaveMenu() {
    console.log('📂 Abrindo menu de gestão de progresso...');
    this.showSaveMenu.update(v => !v);
  }

  selectQuickRankingLeague(countryId: string): void {
    this.quickRankingLeagueId.set(countryId);
  }
  // --- HELPERS ---
  getDivisionDisplayName(league: any, division: any): string {
    if (!league || !division) return '';
    const countryId = league.countryId;
    if (countryId === 'ENG') {
      if (division.name === 'Primeira Divisão') return 'Premier League';
      if (division.name === 'Segunda Divisão') return 'EFL Championship';
      if (division.name === 'Terceira Divisão') return 'EFL League One';
      if (division.name === 'Quarta Divisão') return 'EFL League Two';
    }
    if (countryId === 'ESP') {
      if (division.name === 'Primeira Divisão') return 'La Liga';
      if (division.name === 'Segunda Divisão') return 'Segunda División';
    }
    if (countryId === 'BRA') {
      if (division.name === 'Primeira Divisão') return 'Série A';
      if (division.name === 'Segunda Divisão') return 'Série B';
    }
    return division.name;
  }

  getCupDisplayName(countryId: string): string {
    if (countryId === 'BRA') return 'Copa do Brasil';
    if (countryId === 'ENG') return 'FA Cup';
    if (countryId === 'ESP') return 'Copa del Rey';
    return 'Copa';
  }

  getLeagueCupDisplayName(countryId: string): string {
    if (countryId === 'ENG') return 'EFL Cup';
    if (countryId === 'ESP') return 'Copa de la Liga';
    if (countryId === 'BRA') return 'Série E Play-offs';
    if (countryId === 'USA') return 'MLS Cup';
    return 'Copa da Liga';
  }

  getSupercupDisplayName(countryId: string): string {
    if (countryId === 'ENG') return 'Community Shield';
    if (countryId === 'ESP') return 'Supercopa de España';
    if (countryId === 'BRA') return 'Supercopa do Brasil';
    return 'Supercopa';
  }


  getFlagUrl(countryId: string): string {
    const code2 = this.nationalityMap.get(countryId?.toUpperCase());
    if (code2) {
      // Usando w320 para garantir alta qualidade em todos os tamanhos de tela
      return `https://flagcdn.com/w320/${code2.toLowerCase()}.png`;
    }
    return '';
  }

  selectContinent(continent: Continent): void {
    if (continent !== 'EUR' && continent !== 'SAM' && continent !== 'AFR' && continent !== 'NCA' && continent !== 'ASI') return;
    this.selectedContinent.set(continent);
    this.view.set('continent_menu');
  }

  goBack(): void {
    const currentView = this.view();
    if (currentView === 'national_leagues' || currentView === 'international_leagues' || currentView === 'club_world_cup' || currentView === 'end_of_season' || currentView === 'recopa' || currentView === 'supercup') {
      this.view.set('continent_menu');
      this.selectedLeagueId.set(null);
    } else if (currentView === 'continent_menu') {
      this.view.set('continents');
      this.selectedContinent.set(null);
    } else if (currentView === 'teams_global' || currentView === 'league_rankings' || currentView === 'analysis_center' || currentView === 'rivalries' || currentView === 'global_scout' || currentView === 'next_gen_hub' || currentView === 'global_transfers' || currentView === 'transfer_history') {
      this.view.set('teams_hub');
    } else if (currentView === 'continents' || currentView === 'hall_of_fame' || currentView === 'news_center' || currentView === 'teams_hub' || currentView === 'api_test' || currentView === 'reports') {
      this.view.set('main_menu');
    } else if (currentView === 'best_player_history' || currentView === 'records' || currentView === 'trophy_gallery' || currentView === 'youth_cl_history' || currentView === 'world_cwc_history' || currentView === 'eur_cl_history' || currentView === 'legends_hall') {
      this.view.set('hall_of_fame');
    }
  }

  getSortedTeams(teams: Team[]): Team[] {
    if (!teams) return [];
    return [...teams].sort(this.universeService.sortTeams);
  }

  getInternationalComp(id: string): InternationalCompetition | undefined {
    return this.universeService.internationalCompetitions().find(c => c.id === id);
  }

  showNationalLeagues(): void {
    this.view.set('national_leagues');
    const firstLeagueId = this.visibleLeagues()[0]?.countryId || null;
    if (firstLeagueId) {
      this.selectLeague(firstLeagueId);
    } else {
      this.selectedLeagueId.set(null);
    }
  }

  openTeamsHub(tab: 'season' | 'ranking' | 'titles' | null): void {
    this.teamsHubInitialTab.set(tab);
    this.view.set('teams_global');
  }

  showInternationalLeagues(): void {
    this.view.set('international_leagues');
  }

  showWorldCup(): void {
    const wc = this.worldCup();
    if (!wc || wc.status === 'pending') {
      this.internationalCompetitionService.startWorldCup();
    }
    this.selectedContinent.set(null);
    this.view.set('club_world_cup');
  }


  showRecopa(): void {
    this.internationalCompetitionService.startRecopa();
    this.view.set('recopa');
  }

  showSupercup(): void {
    this.internationalCompetitionService.startSupercup();
    this.view.set('supercup');
  }





  startInternationalCompetition(): void {
    const continent = this.selectedContinent();
    if (continent) {
      if (continent === 'AFR' || continent === 'ASI' || continent === 'NCA' || continent === 'SAM' || continent === 'EUR') {
        this.internationalCompetitionService.startInternationalCompetition(continent);
        this.view.set('international_leagues');
      }
    }
  }

  startGroupStages(): void {
    if (this.selectedContinent() === 'SAM') {
      this.internationalCompetitionService.startSouthAmericaGroupStages();
    }
  }

  startEuropeGroupStages(): void {
    this.internationalCompetitionService.startEuropeGroupStages();
  }

  startYouthChampionsLeague(): void {
    this.internationalCompetitionService.setupYouthChampionsLeague();
    this.view.set('international_leagues');
    this.eurActiveTab.set('ycl');
  }



  async startNewSeason(): Promise<void> {
    this.isSeasonSummaryVisible.set(false); // Reseta o gatekeeper
    if (this.isProcessingSeason()) return;
    this.isProcessingSeason.set(true);

    try {
      console.log(`🚀 Iniciando transição da temporada ${this.universeService.season()} para ${this.universeService.season() + 1}...`);

      // 1. Finalizar temporada anterior no lifecycle (SALTO TOTAL PARA EVITAR TRAVAS)
      try {
        console.log('🏁 Tentando finalizar temporada no lifecycle...');
        await this.lifecycle.endSeason();
      } catch (e) {
        console.warn('⚠️ Lifecycle bloqueado ou erro no fim da temporada. Ignorando e seguindo transição em memória.');
      }

      // 2. Processar mudança de temporada na memória
      try {
        this.seasonService.startNewSeason();
      } catch (sErr: any) {
        console.error('❌ Erro no SeasonService.startNewSeason:', sErr);
        throw new Error(`Erro ao processar dados da nova temporada: ${sErr.message}`);
      }

      try {
        this.internationalCompetitionService.setupYouthChampionsLeague();
      } catch (yErr: any) {
        console.error('❌ Erro no setupYouthChampionsLeague:', yErr);
        // Não jogamos erro aqui pois YCL é opcional
      }

      // 3. Iniciar nova temporada no lifecycle
      try {
        await this.lifecycle.startSeason();
      } catch (lErr: any) {
        console.error('❌ Erro no lifecycle.startSeason:', lErr);
      }

      console.log('✅ Transição de temporada concluída com sucesso!');
      this.view.set('national_leagues');
    } catch (err: any) {
      this.isProcessingSeason.set(false);
      let errorMessage = 'Erro desconhecido';
      try {
        errorMessage = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
      } catch (e) {
        errorMessage = 'Erro complexo (circular). Verifique o console.';
      }
      console.error('❌ Erro crítico na transição de temporada:', err);
      alert(`[V3] Erro crítico na transição: ${errorMessage}. Verifique o console para detalhes.`);
    } finally {
      this.isProcessingSeason.set(false);
    }
  }



  selectLeague(leagueId: string): void {
    this.selectedLeagueId.set(leagueId);
    this.playerOfTheRound.set(null);
    this.teamOfTheRound.set({ goalkeeper: null, outfielders: [] });
    // Reset views when changing league
    this.mainView.set('league');
    this.activeDivisionTab.set(0);
    this.activeInfoTab.set('fixtures');
    this.selectedMatchForDetails.set(null);
  }

  // FIX: Converted to async to handle asynchronous simulation and database updates.
  async simulateDivisionRound(): Promise<void> {
    const leagueId = this.selectedLeagueId();
    const divisionIndex = this.activeDivisionTab();
    if (leagueId) {
      this.playerOfTheRound.set(null);
      this.teamOfTheRound.set({ goalkeeper: null, outfielders: [] });

      const league = this.selectedLeague();
      const currentRoundBefore = league?.currentRound || 0;

      // FIX: Added await as the method is now async.
      await this.nationalCompetitionService.simulateDivisionRound(leagueId, divisionIndex);

      const division = this.activeDivision();
      if (league && division) {
        const roundFixtures = division.fixtures[league.currentRound] || [];
        this.calculateRoundPerformances(roundFixtures);

        // SALVAR RODADA NO SQLITE (via lifecycle)
        await this.lifecycle.saveRound(league.currentRound + 1);
      }
    }

  }

  private calculateRoundPerformances(matches: Match[]): void {
    const performances: PlayerOfTheRoundWithScore[] = [];

    for (const match of matches) {
      if (!match.played) continue;

      const allPlayersInMatch = [
        ...match.homeTeam.players.map(p => ({ player: p, team: match.homeTeam, isGoalkeeper: p.isGoalkeeper })),
        ...match.awayTeam.players.map(p => ({ player: p, team: match.awayTeam, isGoalkeeper: p.isGoalkeeper }))
      ];

      const isHomeWinner = match.homeScore! > match.awayScore!;
      const isAwayWinner = match.awayScore! > match.homeScore!;

      for (const { player, team, isGoalkeeper } of allPlayersInMatch) {
        const goals = match.events.goals.filter(g => g.player.id === player.id).length;
        const assists = match.events.assists.filter(a => a.player.id === player.id).length;
        const isMotm = match.events.motm?.id === player.id;

        let score = 0;
        const isWinner = (team.id === match.homeTeam.id && isHomeWinner) || (team.id === match.awayTeam.id && isAwayWinner);

        if (isGoalkeeper) {
          const goalsConceded = team.id === match.homeTeam.id ? match.awayScore! : match.homeScore!;
          if (goalsConceded === 0) {
            score += 8; // Clean sheet bonus
          }
          if (isWinner) {
            score += 4; // Win bonus
          }
          score -= goalsConceded; // Penalty for goals conceded
          if (isMotm) {
            score += 5;
          }
        } else {
          // Outfielder scoring
          score = (goals * 5) + (assists * 3);
          if (isMotm) {
            score += 5;
          }
          if (isWinner) {
            score += 2;
          }
        }

        if (score > 0 || isGoalkeeper) {
          performances.push({
            player,
            team,
            matchStats: { goals, assists, isMotm },
            score,
            isGoalkeeper
          });
        }
      }
    }

    if (performances.length === 0) {
      this.playerOfTheRound.set(null);
      this.teamOfTheRound.set({ goalkeeper: null, outfielders: [] });
      return;
    }

    // Set Player of the Round from the best overall performance
    const sortedPerformances = [...performances].sort((a, b) => b.score - a.score);
    this.playerOfTheRound.set(sortedPerformances[0]);

    // Set Team of the Round
    const goalkeepers = performances.filter(p => p.isGoalkeeper).sort((a, b) => b.score - a.score);
    const outfielders = performances.filter(p => !p.isGoalkeeper).sort((a, b) => b.score - a.score);

    const bestGoalkeeper = goalkeepers.length > 0 ? goalkeepers[0] : null;

    const uniqueOutfielders: PlayerOfTheRound[] = [];
    const seenPlayerIds = new Set<string>();

    if (bestGoalkeeper) {
      seenPlayerIds.add(bestGoalkeeper.player.id);
    }

    for (const p of outfielders) {
      if (uniqueOutfielders.length >= 4) break;
      if (!seenPlayerIds.has(p.player.id)) {
        uniqueOutfielders.push(p);
        seenPlayerIds.add(p.player.id);
      }
    }

    this.teamOfTheRound.set({
      goalkeeper: bestGoalkeeper,
      outfielders: uniqueOutfielders
    });
  }

  // FIX: Converted to async to handle asynchronous simulation and database updates.
  async onSimulateLeagueMatch(matchId: string): Promise<void> {
    const leagueId = this.selectedLeagueId();
    if (leagueId) {
      // FIX: Added await as the method is now async.
      await this.nationalCompetitionService.simulateLeagueMatch(leagueId, matchId);
    }
  }

  async onSetManualResult(match: Match): Promise<void> {
    const leagueId = this.selectedLeagueId();
    if (!leagueId) return;

    this.manualResultModalData.set({
      homeTeam: { id: match.homeTeam.id, name: match.homeTeam.teamName, logoUrl: this.universeService.getTeamCrest(match.homeTeam) },
      awayTeam: { id: match.awayTeam.id, name: match.awayTeam.teamName, logoUrl: this.universeService.getTeamCrest(match.awayTeam) },
      homeScore: match.homeScore || 0,
      awayScore: match.awayScore || 0,
      callback: (h, a) => {
        this.nationalCompetitionService.setLeagueMatchResult(leagueId, match.id, h, a);
      }
    });
  }

  async onSetManualCupResult(data: { match: CupMatch, roundName: string, leg: 1 | 2, cupType: 'main' | 'league' | 'supercup' }): Promise<void> {
    const leagueId = this.selectedLeagueId();
    if (!leagueId) return;

    this.manualResultModalData.set({
      homeTeam: { id: data.match.homeTeam.id, name: data.match.homeTeam.teamName, logoUrl: this.universeService.getTeamCrest(data.match.homeTeam) },
      awayTeam: { id: data.match.awayTeam.id, name: data.match.awayTeam.teamName, logoUrl: this.universeService.getTeamCrest(data.match.awayTeam) },
      homeScore: data.leg === 1 ? (data.match.homeScoreLeg1 ?? 0) : (data.match.homeScoreLeg2 ?? 0),
      awayScore: data.leg === 1 ? (data.match.awayScoreLeg1 ?? 0) : (data.match.awayScoreLeg2 ?? 0),
      leg: data.leg,
      callback: (h, a) => {
        this.nationalCompetitionService.setCupMatchResult(leagueId, data.match.id, data.roundName, data.leg, h, a, data.cupType);
      }
    });
  }

  async onSetInternationalManualResult(match: Match): Promise<void> {
    this.manualResultModalData.set({
      homeTeam: { id: match.homeTeam.id, name: match.homeTeam.teamName, logoUrl: this.universeService.getTeamCrest(match.homeTeam) },
      awayTeam: { id: match.awayTeam.id, name: match.awayTeam.teamName, logoUrl: this.universeService.getTeamCrest(match.awayTeam) },
      homeScore: match.homeScore || 0,
      awayScore: match.awayScore || 0,
      callback: (h, a) => {
        const continent = this.selectedContinent() as any;
        this.internationalCompetitionService.setInternationalLeagueMatchResult(continent, match.id, h, a);
      }
    });
  }

  async onSetInternationalManualCupResult(data: { match: CupMatch, roundName: string, leg: 1 | 2 }): Promise<void> {
    const currentView = this.view();
    let compId = '';
    
    if (currentView === 'club_world_cup') compId = 'WORLD_CWC';
    else if (currentView === 'recopa') compId = 'SAM_REC';
    else if (currentView === 'supercup') compId = 'EUR_SUP';
    else if (currentView === 'international_leagues') {
      compId = this.selectedContinent() === 'SAM'
        ? (this.samActiveTab() === 'libertadores' ? 'SAM_LIB' : 'SAM_SUL')
        : (this.eurActiveTab() === 'cl' ? 'EUR_CL' : this.eurActiveTab() === 'el' ? 'EUR_EL' : 'EUR_EUL');
    }

    if (!compId) return;

    this.manualResultModalData.set({
      homeTeam: { id: data.match.homeTeam.id, name: data.match.homeTeam.teamName, logoUrl: this.universeService.getTeamCrest(data.match.homeTeam) },
      awayTeam: { id: data.match.awayTeam.id, name: data.match.awayTeam.teamName, logoUrl: this.universeService.getTeamCrest(data.match.awayTeam) },
      homeScore: data.leg === 1 ? (data.match.homeScoreLeg1 ?? 0) : (data.match.homeScoreLeg2 ?? 0),
      awayScore: data.leg === 1 ? (data.match.awayScoreLeg1 ?? 0) : (data.match.awayScoreLeg2 ?? 0),
      leg: data.leg,
      callback: (h, a) => {
        this.internationalCompetitionService.setInternationalCupMatchResult(compId, data.match.id, data.roundName, data.leg, h, a);
      }
    });
  }

  advanceToNextRound(): void {
    const leagueId = this.selectedLeagueId();
    if (leagueId) {
      this.playerOfTheRound.set(null);
      this.teamOfTheRound.set({ goalkeeper: null, outfielders: [] });
      this.nationalCompetitionService.advanceToNextRound(leagueId);
    }
  }

  onViewMatchDetails(match: Match): void {
    const h2h = this.universeService.getHeadToHead(match.homeTeam.id, match.awayTeam.id);
    this.selectedMatchForDetails.set({ match, h2h });
  }

  onViewCupMatchDetails(event: { cupMatch: CupMatch; leg: 1 | 2 }): void {
    const { cupMatch, leg } = event;

    const homeTeam = leg === 1 ? cupMatch.homeTeam : cupMatch.awayTeam;
    const awayTeam = leg === 1 ? cupMatch.awayTeam : cupMatch.homeTeam;
    const homeScore = leg === 1 ? cupMatch.homeScoreLeg1 : cupMatch.homeScoreLeg2;
    const awayScore = leg === 1 ? cupMatch.awayScoreLeg1 : cupMatch.awayScoreLeg2;
    const events = leg === 1 ? cupMatch.eventsLeg1 : cupMatch.eventsLeg2;

    if (homeScore === undefined || awayScore === undefined || !events) {
      return; // Don't open modal if match data is incomplete
    }

    const matchForModal: Match = {
      id: `${cupMatch.id}-leg${leg}`,
      round: 0, // Not really applicable, but needed for type
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      homeScore: homeScore,
      awayScore: awayScore,
      played: true,
      divisionName: '', // Not applicable
      events: events,
    };

    const h2h = this.universeService.getHeadToHead(homeTeam.id, awayTeam.id);
    this.selectedMatchForDetails.set({ match: matchForModal, h2h });
  }

  onSimulateCupMatch(event: { matchId: string; roundName: string; leg: 1 | 2; cupType?: 'main' | 'league' | 'supercup' }): void {
    const currentView = this.view();

    if (currentView === 'club_world_cup') {
      const cwc = this.worldCup();
      if (cwc) {
        this.internationalCompetitionService.simulateInternationalCupMatch(cwc.id, event.matchId, event.roundName, event.leg);
      }
    } else if (currentView === 'recopa') {
      this.internationalCompetitionService.simulateInternationalCupMatch('SAM_REC', event.matchId, event.roundName, event.leg);
    } else if (currentView === 'supercup') {
      this.internationalCompetitionService.simulateInternationalCupMatch('EUR_SUP', event.matchId, event.roundName, event.leg);
    } else if (currentView === 'international_leagues') {
      const activeCompId = this.selectedContinent() === 'SAM'
        ? (this.samActiveTab() === 'libertadores' ? 'SAM_LIB' : 'SAM_SUL')
        : (this.eurActiveTab() === 'cl' ? 'EUR_CL' : 'EUR_EL');
      this.internationalCompetitionService.simulateInternationalCupMatch(activeCompId, event.matchId, event.roundName, event.leg);
    } else {
      const leagueId = this.selectedLeagueId();
      if (leagueId) {
        this.nationalCompetitionService.simulateCupMatch(leagueId, event.matchId, event.roundName, event.leg, event.cupType);
      }
    }
  }

  simulateCupRound(event: { roundName: string; cupType?: 'main' | 'league' | 'supercup' }): void {
    const currentView = this.view();

    if (currentView === 'club_world_cup') {
      const cwc = this.worldCup();
      if (cwc) {
        this.internationalCompetitionService.simulateInternationalCupRound(cwc.id, event.roundName);
      }
    } else if (currentView === 'recopa') {
      this.internationalCompetitionService.simulateInternationalCupRound('SAM_REC', event.roundName);
    } else if (currentView === 'supercup') {
      this.internationalCompetitionService.simulateInternationalCupRound('EUR_SUP', event.roundName);
    } else if (currentView === 'international_leagues') {
      const activeCompId = this.selectedContinent() === 'SAM'
        ? (this.samActiveTab() === 'libertadores' ? 'SAM_LIB' : 'SAM_SUL')
        : (this.eurActiveTab() === 'cl' ? 'EUR_CL' : this.eurActiveTab() === 'el' ? 'EUR_EL' : 'EUR_EUL');
      this.internationalCompetitionService.simulateInternationalCupRound(activeCompId, event.roundName);
    } else {
      const leagueId = this.selectedLeagueId();
      if (leagueId) {
        this.nationalCompetitionService.simulateCupRound(leagueId, event.roundName, event.cupType);
      }
    }
  }

  onViewPlayerDetails(data: { player: Player, team: Team }): void {
    this.selectedPlayerForDetails.set(data);
  }

  onSaveNationalTeamPlayerNumber(data: { playerId: string; clubTeamId: string; newNumber: number }): void {
    this.universeService.updateNationalTeamPlayerNumber(data.playerId, data.clubTeamId, data.newNumber);

  }

  onSavePlayerDetails(data: { player: Player, teamId: string }): void {
    this.universeService.updatePlayerDetails(data.player, data.teamId);
    this.selectedPlayerForDetails.set(null); // Close modal on save
  }

  onRenewContract(data: { player: Player; teamId: string; newLength: number }): void {
    this.universeService.renewPlayerContract(data.player.id, data.teamId, data.newLength);
    this.selectedPlayerForDetails.set(null);
  }

  onTerminateContract(data: { player: Player; teamId: string }): void {
    this.universeService.terminatePlayerContract(data.player.id, data.teamId);
    this.selectedPlayerForDetails.set(null);
  }

  onRetirePlayer(data: { player: Player; teamId: string }): void {
    this.universeService.retirePlayer(data.player.id, data.teamId);
    this.selectedPlayerForDetails.set(null);
  }

  onViewTeamDetails(team: Team): void {
    const rivalId = this.rivalsMap().get(team.id);
    const teamWithRivalData: Team = { ...team, rivalId };
    this.selectedTeamForDetails.set(teamWithRivalData);
  }

  onSaveTeamDetails(team: Team): void {
    const rivalId = team.rivalId;
    if (rivalId !== undefined) {
      this.rivalsMap.update(map => {
        const newMap = new Map(map);
        if (rivalId) {
          newMap.set(team.id, rivalId);
        } else {
          newMap.delete(team.id);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('futsal_rivals', JSON.stringify(Array.from(newMap.entries())));
        }
        return newMap;
      });
    }

    this.universeService.updateTeamDetails(team);
    this.selectedTeamForDetails.set(null);
  }

  async simulateFullContinentSeason() {
    const continent = this.selectedContinent();
    if (!continent || this.isProcessingSeason()) return;

    this.isProcessingSeason.set(true);
    
    try {
      // Pequeno delay para o overlay aparecer
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.nationalCompetitionService.simulateAllNationalLeagues(continent);
      this.internationalCompetitionService.startInternationalCompetition(continent);
      this.internationalCompetitionService.simulateAllContinentalCompetitions(continent);
      
      console.log('🏁 Simulação de continente finalizada!');
    } catch (err) {
      console.error('Erro na simulação massiva:', err);
    } finally {
      this.isProcessingSeason.set(false);
    }
  }

  async simulateAllNationalLeagues() {
    const continent = this.selectedContinent();
    if (!continent || this.isProcessingSeason()) return;
    
    this.isProcessingSeason.set(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      this.nationalCompetitionService.simulateAllNationalLeagues(continent);
    } finally {
      this.isProcessingSeason.set(false);
    }
  }

  async simulateAllContinentalCompetitions() {
    const continent = this.selectedContinent();
    if (!continent || this.isProcessingSeason()) return;

    this.isProcessingSeason.set(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      this.internationalCompetitionService.simulateAllContinentalCompetitions(continent);
    } finally {
      this.isProcessingSeason.set(false);
    }
  }

  onPromotePlayer(data: { player: Player; teamId: string }): void {
    this.universeService.promotePlayer(data.player.id, data.teamId);
    // Refresh team details modal if open
    if (this.selectedTeamForDetails()) {
      const updatedTeam = this.universeService.teams().find(t => t.id === data.teamId);
      if (updatedTeam) {
        this.selectedTeamForDetails.set(updatedTeam);
      }
    }
  }

  onReleasePlayer(data: { player: Player; teamId: string }): void {
    this.universeService.releasePlayer(data.player.id, data.teamId);
    // Refresh team details modal if open
    if (this.selectedTeamForDetails()) {
      const updatedTeam = this.universeService.teams().find(t => t.id === data.teamId);
      if (updatedTeam) {
        this.selectedTeamForDetails.set(updatedTeam);
      }
    }
  }

  async saveGame(name: string): Promise<void> {
    try {
      const currentSeason = this.universeService.season();
      const leagues = this.universeService.leagues();
      const playerTeam = leagues[0]?.divisions[0]?.teams[0]?.teamName || 'Minha Carreira';

      const activeSave = this.activeSaveId();

      const state = {
        season: currentSeason,
        teams: this.universeService.teams(),
        leagues: leagues,
        internationalComps: this.universeService.internationalCompetitions(),
        summaries: this.universeService.seasonSummaries(),
        userTeamName: playerTeam,
        description: name || (activeSave ? undefined : `Save ${new Date().toLocaleString('pt-BR')}`)
      };

      if (activeSave !== null) {
        // ✅ Já existe um save ativo: atualiza ele no Firebase
        console.log(`💾 Atualizando save ativo Firebase: ${activeSave}...`);
        await this.firebaseService.saveGame(String(activeSave), state);
        console.log(`✅ Save ${activeSave} atualizado com sucesso!`);
        alert('✅ Jogo salvo com sucesso no Firebase!');
      } else {
        // ✅ Nenhum save ativo ainda: cria um novo no Firebase
        const saveName = name || `Save ${new Date().toLocaleString('pt-BR')}`;
        const newSaveId = saveName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
        console.log(`💾 Criando novo save Firebase: "${saveName}"...`);
        
        await this.firebaseService.saveGame(newSaveId, { ...state, description: saveName });
        this.activeSaveId.set(newSaveId);
        this.lifecycle.setSaveId(newSaveId);
        console.log(`✅ Novo save "${saveName}" criado no Firebase!`);
        alert(`✅ Jogo salvo no Firebase como "${saveName}"!`);
      }

      await this.loadAvailableSaves();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      alert(`❌ Erro ao salvar o jogo.\n\n${errorMessage}`);
    }
  }

  async loadGame(gameState: any): Promise<void> {
    this.isLoading.set(true);
    this.loadStatus.set('loading');
    this.cdr.detectChanges(); // Forçar renderização imediata
    
    setTimeout(async () => {
      try {
        this.gameStateService.importGameState(gameState);
        this.lifecycle.syncStateAfterLoad();
        this.showSaveMenu.set(false);
        
        this.loadStatus.set('success');
        await new Promise(r => setTimeout(r, 1000));
      } catch (error: any) {
        console.error('Erro ao carregar:', error);
        this.loadStatus.set('error');
        await new Promise(r => setTimeout(r, 2000));
      } finally {
        this.isLoading.set(false);
        this.loadStatus.set('idle');
      }
    }, 50);
  }



  // 🔧 MIGRAÇÃO: Adicionar Supercopa a saves antigos
  migrateSupercupToExistingLeagues(): void {
    console.log('🔄 Iniciando migração da Supercopa...');

    const eligibleCountries = ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'RUS', 'POR', 'NED'];
    let migratedCount = 0;

    this.universeService.leagues.update(currentLeagues => {
      return currentLeagues.map(league => {
        // Verifica se a liga é elegível e ainda não tem supercopa
        if (eligibleCountries.includes(league.countryId) && !league.supercup) {
          console.log(`🏆 Criando Supercopa para ${league.countryName}...`);
          
          // Pega os 16 times da primeira divisão
          const primeraTeams = league.divisions[0]?.teams.slice(0, 16) || [];

          if (primeraTeams.length === 16) {
            // Embaralha os times
            const shuffledTeams = [...primeraTeams];
            for (let i = shuffledTeams.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
            }

            // Cria as Oitavas de Final
            const roundOf16Matches = [];
            for (let i = 0; i < 8; i++) {
              roundOf16Matches.push({
                id: `supercup-r16-${i}-${Date.now()}-${Math.random()}`,
                homeTeam: shuffledTeams[i * 2],
                awayTeam: shuffledTeams[i * 2 + 1],
                played: false,
                leg1Played: false,
                leg2Played: false,
              });
            }

            // Cria a estrutura da Supercopa
            const supercup = {
              rounds: [
                { name: 'Oitavas de Final', matches: roundOf16Matches },
                { name: 'Quartas de Final', matches: [] },
                { name: 'Semifinais', matches: [] },
                { name: 'Final', matches: [] }
              ],
              topScorers: [],
              topAssists: [],
              topMotm: [],
            };

            // Adiciona rankings se não existir
            if (!league.rankings.supercup) {
              league.rankings.supercup = [];
            }

            migratedCount++;
            console.log(`✅ Supercopa criada para ${league.countryName} com ${roundOf16Matches.length} jogos`);

            return { ...league, supercup };
          } else {
            console.warn(`⚠️ ${league.countryName} não tem 16 times na primeira divisão (tem ${primeraTeams.length})`);
          }
        }

        return league;
      });
    });

    console.log(`✅ Migração concluída! ${migratedCount} ligas receberam a Supercopa.`);
    alert(`✅ Migração concluída!\n\n${migratedCount} ligas agora têm a Supercopa Nacional.\n\nRecarregue a página para ver as mudanças.`);
  }

  migrateLeagueCupToBrazil(): void {
    const leagues = this.universeService.leagues();
    const updatedLeagues = [...leagues];
    let migratedCount = 0;

    updatedLeagues.forEach(league => {
      if (league.countryId === 'BRA') {
        let changed = false;
        if (!league.leagueCup) {
          league.leagueCup = { rounds: [], topScorers: [], topAssists: [], topMotm: [] };
          changed = true;
        }
        if (!league.rankings.leagueCup) {
          league.rankings.leagueCup = [];
          changed = true;
        }

        // NOVO: Recuperar títulos do histórico (Série E e Copa do Brasil)
        if (league.history && league.history.length > 0) {
          league.history.forEach(h => {
            const leagueCupName = this.getLeagueCupDisplayName(league.countryId);
            const cupName = this.getCupDisplayName(league.countryId);

            // 1. Processar Copa da Série E
            let champion = h.leagueCup?.champion;

            // Se o campeão estiver nulo no histórico (erro antigo), tenta recuperar do confronto da final
            if (!champion && h.leagueCup && league.leagueCup) {
              const finalRound = league.leagueCup.rounds.find(r => r.name.includes('Final'));
              if (finalRound && finalRound.matches.length > 0) {
                const finalMatch = finalRound.matches[0];
                if (finalMatch.played) {
                  const winnerId = finalMatch.aggregateWinnerId || finalMatch.winner?.id;
                  if (winnerId) {
                    champion = league.divisions.flatMap(d => d.teams).find(t => t.id === winnerId);
                  }
                }
              }
            }

            if (champion) {
              league.divisions.forEach(div => {
                const team = div.teams.find(t => t.id === champion!.id);
                if (team) {
                  if (!team.trophies) team.trophies = [];
                  const trophy = team.trophies.find(t => t.name === leagueCupName || (h.leagueCup && t.name === h.leagueCup.name));
                  if (!trophy) {
                    team.trophies.push({ name: leagueCupName, count: 1, type: 'national_cup' });
                    changed = true;
                  }
                }
              });
            }

            // 2. Processar Copa do Brasil (Garantir que todos tenham o título)
            if (h.cup && h.cup.champion) {
              const champion = h.cup.champion;
              league.divisions.forEach(div => {
                const team = div.teams.find(t => t.id === champion.id);
                if (team) {
                  if (!team.trophies) team.trophies = [];
                  const trophy = team.trophies.find(t => t.name === cupName || t.name === h.cup.name);
                  if (!trophy) {
                    team.trophies.push({ name: cupName, count: 1, type: 'national_cup' });
                    changed = true;
                  }
                }
              });
            }
          });
        }

        if (changed) migratedCount++;
      }
    });

    if (migratedCount > 0) {
      this.universeService.leagues.set(updatedLeagues);
      const allTeams = updatedLeagues.flatMap(l => l.divisions.flatMap(d => d.teams));
      this.sqliteService.saveSeasonState(this.universeService.season(), allTeams, updatedLeagues);
      alert(`✅ Migração da Série E concluída!\n\n${migratedCount} ligas foram atualizadas.\n\nRecarregue a página para ver as mudanças.`);
    } else {
      alert('A liga do Brasil já está atualizada.');
    }
  }

  reloadTeamsData(): void {
    const customTeams = customPlayersData;
    const currentLeagues = this.universeService.leagues();
    let updatedCount = 0;
    let structureChanged = false;

    // Países que acabamos de atualizar
    const targetedCountries = ['URU', 'COL', 'CHL', 'PAR', 'BOL', 'PER', 'VEN', 'EQU', 'TUR', 'USA', 'MEX', 'KOR', 'AUS', 'SAU', 'JPN'];

    currentLeagues.forEach(league => {
      if (targetedCountries.includes(league.countryId)) {
        const freshCountryData = customTeams.filter(t => t.countryId === league.countryId);
        
        league.divisions.forEach(div => {
          // 1. Verificar se o número de times mudou
          if (div.teams.length !== freshCountryData.length) {
            console.log(`📏 Redimensionando liga ${league.countryId}: ${div.teams.length} -> ${freshCountryData.length}`);
            
            // Buscar os times correspondentes no pool global do universo
            const allUniverseTeams = this.universeService.teams();
            const countryTeamsInPool = allUniverseTeams.filter(t => t.countryId === league.countryId);
            
            // Ajustar o array de times da divisão
            div.teams = countryTeamsInPool.slice(0, freshCountryData.length);
            
            // Se ainda assim faltar time (pool menor que o data), algo está errado no setup inicial
            // Mas assumindo que initializeTeams() foi chamado após a atualização dos arquivos...
            
            // 2. Regenerar Tabela e Metadados da Liga
            div.fixtures = this.universeService.generateFixtures(div.teams, div.name);
            league.totalRounds = div.fixtures.length;
            
            // 3. Regenerar Copa (para suportar o novo número de times, ex: 10 ou 12 com preliminar)
            league.cup = this.universeService.generateCup(div.teams, []);
            
            structureChanged = true;
          }

          // 4. Atualizar nomes e logos dos times remanescentes
          div.teams.forEach((team, index) => {
            const fresh = freshCountryData[index];
            if (fresh) {
              if (team.teamName !== fresh.teamName) {
                console.log(`🔄 Atualizando nome: ${team.teamName} -> ${fresh.teamName}`);
                team.teamName = fresh.teamName;
                updatedCount++;
              }
              // Forçar atualização da URL do escudo (agora usando assets/logos e TEAM_CRESTS mapping)
              const oldLogo = team.logoUrl;
              team.logoUrl = this.universeService.getTeamCrest(team);
              if (oldLogo !== team.logoUrl) updatedCount++;
            }
          });
        });
      }
    });

    if (updatedCount > 0 || structureChanged) {
      const allTeams = currentLeagues.flatMap(l => l.divisions.flatMap(d => d.teams));
      this.sqliteService.saveSeasonState(this.universeService.season(), allTeams, currentLeagues);
      alert(`${updatedCount} atualizações realizadas!\n\nA estrutura das ligas foi corrigida para o número real de times.\n\nA página será recarregada.`);
      window.location.reload();
    } else {
      alert('Nenhuma mudança pendente detectada.');
    }
  }

  // ============================================================================
  // SISTEMA DE SAVES (NOVO)
  // ============================================================================

  async onSaveSelected(saveId: string) {
    this.isLoading.set(true);
    this.loadStatus.set('loading');
    this.cdr.detectChanges(); // Forçar renderização imediata
    console.log('💾 Save selecionado:', saveId);

    setTimeout(async () => {
      try {
        // Carregar a temporada salva via SqlitePersistenceService
        const season = parseInt(saveId, 10) || 1;
        const seasonData = await this.sqliteService.loadSeasonState(season);

        if (seasonData) {
          this.gameStateService.importGameState(seasonData);
          this.isGameLoaded.set(true); // ✅ ADICIONADO: Marcar como carregado
          this.isSetupComplete.set(true);
          this.lifecycle.syncStateAfterLoad();
          console.log(`✅ Season ${season} carregada do SQLite.`);
          
          this.loadStatus.set('success');
          await new Promise(r => setTimeout(r, 1000));
        } else {
          throw new Error(`Season ${season} não encontrada no SQLite`);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar save:', error);
        this.loadStatus.set('error');
        await new Promise(r => setTimeout(r, 2000));
      } finally {
        this.isLoading.set(false);
        this.loadStatus.set('idle');
      }
    }, 50);
  }

  async onSaveCreated(saveId: string) {
    console.log('💾 Novo Jogo Criado:', saveId);

    try {
      // Resetar o estado atual do setup para o usuário escolher o time
      this.isSetupComplete.set(false);
      localStorage.removeItem('futsal_setup_complete');

      // Forçar reinicialização básica dos times para novo setup
      this.universeService.initializeTeams();

      console.log('✅ Ambiente preparado para novo jogo');

    } catch (error) {
      console.error('❌ Erro ao criar save:', error);
      alert('Erro ao criar save. Veja o console.');
    }
  }

  // ============================================================================
  // SISTEMA DE GERENCIAMENTO DE SAVES (MÚLTIPLOS SAVES)
  // ============================================================================

  availableSaves = signal<Array<any>>([]);
  isLoadingSaves = signal(false);
  /**
   * Realiza um salvamento rápido no save atual do Firebase
   */
  async recalibrateStats() {
    if (confirm('Deseja recalibrar todas as estatísticas? Isso corrigirá erros de duplicação de jogos e pontos baseando-se no histórico real das partidas.')) {
      this.isSaving.set(true);
      this.saveStatus.set('saving');
      
      try {
        this.universeService.recalibrateAllStats();
        // Salva automaticamente após corrigir
        await this.quickSave();
        alert('Estatísticas recalibradas e universo salvo com sucesso!');
      } catch (err) {
        console.error('Erro ao recalibrar:', err);
        this.saveStatus.set('error');
      } finally {
        this.isSaving.set(false);
      }
    }
  }

  async forceNextSeason() {
    if (confirm('ATENÇÃO: Deseja forçar a virada de temporada? Use apenas se o jogo estiver travado no final do ano.')) {
      await this.startNewSeason();
    }
  }

  async quickSave() {
    const saveId = this.lifecycle.getSaveId();
    if (!saveId) {
      alert("Nenhum save do Firebase carregado. Use o Gerenciador para criar um.");
      return;
    }

    this.isSaving.set(true);
    this.saveStatus.set('saving');

    const state = {
      season: this.universeService.season(),
      teams: this.universeService.teams(),
      leagues: this.universeService.leagues(),
      internationalComps: this.universeService.internationalCompetitions(),
      summaries: this.universeService.seasonSummaries()
    };

    try {
      await this.firebaseService.saveGame(saveId, state);
      this.saveStatus.set('success');
      console.log("⚡ Quick Save concluído!");
      
      // Fecha o overlay após 2 segundos
      setTimeout(() => {
        this.isSaving.set(false);
        this.saveStatus.set('idle');
      }, 2000);
    } catch (err) {
      console.error("Erro no quick save:", err);
      this.saveStatus.set('error');
      setTimeout(() => {
        this.isSaving.set(false);
        this.saveStatus.set('idle');
      }, 3000);
    }
  }

  activeSaveId = signal<string | number | null>(null); // Rastreia o save atualmente carregado
  saveName = signal('');
  saveToDelete = signal<string | number | null>(null);
  saveToRename = signal<{ id: string | number; currentName: string } | null>(null);
  newSaveName = signal('');

  /**
   * Abre o gerenciador de saves e carrega a lista
   */
  async openSavesManager() {
    this.changeView('saves_manager');
    await this.loadAvailableSaves();
  }

  /**
   * Carrega lista de saves disponíveis do Firebase
   */
  async loadAvailableSaves() {
    this.isLoadingSaves.set(true);
    try {
      const saves = await this.firebaseService.listSaves();
      this.availableSaves.set(saves.map(s => ({
        id: s.id,
        name: s.description || s.id,
        season: s.season,
        team: s.teamName,
        updatedAt: s.lastPlayed ? new Date(s.lastPlayed.seconds * 1000).toLocaleString() : 'N/A'
      })));
      console.log(`📁 ${saves.length} save(s) encontrado(s) no Firebase`);
    } catch (error) {
      console.error('❌ Erro ao carregar saves do Firebase:', error);
    } finally {
      this.isLoadingSaves.set(false);
    }
  }

  /**
   * Cria um novo save no Firebase
   */
  async createNewSave() {
    const name = this.saveName().trim();

    if (!name) {
      alert('Por favor, digite um nome para o save');
      return;
    }

    this.isSaving.set(true);
    this.saveStatus.set('saving');

    try {
      const saveId = name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
      
      const state = {
        season: this.universeService.season(),
        teams: this.universeService.teams(),
        leagues: this.universeService.leagues(),
        internationalComps: this.universeService.internationalCompetitions(),
        summaries: this.universeService.seasonSummaries(),
        userTeamName: this.universeService.leagues()[0]?.divisions[0]?.teams[0]?.teamName || 'N/A',
        description: name
      };

      await this.firebaseService.saveGame(saveId, state);
      
      console.log(`✅ Save "${name}" criado no Firebase!`);
      this.lifecycle.setSaveId(saveId);
      this.saveName.set('');
      await this.loadAvailableSaves();
      
      this.saveStatus.set('success');
      setTimeout(() => {
        this.isSaving.set(false);
        this.saveStatus.set('idle');
      }, 2000);
    } catch (error) {
      console.error('❌ Erro ao criar save no Firebase:', error);
      this.saveStatus.set('error');
      setTimeout(() => {
        this.isSaving.set(false);
        this.saveStatus.set('idle');
      }, 3000);
    }
  }

  /**
   * Carrega um save específico do Firebase
   */
  async loadSaveById(id: string) {
    this.isLoading.set(true);
    this.loadStatus.set('loading');
    this.cdr.detectChanges(); // Forçar renderização imediata
    
    setTimeout(async () => {
      try {
        const state = await this.firebaseService.loadSave(id);
        if (state) {
          this.lifecycle.setSaveId(id);
          this.universeService.loadFromFirebaseState(state);
          this.isGameLoaded.set(true); // ✅ ADICIONADO
          this.isSetupComplete.set(true);
          this.lifecycle.syncStateAfterLoad();
          this.changeView('main_menu');
          
          this.loadStatus.set('success');
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (error) {
        console.error('❌ Erro ao carregar save do Firebase:', error);
        this.loadStatus.set('error');
        await new Promise(r => setTimeout(r, 2000));
      } finally {
        this.isLoading.set(false);
        this.loadStatus.set('idle');
      }
    }, 50);
  }

  /**
   * Importa um save de um arquivo JSON
   */
  importSaveFromJson(state: any) {
    try {
      this.universeService.loadFromFirebaseState(state);
      this.isGameLoaded.set(true);
      this.isSetupComplete.set(true);
      this.lifecycle.syncStateAfterLoad();
      this.changeView('main_menu');
      console.log('✅ Backup restaurado com sucesso do JSON local.');
    } catch (e) {
      console.error('❌ Erro ao importar backup:', e);
      alert('Erro ao importar backup: ' + e);
    }
  }

  /**
   * Atualiza um save existente (sobrescreve)
   */
  async updateExistingSave(id: string) {
    const save = this.availableSaves().find(s => s.id === id);
    if (!save) return;

    const confirmOverwrite = window.confirm(
      `Sobrescrever save "${save.name}"?\n\n` +
      `O save atual será substituído pelo estado do jogo atual.`
    );

    if (!confirmOverwrite) return;

    this.isSaving.set(true);
    this.saveStatus.set('saving');

    try {
      const state = {
        season: this.universeService.season(),
        teams: this.universeService.teams(),
        leagues: this.universeService.leagues(),
        internationalComps: this.universeService.internationalCompetitions(),
        summaries: this.universeService.seasonSummaries(),
        userTeamName: this.universeService.leagues()[0]?.divisions[0]?.teams[0]?.teamName || 'N/A',
        description: save.name
      };

      await this.firebaseService.saveGame(id, state);
      console.log(`✅ Save "${save.name}" atualizado!`);
      await this.loadAvailableSaves();
      this.saveStatus.set('success');
      setTimeout(() => {
        this.isSaving.set(false);
        this.saveStatus.set('idle');
      }, 2000);
    } catch (error) {
      console.error('❌ Erro ao atualizar save:', error);
      this.saveStatus.set('error');
      setTimeout(() => {
        this.isSaving.set(false);
        this.saveStatus.set('idle');
      }, 3000);
    }
  }

  /**
   * Inicia processo de renomear save
   */
  startRenameSave(id: string, currentName: string) {
    this.saveToRename.set({ id, currentName });
    this.newSaveName.set(currentName);
  }

  /**
   * Confirma renomeação do save
   */
  async confirmRenameSave() {
    const renameData = this.saveToRename();
    if (!renameData) return;

    const newName = this.newSaveName().trim();

    if (!newName || newName.length < 3) {
      alert('O nome deve ter pelo menos 3 caracteres');
      return;
    }

    try {
      await this.firebaseService.renameSave(renameData.id, newName);
      console.log(`✅ Save renomeado para "${newName}"`);
      this.saveToRename.set(null);
      await this.loadAvailableSaves();
    } catch (error) {
      console.error('❌ Erro ao renomear save:', error);
      alert('Erro ao renomear save.');
    }
  }

  /**
   * Cancela renomeação
   */
  cancelRenameSave() {
    this.saveToRename.set(null);
    this.newSaveName.set('');
  }

  /**
   * Inicia processo de deletar save
   */
  confirmDeleteSave(id: string) {
    this.saveToDelete.set(id);
  }

  /**
   * Deleta um save do Firebase
   */
  async deleteSave() {
    const id = this.saveToDelete() as unknown as string;
    if (!id) return;

    if (confirm('Tem certeza que deseja deletar este save permanentemente do Firebase?')) {
      try {
        await this.firebaseService.deleteSave(id);
        await this.loadAvailableSaves();
        this.saveToDelete.set(null);
      } catch (error) {
        console.error('❌ Erro ao deletar save:', error);
        alert('Erro ao deletar save.');
      }
    }
  }

  /**
   * Cancela deleção
   */
  cancelDeleteSave() {
    this.saveToDelete.set(null);
  }

  getAllTeamsInLeague(league: League): Team[] {
    if (!league) return [];
    return this.universeService.teams().filter(t => t.countryId === league.countryId);
  }
}
