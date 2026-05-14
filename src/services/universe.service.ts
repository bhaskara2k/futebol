import { Injectable, signal, inject } from '@angular/core';
import { EvolutionService } from './evolution.service';
import { customPlayersData } from '../data';
import { League, Team, Player, Division, Match, Cup, CupMatch, CupRound, SeasonRecord, ChampionshipRankings, PlayerRecord, CompetitionRecord, InternationalCompetition, Trophy, InternationalSeasonRecord, ChampionshipRankingRecord, BestPlayerAwardRecord, TransferRecord, HistoricMatch, H2HData, SeasonAwardsHistoryRecord } from '../models';
import { NAMES_BY_NATIONALITY } from '../name-generator.data';
import { NATIONALITIES } from '../nationalities.data';
import { TEAM_CRESTS } from '../data/team-crests.data';
import { db } from '../firebase.config';
import { collection, getDocs } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class UniverseService {

  private readonly COUNTRY_TO_FOLDER: { [id: string]: string } = {
    'ESP': 'espanha', 'ENG': 'inglaterra', 'ITA': 'italia', 'GER': 'alemanha', 'FRA': 'franca',
    'POR': 'portugal', 'BRA': 'brasil', 'ARG': 'argentina', 'URU': 'uruguai', 'CHL': 'chile',
    'COL': 'colombia', 'EQU': 'equador', 'PER': 'peru', 'PAR': 'paraguai', 'VEN': 'venezuela', 'BOL': 'bolivia',
    'USA': 'eua', 'MEX': 'mexico', 'JPN': 'japao', 'SAU': 'arabia-saudita', 'AUS': 'australia',
    'RUS': 'russia', 'TUR': 'turquia', 'BEL': 'belgica', 'NED': 'holanda', 'AFS': 'sul africa', 'KOR': 'coreia-do-sul',
    // Oriente Médio
    'QAT': 'oriente medio', 'ARE': 'oriente medio', 'IRN': 'oriente medio', 'IRQ': 'oriente medio',
    'JOR': 'oriente medio', 'SYR': 'oriente medio', 'UZB': 'oriente medio', 'OMN': 'oriente medio',
    'LBN': 'oriente medio', 'KUW': 'oriente medio',
    // Nórdicos
    'DNK': 'nordic/dinamarca', 'FIN': 'nordic/finlandia', 'ISL': 'nordic/islandia', 'NOR': 'nordic/noruega', 'SWE': 'nordic/suecia',
    // Mediterrâneo
    'ARM': 'mediterranean/armenia', 'AZE': 'mediterranean/azerbaijao', 'KAZ': 'mediterranean/cazaquistao',
    'CYP': 'mediterranean/chipre', 'GEO': 'mediterranean/georgia', 'GRE': 'mediterranean/grecia', 'MLT': 'mediterranean/malta'
  };

  getTeamCrest(team: Team | { teamName: string, id?: string, countryId?: string, logoUrl?: string }): string {
    if (team.logoUrl) return team.logoUrl;
    if (TEAM_CRESTS[team.teamName]) return TEAM_CRESTS[team.teamName];

    // Slug do nome do time
    const slug = team.teamName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Se soubermos o país, tentamos a pasta dele
    if (team.countryId && this.COUNTRY_TO_FOLDER[team.countryId]) {
      const folder = this.COUNTRY_TO_FOLDER[team.countryId];
      const basePath = (['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'RUS', 'NED', 'BEL', 'ARG', 'SAU', 'AUS', 'KOR', 'JPN', 'MEX', 'USA', 'BRA', 'URU', 'COL', 'CHL', 'PAR', 'BOL', 'PER', 'VEN', 'EQU', 'TUR'].includes(team.countryId)) ? 'assets/logos' : 'assets/crests';

      // Casos especiais de extensão
      const pngTeamsGlobal: { [key: string]: string[] } = {
        'ESP': ['granada-cf', 'ud-las-palmas', 'rc-deportivo-la-coruna'],
        'ITA': ['ssc-napoli', 'ascoli', 'benevento', 'as-roma', 'juventus'],
        'FRA': ['ac-ajaccio', 'sm-caen', 'dijon-fco', 'valenciennes-fc'],
        'POR': [
          'avs-futebol-sad', 'nacional-da-madeira', 'alverca', 'leixoes',
          'maritimo', 'pacos-de-ferreira', 'santa-clara', 'tondela', 'feirense'
        ],
        'RUS': [
          'cska-moscow', 'dynamo-moscow', 'fk-krasnodar', 'lokomotiv-moscow',
          'fk-rostov', 'spartak-moscow', 'zenit-st-petersburg', 'rubin-kazan'
        ],
        'NED': ['almere-city', 'ado-den-haag', 'de-graafschap', 'willem'],
        'BEL': ['anderlecht', 'antwerp', 'club-brugge', 'cercle-brugge', 'charleroi', 'genk', 'gent', 'standard-de-liege', 'mechelen', 'usg'],
        'ARG': ['arsenal', 'colon', 'quilmes'],
        'BOL': ['always-ready', 'aurora', 'bolivar', 'nacional-potosi', 'san-antonio', 'san-jose', 'the-strongest', 'wilstermann'],
        'PER': ['alianza-lima', 'binacional', 'cienciano', 'cusco', 'melgar', 'sport-boys', 'sporting-cristal', 'universitario'],
        'VEN': ['carabobo', 'caracas', 'estudiantes-merida', 'la-guaira', 'metropolitanos', 'tachira', 'ucv', 'zamora'],
        'COL': ['deportivo-cali', 'inter-bogota', 'santa-fe'],
        'EQU': ['mushuc-runa'],
        'URU': ['city-torque'],
        'AUS': ['adelaide-united', 'auckland-fc', 'brisbane-roar', 'newcastle-jets', 'macarthur-fc', 'central-coast-mariners', 'melbourne-city', 'perth-glory', 'wellington-phoenix', 'sydney-fc', 'melbourne-victory', 'western-united'],
        'KOR': ['busan-ipark', 'daejeon-hana-citizen', 'gangwon-fc', 'gimcheon-sangmu', 'gwangju-fc', 'incheon-united', 'jeonbuk-hyundai', 'pohang-steelers', 'seongnam-fc', 'fc-seoul', 'suwon-samsung-bluewings', 'ulsan-hd'],
        'JPN': ['vissel-kobe', 'yokohama-f-marinos', 'sanfrecce-hiroshima', 'urawa-red-diamonds', 'kashima-antlers', 'nagoya-grampus', 'avispa-fukuoka', 'kawasaki-frontale', 'cerezo-osaka', 'albirex-niigata', 'fc-tokyo', 'hokkaido-consadole-sapporo', 'kyoto-sanga', 'sagan-tosu', 'shonan-bellmare', 'gamba-osaka', 'kashiwa-reysol', 'machida-zelvia', 'yokohama-fc', 'shimizu-s-pulse', 'tokyo-verdy', 'jef-united', 'v-varen-nagasaki', 'ventforet-kofu', 'oita-trinita', 'fagiano-okayama', 'vegalta-sendai', 'mito-hollyhock', 'omiya-ardija', 'jubilo-iwata'],
        'MEX': ['club-america', 'chivas-guadalajara', 'cruz-azul', 'pumas-unam', 'tigres-uanl', 'cf-monterrey', 'club-leon', 'club-pachuca', 'santos-laguna', 'toluca-fc', 'club-tijuana', 'club-puebla', 'queretaro-fc', 'club-necaxa', 'atletico-morelia', 'atlante-fc', 'atlas-fc', 'atletico-san-luis', 'fc-juarez', 'dorados-de-sinaloa'],
        'USA': ['inter-miami', 'columbus-crew', 'fc-cincinnati', 'orlando-city', 'new-york-city-fc', 'new-york-red-bulls', 'charlotte-fc', 'atlanta-united', 'montreal-impact', 'philadelphia-union', 'toronto-fc', 'dc-united', 'nashville-sc', 'new-england-revolution', 'chicago-fire', 'louisville-city', 'la-galaxy', 'lafc', 'real-salt-lake', 'colorado-rapids', 'houston-dynamo', 'seattle-sounders', 'minnesota-united', 'portland-timbers', 'fc-dallas', 'austin-fc', 'vancouver-whitecaps', 'sporting-kansas-city', 'st-louis-city-sc', 'san-jose-earthquakes', 'san-diego-fc', 'fc-tulsa'],
        'BRA': ['palmeiras', 'corinthians', 'sao-paulo', 'santos', 'flamengo', 'fluminense', 'vasco-da-gama', 'botafogo', 'gremio', 'internacional', 'atletico-mineiro', 'cruzeiro', 'athletico-paranaense', 'bahia', 'fortaleza', 'red-bull-bragantino', 'vitoria', 'juventude', 'criciuma', 'atletico-go']
      };

      if (['BRA', 'BOL', 'PER', 'VEN', 'TUR', 'USA', 'MEX'].includes(team.countryId)) {
        return `/${basePath}/${folder}/${slug}.png`;
      }

      if (pngTeamsGlobal[team.countryId] && pngTeamsGlobal[team.countryId].includes(slug)) {
        return `/${basePath}/${folder}/${slug}.png`;
      }

      return `/${basePath}/${folder}/${slug}.svg`;
    }

    // Fallback geral
    return `/assets/crests/${slug}.png`;
  }

  getTeamAcronym(teamName: string): string {
    const name = teamName.toUpperCase().replace(' FC', '').replace(' UNITED', '').replace(' CITY', '').trim();

    // Casos especiais manuais
    if (teamName.includes('MANCHESTER UNITED')) return 'MUN';
    if (teamName.includes('MANCHESTER CITY')) return 'MCI';
    if (teamName.includes('NOTTINGHAM FOREST')) return 'NFO';
    if (teamName.includes('SOUTHAMPTON')) return 'SOU';
    if (teamName.includes('WEST HAM')) return 'WHU';
    if (teamName.includes('ASTON VILLA')) return 'AVL';
    if (teamName.includes('WOLVERHAMPTON')) return 'WOL';
    if (teamName.includes('TOTTENHAM')) return 'TOT';
    if (teamName.includes('BRIGHTON')) return 'BHA';
    if (teamName.includes('CRYSTAL PALACE')) return 'CRY';
    if (teamName.includes('NEWCASTLE')) return 'NEW';
    if (teamName.includes('LEICESTER')) return 'LEI';
    if (teamName.includes('SHEFFIELD UNITED')) return 'SHU';
    if (teamName.includes('SHEFFIELD WEDNESDAY')) return 'SHW';
    if (teamName.includes('AFC BOURNEMOUTH')) return 'BOU';
    if (teamName.includes('AFC WIMBLEDON')) return 'WIM';
    if (teamName.includes('BLACKBURN ROVERS')) return 'BBR';
    if (teamName.includes('HUDDERSFIELD TOWN')) return 'HUD';
    if (teamName.includes('DERBY COUNTY')) return 'DER';
    if (teamName.includes('IPSWICH TOWN')) return 'IPS';
    if (teamName.includes('PLYMOUTH ARGYLE')) return 'PLY';
    if (teamName.includes('PRESTON NORTH END')) return 'PNE';
    if (teamName.includes('WIGAN ATHLETIC')) return 'WIG';

    if (teamName.includes('BARCELONA')) return 'FCB';
    if (teamName.includes('ATLÉTICO DE MADRID')) return 'ATM';
    if (teamName.includes('VILLARREAL')) return 'VIL';
    if (teamName.includes('REAL BETIS')) return 'BET';
    if (teamName.includes('ATHLETIC CLUB')) return 'ATH';
    if (teamName.includes('OSASUNA')) return 'OSA';
    if (teamName.includes('MALLORCA')) return 'RCD';
    if (teamName.includes('CELTA')) return 'CEL';
    if (teamName.includes('UD ALMERÍA')) return 'ALM';
    if (teamName.includes('GETAFE')) return 'GET';
    if (teamName.includes('VALENCIA')) return 'VAL';

    if (teamName.includes('MILAN')) return 'ACM';
    if (teamName.includes('FC INTERNAZIONALE')) return 'INT';
    if (teamName.includes('NAPOLI')) return 'NAP';
    if (teamName.includes('LAZIO')) return 'LAZ';
    if (teamName.includes('FIORENTINA')) return 'ACF';
    if (teamName.includes('ATALANTA')) return 'ATA';
    if (teamName.includes('BOLOGNA')) return 'BOL';
    if (teamName.includes('UDINESE CALCIO')) return 'UDI';
    if (teamName.includes('CAGLIARI')) return 'CAG';
    if (teamName.includes('SAMPDORIA')) return 'SAM';
    if (teamName.includes('MONZA')) return 'MON';
    if (teamName.includes('PARMA CALCIO')) return 'PAR';
    if (teamName.includes('COMO 1907')) return 'COM';
    if (teamName.includes('REGGIANA 1919')) return 'REG';
    if (teamName.includes('AS ROMA')) return 'ASR';
    if (teamName.includes('US SASSUOLO')) return 'USS';
    if (teamName.includes('HELLAS VERONA')) return 'HEL';
    if (teamName.includes('PESCARA CALCIO')) return 'PES';
    if (teamName.includes('GENOA CFC')) return 'GEN';
    if (teamName.includes('US LECCE')) return 'LEC';

    if (teamName.includes('BORUSSIA DORTMUND')) return 'BVB';
    if (teamName.includes('BAYER LEVERKUSEN')) return 'B04';
    if (teamName.includes('EINTRACHT FRANKFURT')) return 'SGE';
    if (teamName.includes('RB LEIPZIG')) return 'RBL';
    if (teamName.includes('UNION BERLIN')) return 'FCU';
    if (teamName.includes('BORUSSIA MÖNCHENGLADBACH')) return 'BMG';
    if (teamName.includes('BAYERN MÜNCHEN') || teamName.includes('BAYERN MUNICH')) return 'BAY';
    if (teamName.includes('STUTTGART')) return 'STU';
    if (teamName.includes('BOCHUM')) return 'VFL';
    if (teamName.includes('WOLFSBURG')) return 'WOL';
    if (teamName.includes('AUGSBURG')) return 'FCA';
    if (teamName.includes('FREIBURG')) return 'FRE';
    if (teamName.includes('WERDER BREMEN')) return 'SVW';
    if (teamName.includes('SCHALKE 04')) return 'S04';
    if (teamName.includes('HAMBURG')) return 'HSV';
    if (teamName.includes('1860 MUNCHEN')) return 'TSV';
    if (teamName.includes('TSG HOFFENHEIM')) return 'TSG';
    if (teamName.includes('FC KAISERSLAUTERN')) return 'FCK';

    if (teamName.includes('PARIS SAINT-GERMAIN')) return 'PSG';
    if (teamName.includes('OLYMPIQUE LYONNAIS')) return 'OL';
    if (teamName.includes('AS MONACO')) return 'ASM';
    if (teamName.includes('LOSC LILLE')) return 'LIL';
    if (teamName.includes('NANTES')) return 'NAN';
    if (teamName.includes('OLYMPIQUE DE MARSEILLE')) return 'OM';
    if (teamName.includes('RC LENS')) return 'RCL';
    if (teamName.includes('STADE DE REIMS')) return 'STU';
    if (teamName.includes('RC STRASBOURG')) return 'RCS';
    if (teamName.includes('OGC NICE')) return 'OGC';

    if (teamName.includes('SL BENFICA')) return 'SLB';
    if (teamName.includes('SC BRAGA')) return 'SCB';
    if (teamName.includes('PORTO')) return 'FCP';

    if (teamName.includes('PSV EINDHOVEN')) return 'PSV';
    if (teamName.includes('FC UTRECHT')) return 'UTR';
    if (teamName.includes('FC TWENTE')) return 'TWE';

    if (teamName.includes('ATHLETICO PARANAENSE')) return 'CAP';
    if (teamName.includes('ATLÉTICO MINEIRO')) return 'CAM';
    if (teamName.includes('ATLÉTICO GOIANIENSE')) return 'ACG';
    if (teamName.includes('BOTAFOGO')) return 'BOT';
    if (teamName.includes('GOIAS')) return 'GOI';
    if (teamName.includes('CORITIBA')) return 'COR';
    if (teamName.includes('CEARA')) return 'CEA';
    if (teamName.includes('CRICIUMA')) return 'CRI';
    if (teamName.includes('JUVENTUDE')) return 'JUV';
    if (teamName.includes('FORTALEZA')) return 'FOR';
    if (teamName.includes('BAHIA')) return 'BAH';
    if (teamName.includes('CRB')) return 'CRB';
    if (teamName.includes('SANTA CRUZ')) return 'SCC';
    if (teamName.includes('VITORIA')) return 'VIT';
    if (teamName.includes('SPORT')) return 'SPO';
    if (teamName.includes('NAUTICO')) return 'NAU';
    if (teamName.includes('AVAI')) return 'AVA';
    if (teamName.includes('PONTE PRETA')) return 'PON';
    if (teamName.includes('CHAPECOENSE')) return 'CHA';
    if (teamName.includes('CSA')) return 'CSA';
    if (teamName.includes('VILA NOVA')) return 'VIL';
    if (teamName.includes('RED BULL BRAGANTINO')) return 'RBB';
    if (teamName.includes('AMERICA-MG')) return 'AME';
    if (teamName.includes('FLUMINENSE')) return 'FLU';
    if (teamName.includes('FLAMENGO')) return 'FLA';
    if (teamName.includes('CORINTHIANS')) return 'COR';
    if (teamName.includes('VASCO DA GAMA')) return 'VAS';
    if (teamName.includes('PALMEIRAS')) return 'PAL';
    if (teamName.includes('SANTOS')) return 'SAN';
    if (teamName.includes('SÃO PAULO')) return 'SAO';
    if (teamName.includes('GRÊMIO')) return 'GRE';
    if (teamName.includes('INTERNACIONAL')) return 'INT';

    if (teamName.includes('BOCA JUNIORS')) return 'BOC';
    if (teamName.includes('RIVER PLATE')) return 'RIV';
    if (teamName.includes('VÉLEZ SARSFIELD')) return 'VEL';
    if (teamName.includes('DEFENSA Y JUSTICIA')) return 'DYJ';
    if (teamName.includes('GODOY CRUZ')) return 'GOD';
    if (teamName.includes('INDEPENDIENTE RIVADAVIA')) return 'RVD';
    if (teamName.includes('DEPORTIVO RIESTRA')) return 'RIE';
    if (teamName.includes('ROSARIO CENTRAL')) return 'ROS';

    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0].substring(0, 1) + words[1].substring(0, 2)).toUpperCase();
    }
    return name.substring(0, 3).toUpperCase();
  }

  teams = signal<Team[]>([]);
  leagues = signal<League[]>([]);
  internationalCompetitions = signal<InternationalCompetition[]>([]);
  season = signal<number>(1);
  gamePhase = signal<'regular_season' | 'qualifiers_pending' | 'qualifiers' | 'world_cup_pending' | 'world_cup_finals'>('regular_season');
  matchHistory = signal<HistoricMatch[]>([]);
  bestPlayerInTheWorldHistory = signal<SeasonAwardsHistoryRecord[]>([]);
  youthChampionsLeagueHistory = signal<InternationalSeasonRecord[]>([]);
  bestPlayerOfTheSeasonPodium = signal<BestPlayerAwardRecord[] | null>(null);
  goldenGloveOfTheSeason = signal<BestPlayerAwardRecord | null>(null);
  revelationOfTheSeason = signal<BestPlayerAwardRecord | null>(null);
  teamOfTheSeason = signal<BestPlayerAwardRecord[] | null>(null);
  transferHistory = signal<TransferRecord[]>([]);

  // Point B: Histórico simplificado de temporadas
  seasonSummaries = signal<any[]>([]);

  getRelegationSlots(countryId: string, divisionIndex: number, totalDivisions: number): number {
    if (divisionIndex >= totalDivisions - 1) return 0; // Última divisão não rebaixa

    const cId = countryId.trim();
    if (cId === 'BRA') return 4;

    // Ligas com 3 rebaixados
    if (['ENG', 'ESP', 'ITA', 'JPN', 'SAU'].includes(cId)) return 3;

    // Ligas com 2 rebaixados
    if (['GER', 'FRA', 'POR', 'NED', 'ARG', 'RUS', 'BEL'].includes(cId)) return 2;

    // Ligas com 1 rebaixado
    if (['KOR'].includes(cId)) return 1;

    // Sem rebaixamento
    if (['USA', 'MEX', 'AUS'].includes(cId)) return 0;

    return 2; // Fallback padrão
  }

  private evolutionService = inject(EvolutionService);



  getTeamById(id: string): Team | undefined {
    return this.teams().find(t => t.id === id);
  }

  getFlagUrl(nationalityId: string): string {
    const nat = NATIONALITIES.find(n => n.code3 === nationalityId);
    if (!nat) return `https://flagcdn.com/w20/xx.png`;
    return `https://flagcdn.com/w20/${nat.code2.toLowerCase()}.png`;
  }

  addYouthChampionsLeagueRecord(record: InternationalSeasonRecord): void {
    this.youthChampionsLeagueHistory.update(history => [record, ...history]);
  }

  private usedPlayerNames = new Set<string>();

  private readonly budgetRewards = {
    national_league: 30_000_000,
    national_cup: 20_000_000,
    international: 40_000_000,
    world: 50_000_000,
    lower_division: 0,
  };

  private readonly FOUR_TEAM_LEAGUE_IDS = [
    'TUR'
  ];

  private readonly EIGHT_TEAM_SAM_LEAGUE_IDS = ['URU', 'COL', 'CHL', 'PAR', 'BOL', 'PER', 'VEN', 'EQU'];



  private readonly EIGHT_TEAM_NCA_LEAGUE_IDS = ['USA', 'MEX'];

  private readonly TWO_TEAM_NCA_LEAGUE_IDS = [];

  private readonly EIGHT_TEAM_ASI_LEAGUE_IDS = ['JPN', 'SAU', 'KOR', 'AUS'];
  private readonly FOUR_TEAM_ASI_LEAGUE_IDS = [];
  private readonly TWO_TEAM_ASI_LEAGUE_IDS = [];

  private readonly LEAGUE_IDS = Array.from(new Set([
    'ESP', 'ENG', 'ITA', 'GER', 'FRA', 'RUS', 'POR', 'NED', 'BRA', 'ARG', 'BEL',
    ...this.EIGHT_TEAM_SAM_LEAGUE_IDS,
    ...this.FOUR_TEAM_LEAGUE_IDS,
    ...this.EIGHT_TEAM_NCA_LEAGUE_IDS,
    ...this.TWO_TEAM_NCA_LEAGUE_IDS,
    ...this.EIGHT_TEAM_ASI_LEAGUE_IDS,
    ...this.FOUR_TEAM_ASI_LEAGUE_IDS,
    ...this.TWO_TEAM_ASI_LEAGUE_IDS
  ]));

  public readonly COUNTRY_NAMES: { [key: string]: string } = {
    ESP: 'Espanha',
    ENG: 'Inglaterra',
    ITA: 'Itália',
    GER: 'Alemanha',
    FRA: 'França',
    RUS: 'Rússia',
    POR: 'Portugal',
    NED: 'Holanda',

    BRA: 'Brasil',
    ARG: 'Argentina',
    URU: 'Uruguai',
    COL: 'Colômbia',
    CHL: 'Chile',
    PAR: 'Paraguai',
    BOL: 'Bolívia',
    PER: 'Peru',
    VEN: 'Venezuela',
    EQU: 'Equador',

    BEL: 'Bélgica',

    TUR: 'Turquia',




    USA: 'Estados Unidos',
    MEX: 'México',


    JPN: 'Japão',
    AUS: 'Austrália',
    SAU: 'Arábia Saudita',
    KOR: 'Coreia do Sul',

  };

  public readonly CONTINENT_NAMES: { [key: string]: string } = {
    EUR: 'Europa',
    SAM: 'América do Sul',
    NCA: 'América do Norte',
    ASI: 'Ásia',
  };
  public readonly TROPHY_NAMES: { [key: string]: string } = {
    'EUR_CL': 'Champions League (Europa)',
    'EUR_EL': 'Europa League (Europa)',
    'EUR_EUL': 'Euro League (Europa)',
    'SAM_LIB': 'Libertadores (América do Sul)',
    'SAM_SUL': 'Sulamericana (América do Sul)',

    'ASI_CL': 'Ásia Champions League',
    'NCA_CL': 'America Champions League (América do Norte)',
    'WORLD_CWC': 'Mundial de Clubes',
    'SAM_REC': 'Recopa (América do Sul)',
    'EUR_SUP': 'Supercopa (Europa)',
    'EUR_NC': 'Eurocopa',
  };
  private readonly CONTINENT_MAP: { [key: string]: string } = {
    'ESP': 'EUR', 'ENG': 'EUR', 'ITA': 'EUR', 'GER': 'EUR', 'FRA': 'EUR', 'RUS': 'EUR', 'POR': 'EUR', 'NED': 'EUR',
    'TUR': 'EUR', 'BEL': 'EUR',
    'BRA': 'SAM', 'ARG': 'SAM', 'URU': 'SAM', 'COL': 'SAM', 'CHL': 'SAM', 'PAR': 'SAM', 'BOL': 'SAM', 'PER': 'SAM', 'VEN': 'SAM', 'EQU': 'SAM',

    'USA': 'NCA', 'MEX': 'NCA',
    'JPN': 'ASI', 'AUS': 'ASI', 'SAU': 'ASI', 'KOR': 'ASI',

  };

  public sortTeams = (a: Team, b: Team) => {
    const a_pts = a.stats?.points ?? 0;
    const b_pts = b.stats?.points ?? 0;
    if (a_pts !== b_pts) {
      return b_pts - a_pts;
    }
    const goalDiffA = (a.stats?.goalsFor ?? 0) - (a.stats?.goalsAgainst ?? 0);
    const goalDiffB = (b.stats?.goalsFor ?? 0) - (b.stats?.goalsAgainst ?? 0);
    if (goalDiffA !== goalDiffB) {
      return goalDiffB - goalDiffA;
    }
    const a_gf = a.stats?.goalsFor ?? 0;
    const b_gf = b.stats?.goalsFor ?? 0;
    if (b_gf !== a_gf) {
      return b_gf - a_gf;
    }
    // REMOVIDO: localeCompare por nome (isso causava o reset alfabético na rodada 0)
    return 0;
  }

  public getContinentForLeague(countryId: string): string {
    return this.CONTINENT_MAP[countryId] || 'UNKNOWN';
  }

  async initializeUniverse(): Promise<void> {
    // 1. Sempre carrega os dados locais primeiro (Garante que o app funcione)
    this.setupTeams();

    try {
      console.log('📡 Tentando sincronizar com Firestore (em segundo plano)...');
      const teamsCollectionRef = collection(db, "teams");
      const querySnapshot = await getDocs(teamsCollectionRef);
      const firestoreTeamsData = querySnapshot.docs.map(doc => doc.data());

      if (firestoreTeamsData.length > 0) {
        console.log(`✅ ${firestoreTeamsData.length} times encontrados no Firestore.`);
        // Opcional: Aqui poderíamos mesclar os dados, mas por enquanto vamos manter o local como soberano
        // se você quiser usar o Firestore, mude para: this.setupTeams(firestoreTeamsData as any);
      }
    } catch (error) {
      console.warn('📡 Firestore inacessível ou vazio, mantendo dados locais.');
    }

    this.setupLeagues();
    this.setupInternationalCompetitions();
  }

  initializeTeams(): void {
    this.setupTeams();
    this.setupLeagues();
    this.setupInternationalCompetitions();
  }

  initializeLeagues(assignments: Map<string, string[]>): void {
    this.setupLeagues(assignments);
    this.setupInternationalCompetitions();
  }

  private getRandomValue(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private calculateMarketValue(overall: number): number {
    if (overall >= 97) { // 97-99
      return this.getRandomValue(190_000_000, 250_000_000);
    }
    if (overall >= 93) { // 93-96
      return this.getRandomValue(120_000_000, 180_900_000);
    }
    if (overall >= 90) { // 90-92
      return this.getRandomValue(90_000_000, 119_900_000);
    }
    if (overall >= 86) { // 86-89
      return this.getRandomValue(50_000_000, 89_900_000);
    }
    if (overall >= 80) { // 80-85
      return this.getRandomValue(25_000_000, 49_900_000);
    }
    if (overall >= 75) { // 75-79
      return this.getRandomValue(15_000_000, 24_900_000);
    }
    if (overall >= 70) { // 70-74
      return this.getRandomValue(3_000_000, 14_900_000);
    }
    if (overall >= 65) { // 65-69
      return this.getRandomValue(1_000_000, 2_900_000);
    }
    // 64 or below
    return this.getRandomValue(100_000, 900_000);
  }

  public setupInternationalCompetitions() {
    const comps: InternationalCompetition[] = [];
    const emptyCup: Cup = { rounds: [], topScorers: [], topAssists: [], topMotm: [] };

    // Encontre a definição da 'AFR_CL' e substitua-a por esta:
    comps.push({
      id: 'AFR_CL',
      name: 'África Champions League',
      continent: 'AFR',
      status: 'pending',
      season: this.season(),
      teams: [],
      // ADICIONE/MODIFIQUE ESTA SEÇÃO
      playoffPhase: {
        rounds: [
          { name: '1ª Fase PRÉ', matches: [] }, // 128 times -> 64 vencedores
          { name: '2ª Fase PRÉ', matches: [] }, // 64 times -> 32 vencedores
          { name: '3ª Fase PRÉ', matches: [] }  // 32 times -> 16 vencedores
        ],
        topScorers: [], topAssists: [], topMotm: []
      },
      leaguePhase: [{ id: 1, name: 'Fase de Liga', teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }],
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 7,
      topScorers: [],
      topAssists: [],
      topMotm: [],
      history: [],
      rankings: [],
    });

    // Asia
    comps.push({
      id: 'ASI_CL',
      name: 'Ásia Champions League',
      continent: 'ASI',
      status: 'pending',
      season: this.season(),
      teams: [],
      leaguePhase: [
        { id: 1, name: 'Fase de Liga', teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }
      ],
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 7, // <-- ALTERAÇÃO PRINCIPAL AQUI (de 11 para 7)
      topScorers: [],
      topAssists: [],
      topMotm: [],
      history: [],
      rankings: [],
    });

    comps.push({
      id: 'NCA_CL',
      name: 'America Champions League',
      continent: 'NCA',
      status: 'pending',
      season: this.season(),
      teams: [],
      leaguePhase: [
        { id: 1, name: 'Fase de Liga', teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] }
      ],
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 7,
      topScorers: [],
      topAssists: [],
      topMotm: [],
      history: [],
      rankings: [],
    });

    // South America
    comps.push({
      id: 'SAM_LIB',
      name: 'Copa Libertadores',
      continent: 'SAM',
      status: 'pending',
      season: this.season(),
      teams: [],
      playoffPhase: { ...emptyCup },
      leaguePhase: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Grupo ${String.fromCharCode(65 + i)}`, teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] })),
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 6,
      topScorers: [],
      topAssists: [],
      topMotm: [],
      history: [],
      rankings: [],
    });

    comps.push({
      id: 'SAM_SUL',
      name: 'Copa Sulamericana',
      continent: 'SAM',
      status: 'pending',
      season: this.season(),
      teams: [],
      // A ALTERAÇÃO ESTÁ AQUI: de length: 4 para length: 8
      leaguePhase: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Grupo ${String.fromCharCode(65 + i)}`, teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] })),
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 6,
      topScorers: [],
      topAssists: [],
      topMotm: [],
      history: [],
      rankings: [],
    });

    comps.push({
      id: 'SAM_REC',
      name: 'Recopa',
      continent: 'SAM',
      status: 'pending',
      season: this.season(),
      teams: [],
      leaguePhase: [],
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 0,
      topScorers: [], topAssists: [], topMotm: [],
      history: [],
      rankings: [],
    });

    // Europe — apenas Champions League e Europa League, 32 times direto na fase de liga
    const eurLeaguePhaseConfig = { id: 1, name: 'Fase de Liga', teams: [], fixtures: [], topScorers: [], topAssists: [], topMotm: [] };

    comps.push({
      id: 'EUR_CL',
      name: 'Champions League',
      continent: 'EUR',
      status: 'pending',
      season: this.season(),
      teams: [],
      leaguePhase: [JSON.parse(JSON.stringify(eurLeaguePhaseConfig))],
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 7,
      topScorers: [], topAssists: [], topMotm: [],
      history: [],
      rankings: [],
    });

    comps.push({
      id: 'EUR_EL',
      name: 'Europa League',
      continent: 'EUR',
      status: 'pending',
      season: this.season(),
      teams: [],
      leaguePhase: [JSON.parse(JSON.stringify(eurLeaguePhaseConfig))],
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 7,
      topScorers: [], topAssists: [], topMotm: [],
      history: [],
      rankings: [],
    });

    comps.push({
      id: 'EUR_SUP',
      name: 'Supercopa Europeia',
      continent: 'EUR',
      status: 'pending',
      season: this.season(),
      teams: [],
      leaguePhase: [],
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 0,
      topScorers: [], topAssists: [], topMotm: [],
      history: [],
      rankings: [],
    });    // Mundial de Clubes
    comps.push({
      id: 'WORLD_CWC',
      name: 'Mundial de Clubes',
      continent: 'WORLD',
      status: 'pending',
      season: this.season(),
      teams: [],
      leaguePhase: [],
      knockoutPhase: { ...emptyCup },
      currentLeagueRound: 0,
      totalLeagueRounds: 0,
      topScorers: [], topAssists: [], topMotm: [],
      history: [],
      rankings: [],
    });

    this.internationalCompetitions.set(comps);
  }

  private setupTeams(teamsData: any[] = customPlayersData): void {
    this.usedPlayerNames.clear();

    const isHydratedData = teamsData.length > 0 && teamsData[0].id !== undefined;

    const allTeams = teamsData
      .filter(t => t && t.teamName)
      .map((teamData, teamIndex): Team => {
        const countryId = teamData.countryId || 'UNKNOWN';
        const teamName = teamData.teamName || `Time ${teamIndex}`;

        // Use existing ID if available, otherwise generate one
        const teamId = teamData.id || `${countryId}-${teamName.replace(/\s/g, '')}-${teamIndex}`;

        const players: Player[] = [];

        const teamOverall = teamData.overall || 65;
        const rawBaseOverall = teamData.overall || 65;

        const team: Team = {
          id: teamId,
          teamName: teamName,
          countryId: countryId,
          budget: teamData.budget !== undefined ? teamData.budget : 100_000_000,
          players: [],
          youthAcademy: [],
          overall: teamOverall,
          overallVariation: isHydratedData ? (teamData.overallVariation || 0) : (teamOverall - rawBaseOverall),
          logoUrl: teamData.logoUrl || undefined,
          trophies: teamData.trophies || [],
          stats: teamData.stats || { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0, },
        };

        // Garante que a logoUrl esteja preenchida usando a lógica do getTeamCrest
        if (!team.logoUrl) {
          team.logoUrl = this.getTeamCrest(team);
        }

        return team;
      });

    // População de base desativada (Modo Overall Base puro)
    this.teams.set(allTeams);
  }

  public setupLeagues(assignments?: Map<string, string[]>): void {
    const newLeagues = this.LEAGUE_IDS.map(countryId => {
      let countryTeams;
      if (assignments && assignments.has(countryId)) {
        const teamIds = assignments.get(countryId)!;
        countryTeams = teamIds.map(id => this.teams().find(t => t.id === id)!).filter(Boolean);
      } else {
        countryTeams = this.teams().filter(t => t.countryId === countryId)
          .sort((a, b) => b.overall - a.overall);
      }
      return this.createLeague(countryId, countryTeams);
    });
    // Garantir que não existam ligas duplicadas (mesmo país)
    const uniqueLeagues: League[] = [];
    const seenCountries = new Set<string>();
    for (const league of newLeagues) {
      if (!seenCountries.has(league.countryId)) {
        seenCountries.add(league.countryId);
        uniqueLeagues.push(league);
      }
    }
    this.leagues.set(uniqueLeagues);
  }

  public createLeague(countryId: string, teams: Team[], existingHistory: SeasonRecord[] = [], existingRankings: ChampionshipRankings | null = null): League {
    const slotsConfig = this.getLeagueSlotsConfig(countryId);
    const singleDivisionLeagues = [];
    const isSingleDivision = singleDivisionLeagues.includes(countryId);
    const isFourTeamLeague = this.FOUR_TEAM_LEAGUE_IDS.includes(countryId);
    const isEightTeamSamLeague = this.EIGHT_TEAM_SAM_LEAGUE_IDS.includes(countryId);

    const isEightTeamNcaLeague = this.EIGHT_TEAM_NCA_LEAGUE_IDS.includes(countryId);
    const isTwoTeamNcaLeague = this.TWO_TEAM_NCA_LEAGUE_IDS.includes(countryId);
    const isEightTeamAsiLeague = this.EIGHT_TEAM_ASI_LEAGUE_IDS.includes(countryId);
    const isFourTeamAsiLeague = this.FOUR_TEAM_ASI_LEAGUE_IDS.includes(countryId);
    const isTwoTeamAsiLeague = this.TWO_TEAM_ASI_LEAGUE_IDS.includes(countryId);
    const eligibleForSupercup = ['ESP', 'ENG', 'ITA', 'GER', 'FRA'].includes(countryId);
    let supercup: Cup | undefined = undefined;

    let continent: 'EUR' | 'SAM' | 'ASI' | 'NCA' | 'OCE' | 'AFR' | 'WORLD' = 'EUR';
    if (this.EIGHT_TEAM_SAM_LEAGUE_IDS.includes(countryId) || ['BRA', 'ARG'].includes(countryId)) {
      continent = 'SAM';
    } else if (this.EIGHT_TEAM_NCA_LEAGUE_IDS.includes(countryId) || this.TWO_TEAM_NCA_LEAGUE_IDS.includes(countryId) || ['USA', 'MEX'].includes(countryId)) {
      continent = 'NCA';
    } else if (this.EIGHT_TEAM_ASI_LEAGUE_IDS.includes(countryId) || this.FOUR_TEAM_ASI_LEAGUE_IDS.includes(countryId) || this.TWO_TEAM_ASI_LEAGUE_IDS.includes(countryId) || ['JPN', 'SAU', 'KOR', 'AUS'].includes(countryId)) {
      continent = 'ASI';
    }

    if (eligibleForSupercup) {
      console.log(`🏆 Criando Supercopa Nacional para ${countryId} (${this.COUNTRY_NAMES[countryId]})`);
      const primeraTeams = teams.slice(0, 16);
      const shuffledTeams = [...primeraTeams];
      for (let i = shuffledTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
      }

      const roundOf16: CupRound = {
        name: 'Oitavas de Final',
        matches: [],
      };

      for (let i = 0; i < 8; i++) {
        roundOf16.matches.push({
          id: `supercup-r16-${i}-${Date.now()}`,
          homeTeam: shuffledTeams[i * 2],
          awayTeam: shuffledTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      supercup = {
        rounds: [
          roundOf16,
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
      console.log(`✅ Supercopa criada com ${roundOf16.matches.length} jogos nas Oitavas de Final`);
    } else {
      console.log(`❌ ${countryId} (${this.COUNTRY_NAMES[countryId]}) não é elegível para Supercopa`);
    }

    if (countryId === 'BRA') {
      const div1Teams = teams.slice(0, 20);
      const div2Teams = teams.slice(20, 40);
      const div3Teams = teams.slice(40, 60);
      const div4Teams = teams.slice(60, 80);
      const div5Teams = teams.slice(80, 128); // 48 teams

      const division1: Division = { id: 1, name: 'Série A', teams: div1Teams, fixtures: this.generateFixtures(div1Teams, 'Série A'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: 0 };
      const division2: Division = { id: 2, name: 'Série B', teams: div2Teams, fixtures: this.generateFixtures(div2Teams, 'Série B'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: slotsConfig.promotion };
      const division3: Division = { id: 3, name: 'Série C', teams: div3Teams, fixtures: this.generateFixtures(div3Teams, 'Série C'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: slotsConfig.promotion };
      const division4: Division = { id: 4, name: 'Série D', teams: div4Teams, fixtures: this.generateFixtures(div4Teams, 'Série D'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: slotsConfig.promotion };

      // Série E com 4 Módulos
      const modules: Division[] = [];
      const moduleNames = ['Série E - Norte/Nordeste', 'Série E - Centro-Oeste/Sudeste', 'Série E - Rio/Sudeste', 'Série E - Sul'];
      for (let i = 0; i < 4; i++) {
        const moduleTeams = div5Teams.slice(i * 12, (i + 1) * 12);
        modules.push({
          id: 5 + i,
          name: moduleNames[i],
          teams: moduleTeams,
          fixtures: this.generateFixtures(moduleTeams, moduleNames[i]),
          topScorers: [], topAssists: [], topMotm: []
        });
      }

      const cup = this.generateBrazilianCup(teams.slice(0, 128));
      const totalRounds = (20 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        division2: [],
        division3: [],
        division4: [],
        leagueCup: [],
        cup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division1, division2, division3, division4, ...modules],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'ENG') {
      const div1Teams = teams.slice(0, 16);
      const div2Teams = teams.slice(16, 32);
      const div3Teams = teams.slice(32, 48);
      const div4Teams = teams.slice(48, 64);

      const division1: Division = { id: 1, name: 'Premier League', teams: div1Teams, fixtures: this.generateFixtures(div1Teams, 'Premier League'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: 0 };
      const division2: Division = { id: 2, name: 'EFL Championship', teams: div2Teams, fixtures: this.generateFixtures(div2Teams, 'EFL Championship'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: slotsConfig.promotion };
      const division3: Division = { id: 3, name: 'EFL League One', teams: div3Teams, fixtures: this.generateFixtures(div3Teams, 'EFL League One'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: slotsConfig.promotion };
      const division4: Division = { id: 4, name: 'EFL League Two', teams: div4Teams, fixtures: this.generateFixtures(div4Teams, 'EFL League Two'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: 0, promotionSlots: slotsConfig.promotion };

      const cup = this.generateBrazilianCup(teams.slice(0, 64)); // Keep ENG as 64 for now
      const totalRounds = (16 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        division2: [],
        division3: [],
        division4: [],
        cup: [],
        supercup: supercup ? [] : undefined,
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division1, division2, division3, division4],
        cup,
        supercup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'USA') {
      const eastTeams = teams.slice(0, 16);
      const westTeams = teams.slice(16, 32);

      const divEast: Division = {
        id: 1, name: 'Conferência Leste',
        teams: eastTeams,
        fixtures: this.generateFixtures(eastTeams, 'Conferência Leste'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 0
      };
      const divWest: Division = {
        id: 2, name: 'Conferência Oeste',
        teams: westTeams,
        fixtures: this.generateFixtures(westTeams, 'Conferência Oeste'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 0
      };

      const cup = this.generateCup(teams.slice(0, 32), []);
      const mlsCup = this.generateCup(teams.slice(0, 32), []); // MLS Cup Playoffs
      const totalRounds = (16 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [], division2: [],
        cup: [], leagueCup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [divEast, divWest],
        cup,
        leagueCup: mlsCup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'MEX') {
      const divisionTeams = teams.slice(0, 20);
      const division: Division = {
        id: 1, name: 'Primeira Divisão',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Primeira Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 0
      };

      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (20 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'JPN') {
      const div1Teams = teams.slice(0, 18);
      const div2Teams = teams.slice(18, 30);

      const division1: Division = {
        id: 1, name: 'J1 League',
        teams: div1Teams,
        fixtures: this.generateFixtures(div1Teams, 'J1 League'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 3
      };

      const division2: Division = {
        id: 2, name: 'J2 League',
        teams: div2Teams,
        fixtures: this.generateFixtures(div2Teams, 'J2 League'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 0
      };

      const cup = this.generateCup(div1Teams, div2Teams);
      const totalRounds = (18 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        division2: [],
        cup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division1, division2],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'KOR') {
      const divisionTeams = teams.slice(0, 12);
      const division: Division = {
        id: 1, name: 'K League 1',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'K League 1'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 1
      };

      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (12 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'AUS') {
      const divisionTeams = teams.slice(0, 12);
      const division: Division = {
        id: 1, name: 'A-League',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'A-League'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 0
      };

      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (12 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'SAU') {
      const divisionTeams = teams.slice(0, 12);
      const division: Division = {
        id: 1, name: 'Saudi Pro League',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Saudi Pro League'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 3
      };

      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (12 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'ARG') {
      const div1Teams = teams.slice(0, 16);
      const div2Teams = teams.slice(16, 32);

      const division1: Division = {
        id: 1, name: 'Liga Profesional',
        teams: div1Teams,
        fixtures: this.generateFixtures(div1Teams, 'Liga Profesional'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 2
      };

      const division2: Division = {
        id: 2, name: 'Primera B Nacional',
        teams: div2Teams,
        fixtures: this.generateFixtures(div2Teams, 'Primera B Nacional'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 0
      };

      const cup = this.generateCup(div1Teams, div2Teams);
      const totalRounds = (16 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        division2: [],
        cup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division1, division2],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'ESP') {
      const div1Teams = teams.slice(0, 16);
      const div2Teams = teams.slice(16, 32);

      const division1: Division = {
        id: 1, name: 'La Liga',
        teams: div1Teams,
        fixtures: this.generateFixtures(div1Teams, 'La Liga'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 3
      };

      const division2: Division = {
        id: 2, name: 'Segunda División',
        teams: div2Teams,
        fixtures: this.generateFixtures(div2Teams, 'Segunda División'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 4
      };

      const cup = this.generateCup(div1Teams, div2Teams);
      const totalRounds = (16 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        division2: [],
        cup: [],
        supercup: supercup ? [] : undefined,
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division1, division2],
        cup,
        supercup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'ITA') {
      const div1Teams = teams.slice(0, 16);
      const div2Teams = teams.slice(16, 24);
      const div3Teams = teams.slice(24, 32);

      const division1: Division = { id: 1, name: 'Serie A', teams: div1Teams, fixtures: this.generateFixtures(div1Teams, 'Serie A'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: 0 };
      const division2: Division = { id: 2, name: 'Serie B', teams: div2Teams, fixtures: this.generateFixtures(div2Teams, 'Serie B'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: slotsConfig.promotion };
      const division3: Division = { id: 3, name: 'Serie C', teams: div3Teams, fixtures: this.generateFixtures(div3Teams, 'Serie C'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: 0, promotionSlots: slotsConfig.promotion };

      const cup = this.generateCup(div1Teams, div2Teams);
      const totalRounds = (16 - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || { division1: [], division2: [], division3: [], cup: [], supercup: supercup ? [] : undefined };

      return { countryId, countryName: this.COUNTRY_NAMES[countryId], continent, currentRound: 0, totalRounds, status: 'ongoing', divisions: [division1, division2, division3], cup, supercup, history: existingHistory, rankings };
    }

    if (countryId === 'GER') {
      const div1Teams = teams.slice(0, 16);
      const div2Teams = teams.slice(16, 24);
      const div3Teams = teams.slice(24, 32);

      const division1: Division = { id: 1, name: 'Bundesliga', teams: div1Teams, fixtures: this.generateFixtures(div1Teams, 'Bundesliga'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: 0 };
      const division2: Division = { id: 2, name: '2. Bundesliga', teams: div2Teams, fixtures: this.generateFixtures(div2Teams, '2. Bundesliga'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: slotsConfig.promotion };
      const division3: Division = { id: 3, name: '3. Liga', teams: div3Teams, fixtures: this.generateFixtures(div3Teams, '3. Liga'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: 0, promotionSlots: slotsConfig.promotion };

      const cup = this.generateCup(div1Teams, div2Teams);
      const totalRounds = (16 - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || { division1: [], division2: [], division3: [], cup: [], supercup: supercup ? [] : undefined };

      return { countryId, countryName: this.COUNTRY_NAMES[countryId], continent, currentRound: 0, totalRounds, status: 'ongoing', divisions: [division1, division2, division3], cup, supercup, history: existingHistory, rankings };
    }

    if (countryId === 'FRA') {
      const div1Teams = teams.slice(0, 16);
      const div2Teams = teams.slice(16, 24);
      const div3Teams = teams.slice(24, 32);

      const division1: Division = { id: 1, name: 'Ligue 1', teams: div1Teams, fixtures: this.generateFixtures(div1Teams, 'Ligue 1'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: 0 };
      const division2: Division = { id: 2, name: 'Ligue 2', teams: div2Teams, fixtures: this.generateFixtures(div2Teams, 'Ligue 2'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: slotsConfig.relegation, promotionSlots: slotsConfig.promotion };
      const division3: Division = { id: 3, name: 'National', teams: div3Teams, fixtures: this.generateFixtures(div3Teams, 'National'), topScorers: [], topAssists: [], topMotm: [], relegationSlots: 0, promotionSlots: slotsConfig.promotion };

      const cup = this.generateCup(div1Teams, div2Teams);
      const totalRounds = (16 - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || { division1: [], division2: [], division3: [], cup: [], supercup: supercup ? [] : undefined };

      return { countryId, countryName: this.COUNTRY_NAMES[countryId], continent, currentRound: 0, totalRounds, status: 'ongoing', divisions: [division1, division2, division3], cup, supercup, history: existingHistory, rankings };
    }

    if (countryId === 'BEL') {
      const divisionTeams = teams.slice(0, 10);
      const division: Division = {
        id: 1, name: 'Primeira Divisão',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Primeira Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 2
      };

      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (10 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'POR') {
      const div1Teams = teams.slice(0, 12);
      const div2Teams = teams.slice(12, 24);

      const division1: Division = {
        id: 1, name: 'Primeira Divisão',
        teams: div1Teams,
        fixtures: this.generateFixtures(div1Teams, 'Primeira Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 2
      };

      const division2: Division = {
        id: 2, name: 'Segunda Divisão',
        teams: div2Teams,
        fixtures: this.generateFixtures(div2Teams, 'Segunda Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 0
      };

      const cup = this.generateCup(div1Teams, div2Teams);
      const totalRounds = (12 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        division2: [],
        cup: [],
        supercup: supercup ? [] : undefined,
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division1, division2],
        cup,
        supercup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'NED') {
      const div1Teams = teams.slice(0, 8);
      const div2Teams = teams.slice(8, 16);

      const division1: Division = {
        id: 1, name: 'Primeira Divisão',
        teams: div1Teams,
        fixtures: this.generateFixtures(div1Teams, 'Primeira Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 2
      };

      const division2: Division = {
        id: 2, name: 'Segunda Divisão',
        teams: div2Teams,
        fixtures: this.generateFixtures(div2Teams, 'Segunda Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 0
      };

      const cup = this.generateCup(div1Teams, div2Teams);
      const totalRounds = (8 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        division2: [],
        cup: [],
        supercup: supercup ? [] : undefined,
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division1, division2],
        cup,
        supercup,
        history: existingHistory,
        rankings,
      };
    }

    if (countryId === 'RUS') {
      const div1Teams = teams.slice(0, 8);

      const division1: Division = {
        id: 1, name: 'Primeira Divisão',
        teams: div1Teams,
        fixtures: this.generateFixtures(div1Teams, 'Primeira Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
        relegationSlots: 2
      };

      const cup = this.generateCup(div1Teams, []);
      const totalRounds = (8 - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
        supercup: supercup ? [] : undefined,
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds,
        status: 'ongoing',
        divisions: [division1],
        cup,
        supercup,
        history: existingHistory,
        rankings,
      };
    }



    if (isTwoTeamNcaLeague) {
      const divisionTeams = teams.slice(0, 8);
      const division: Division = {
        id: 1,
        name: 'Primeira Divisão',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Primeira Divisão'),
        topScorers: [],
        topAssists: [],
        topMotm: [],
      };
      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (8 - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };
      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (isTwoTeamAsiLeague) {
      const divisionTeams = teams.slice(0, 8);
      const division: Division = {
        id: 1,
        name: 'Primeira Divisão',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Primeira Divisão'),
        topScorers: [],
        topAssists: [],
        topMotm: [],
      };
      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (8 - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };
      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (isFourTeamAsiLeague) {
      const divisionTeams = teams.slice(0, 8);
      const division: Division = {
        id: 1,
        name: 'Divisão Única',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Divisão Única'),
        topScorers: [],
        topAssists: [],
        topMotm: [],
      };
      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (8 - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };
      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (isEightTeamSamLeague) {
      const divisionTeams = [...teams];
      const division: Division = {
        id: 1,
        name: 'Divisão Única',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Divisão Única'),
        topScorers: [],
        topAssists: [],
        topMotm: [],
      };
      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (divisionTeams.length - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };
      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (isEightTeamNcaLeague) {
      const divisionTeams = teams.slice(0, 16);
      const division: Division = {
        id: 1,
        name: 'Divisão Única',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Divisão Única'),
        topScorers: [],
        topAssists: [],
        topMotm: [],
      };
      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (16 - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };
      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    if (isEightTeamAsiLeague) {
      const divisionTeams = teams.slice(0, 8);
      const division: Division = {
        id: 1,
        name: 'Divisão Única',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Divisão Única'),
        topScorers: [],
        topAssists: [],
        topMotm: [],
      };
      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (8 - 1) * 2;
      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        cup: [],
      };
      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    }

    const rankings: ChampionshipRankings = existingRankings || {
      division1: [],
      division2: (isSingleDivision || isFourTeamLeague) ? undefined : [],
      cup: [],
      supercup: supercup ? [] : undefined,
    };

    if (isFourTeamLeague) {
      const divisionTeams = teams.slice(0, 8);
      const division: Division = {
        id: 1,
        name: 'Primeira Divisão',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Primeira Divisão'),
        topScorers: [],
        topAssists: [],
        topMotm: [],
      };
      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (divisionTeams.length - 1) * 2;
      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    } else if (isSingleDivision) {
      const divisionTeams = teams.slice(0, 12);
      const division: Division = {
        id: 1,
        name: 'Primeira Divisão',
        teams: divisionTeams,
        fixtures: this.generateFixtures(divisionTeams, 'Primeira Divisão'),
        topScorers: [],
        topAssists: [],
        topMotm: [],
      };

      const cup = this.generateCup(divisionTeams, []);
      const totalRounds = (divisionTeams.length - 1) * 2;

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division],
        cup,
        history: existingHistory,
        rankings,
      };
    } else {
      const div1Teams = teams.slice(0, 16);
      const div2Teams = teams.slice(16, 24);
      const div3Teams = teams.slice(24, 32); // Adicionado

      const division1: Division = {
        id: 1,
        name: 'Primeira Divisão',
        teams: div1Teams,
        fixtures: this.generateFixtures(div1Teams, 'Primeira Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
      };

      const division2: Division = {
        id: 2,
        name: 'Segunda Divisão',
        teams: div2Teams,
        fixtures: this.generateFixtures(div2Teams, 'Segunda Divisão'),
        topScorers: [], topAssists: [], topMotm: [],
      };

      const division3: Division = { // Adicionado
        id: 3, name: 'Terceira Divisão',
        teams: div3Teams,
        fixtures: this.generateFixtures(div3Teams, 'Terceira Divisão'),
        topScorers: [], topAssists: [], topMotm: []
      };

      const cup = this.generateCup(div1Teams, [...div2Teams, ...div3Teams]); // Atualizado para incluir a 3ª divisão
      const totalRounds = (div1Teams.length - 1) * 2;

      const rankings: ChampionshipRankings = existingRankings || {
        division1: [],
        division2: [],
        division3: [], // Adicionado
        cup: [],
        supercup: supercup ? [] : undefined,
      };

      return {
        countryId,
        countryName: this.COUNTRY_NAMES[countryId],
        continent,
        currentRound: 0,
        totalRounds: totalRounds,
        status: 'ongoing',
        divisions: [division1, division2, division3], // Atualizado
        cup,
        supercup,
        history: existingHistory,
        rankings,
      };
    }
  }

  public generateFixtures(teams: Team[], divisionName: string): Match[][] {
    let schedule: (Team | null)[] = [...teams];
    let numTeams = teams.length;

    if (numTeams % 2 !== 0) {
      schedule.push(null); // Add a bye team
      numTeams++;
    }

    if (numTeams < 2) return [];

    const totalRounds = (numTeams - 1) * 2;
    const matchesPerRound = numTeams / 2;
    const halfRounds = totalRounds / 2;

    const rounds: Match[][] = Array.from({ length: totalRounds }, () => []);

    for (let roundIdx = 0; roundIdx < halfRounds; roundIdx++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const home = schedule[i];
        const away = schedule[numTeams - 1 - i];

        if (home && away) {
          rounds[roundIdx].push(this.createMatch(roundIdx, home, away, divisionName));
          rounds[roundIdx + halfRounds].push(this.createMatch(roundIdx + halfRounds, away, home, divisionName));
        }
      }
      if (numTeams > 2) {
        schedule.splice(1, 0, schedule.pop()!);
      }
    }

    return rounds;
  }

  public createMatch(round: number, home: Team, away: Team, divisionName: string): Match {
    return {
      id: `${home.id}-vs-${away.id}-${round}-${Date.now()}${Math.random()}`,
      round,
      homeTeam: home,
      awayTeam: away,
      played: false,
      divisionName,
      events: { goals: [], assists: [], motm: null },
    };
  }

  public generateBrazilianCup(allTeams: Team[]): Cup {
    const shuffledTeams = [...allTeams];

    // Embaralha os times
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    const totalTeams = shuffledTeams.length;
    const matchesPerRound = totalTeams / 2;
    const round1: CupRound = { name: 'Primeira Fase', matches: [] };
    for (let i = 0; i < matchesPerRound; i++) {
      round1.matches.push({
        id: `cup-bra-r1-${i}-${Date.now()}`,
        homeTeam: shuffledTeams[i * 2],
        awayTeam: shuffledTeams[i * 2 + 1],
        played: false, leg1Played: false, leg2Played: false,
      });
    }

    const rounds: CupRound[] = [round1];
    if (totalTeams === 128) {
      rounds.push({ name: 'Segunda Fase', matches: [] });
      rounds.push({ name: 'Terceira Fase', matches: [] });
    } else if (totalTeams === 64) {
      rounds.push({ name: 'Segunda Fase', matches: [] });
    }

    rounds.push({ name: 'Oitavas de Final', matches: [] });
    rounds.push({ name: 'Quartas de Final', matches: [] });
    rounds.push({ name: 'Semifinais', matches: [] });
    rounds.push({ name: 'Final', matches: [] });

    return {
      rounds,
      topScorers: [], topAssists: [], topMotm: [],
    };
  }

  public generateCup(primeraTeams: Team[], segundaTeams: Team[]): Cup {
    const totalTeams = primeraTeams.length + segundaTeams.length;

    if (totalTeams === 32) {
      const allTeams = [...primeraTeams, ...segundaTeams];
      // Embaralha os times
      for (let i = allTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTeams[i], allTeams[j]] = [allTeams[j], allTeams[i]];
      }

      const roundOf32: CupRound = { name: 'Trinta e Dois Avos de Final', matches: [] };
      for (let i = 0; i < 16; i++) { // 16 partidas
        roundOf32.matches.push({
          id: `cup-r32-${i}-${Date.now()}`,
          homeTeam: allTeams[i * 2],
          awayTeam: allTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          roundOf32,
          { name: 'Oitavas de Final', matches: [] },
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 2) {
      const allTeams = [...primeraTeams];
      const final: CupRound = {
        name: 'Final',
        matches: [{
          id: `cup-final-0-${Date.now()}`,
          homeTeam: allTeams[0],
          awayTeam: allTeams[1],
          played: false, leg1Played: false, leg2Played: false,
        }],
      };
      return {
        rounds: [final],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 8) {
      const allTeams = [...primeraTeams];
      for (let i = allTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTeams[i], allTeams[j]] = [allTeams[j], allTeams[i]];
      }
      const quarterFinals: CupRound = {
        name: 'Quartas de Final',
        matches: [],
      };
      for (let i = 0; i < 4; i++) {
        quarterFinals.matches.push({
          id: `cup-qf-${i}-${Date.now()}`,
          homeTeam: allTeams[i * 2],
          awayTeam: allTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }
      return {
        rounds: [
          quarterFinals,
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 16) {
      const allTeams = [...primeraTeams, ...segundaTeams];
      for (let i = allTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTeams[i], allTeams[j]] = [allTeams[j], allTeams[i]];
      }

      const roundOf16: CupRound = {
        name: 'Oitavas de Final',
        matches: [],
      };
      for (let i = 0; i < 8; i++) {
        roundOf16.matches.push({
          id: `cup-r16-${i}-${Date.now()}`,
          homeTeam: allTeams[i * 2],
          awayTeam: allTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          roundOf16,
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 12) {
      const allTeams = [...primeraTeams];
      // Ordenar por overall para dar "bye" aos melhores
      allTeams.sort((a, b) => b.overall - a.overall);

      const byes = allTeams.slice(0, 4);
      const prelimTeams = allTeams.slice(4);

      // Embaralha os times da preliminar
      for (let i = prelimTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prelimTeams[i], prelimTeams[j]] = [prelimTeams[j], prelimTeams[i]];
      }

      const prelimRound: CupRound = { name: 'Fase Preliminar', matches: [] };
      for (let i = 0; i < 4; i++) {
        prelimRound.matches.push({
          id: `cup-prelim-${i}-${Date.now()}`,
          homeTeam: prelimTeams[i * 2],
          awayTeam: prelimTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          prelimRound,
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 10) {
      const allTeams = [...primeraTeams];
      allTeams.sort((a, b) => b.overall - a.overall);

      const byes = allTeams.slice(0, 6);
      const prelimTeams = allTeams.slice(6);

      for (let i = prelimTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prelimTeams[i], prelimTeams[j]] = [prelimTeams[j], prelimTeams[i]];
      }

      const prelimRound: CupRound = { name: 'Fase Preliminar', matches: [] };
      for (let i = 0; i < 2; i++) {
        prelimRound.matches.push({
          id: `cup-prelim-${i}-${Date.now()}`,
          homeTeam: prelimTeams[i * 2],
          awayTeam: prelimTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          prelimRound,
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 4) {
      const allTeams = [...primeraTeams];
      for (let i = allTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTeams[i], allTeams[j]] = [allTeams[j], allTeams[i]];
      }

      const semifinals: CupRound = {
        name: 'Semifinais',
        matches: [],
      };
      for (let i = 0; i < 2; i++) {
        semifinals.matches.push({
          id: `cup-semi-${i}-${Date.now()}`,
          homeTeam: allTeams[i * 2],
          awayTeam: allTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          semifinals,
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 24) {
      const allTeams = [...primeraTeams, ...segundaTeams].sort((a, b) => b.overall - a.overall);

      const byes = allTeams.slice(0, 8);
      const prelimTeams = allTeams.slice(8);

      // Embaralha os times da preliminar
      for (let i = prelimTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prelimTeams[i], prelimTeams[j]] = [prelimTeams[j], prelimTeams[i]];
      }

      const prelimRound: CupRound = { name: 'Fase Preliminar', matches: [] };
      for (let i = 0; i < 8; i++) {
        prelimRound.matches.push({
          id: `cup-prelim-${i}-${Date.now()}`,
          homeTeam: prelimTeams[i * 2],
          awayTeam: prelimTeams[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          prelimRound,
          { name: 'Oitavas de Final', matches: [] },
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 20) {
      const allTeams = [...primeraTeams, ...segundaTeams].sort((a, b) => b.overall - a.overall);
      const top12 = allTeams.slice(0, 12);
      const remaining8 = allTeams.slice(12);

      for (let i = remaining8.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining8[i], remaining8[j]] = [remaining8[j], remaining8[i]];
      }

      const preliminaryRound: CupRound = {
        name: 'Fase Preliminar',
        matches: [],
      };
      for (let i = 0; i < 4; i++) {
        preliminaryRound.matches.push({
          id: `cup-prelim-${i}-${Date.now()}`,
          homeTeam: remaining8[i * 2],
          awayTeam: remaining8[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          preliminaryRound,
          { name: 'Oitavas de Final', matches: [] },
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 32) {
      const allTeams = [...primeraTeams, ...segundaTeams].sort((a, b) => b.overall - a.overall);
      const rounds: CupRound[] = [
        { name: 'Dezesseis-avos de Final', matches: [] },
        { name: 'Oitavas de Final', matches: [] },
        { name: 'Quartas de Final', matches: [] },
        { name: 'Semifinais', matches: [] },
        { name: 'Final', matches: [] }
      ];

      for (let i = 0; i < 16; i++) {
        rounds[0].matches.push({
          id: `cup-32-${i}-${Date.now()}`,
          homeTeam: allTeams[i],
          awayTeam: allTeams[31 - i],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds,
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 30) {
      const allTeams = [...primeraTeams, ...segundaTeams].sort((a, b) => b.overall - a.overall);
      const top2 = allTeams.slice(0, 2);
      const remaining28 = allTeams.slice(2);

      for (let i = remaining28.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining28[i], remaining28[j]] = [remaining28[j], remaining28[i]];
      }

      const preliminaryRound: CupRound = {
        name: 'Fase Preliminar',
        matches: [],
      };
      for (let i = 0; i < 14; i++) {
        preliminaryRound.matches.push({
          id: `cup-prelim-${i}-${Date.now()}`,
          homeTeam: remaining28[i * 2],
          awayTeam: remaining28[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          preliminaryRound,
          { name: 'Oitavas de Final', matches: [] },
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (totalTeams === 10) {
      const allTeams = [...primeraTeams].sort((a, b) => b.overall - a.overall);
      const top6 = allTeams.slice(0, 6);
      const remaining4 = allTeams.slice(6);

      for (let i = remaining4.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining4[i], remaining4[j]] = [remaining4[j], remaining4[i]];
      }

      const preliminaryRound: CupRound = {
        name: 'Fase Preliminar',
        matches: [],
      };
      for (let i = 0; i < 2; i++) {
        preliminaryRound.matches.push({
          id: `cup-prelim-${i}-${Date.now()}`,
          homeTeam: remaining4[i * 2],
          awayTeam: remaining4[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          preliminaryRound,
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }

    if (segundaTeams.length === 0) {
      const allTeams = [...primeraTeams].sort((a, b) => b.overall - a.overall);
      const top4 = allTeams.slice(0, 4);
      const remaining8 = allTeams.slice(4);

      for (let i = remaining8.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining8[i], remaining8[j]] = [remaining8[j], remaining8[i]];
      }

      const preliminaryRound: CupRound = {
        name: 'Fase Preliminar',
        matches: [],
      };
      for (let i = 0; i < 4; i++) {
        preliminaryRound.matches.push({
          id: `cup-prelim-${i}-${Date.now()}`,
          homeTeam: remaining8[i * 2],
          awayTeam: remaining8[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          preliminaryRound,
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    } else {
      const top8 = primeraTeams.slice(0, 8);
      const remaining16 = [...primeraTeams.slice(8), ...segundaTeams];

      for (let i = remaining16.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining16[i], remaining16[j]] = [remaining16[j], remaining16[i]];
      }

      const preliminaryRound: CupRound = {
        name: 'Fase Preliminar',
        matches: [],
      };

      for (let i = 0; i < 8; i++) {
        preliminaryRound.matches.push({
          id: `cup-prelim-${i}-${Date.now()}`,
          homeTeam: remaining16[i * 2],
          awayTeam: remaining16[i * 2 + 1],
          played: false, leg1Played: false, leg2Played: false,
        });
      }

      return {
        rounds: [
          preliminaryRound,
          { name: 'Oitavas de Final', matches: [] },
          { name: 'Quartas de Final', matches: [] },
          { name: 'Semifinais', matches: [] },
          { name: 'Final', matches: [] }
        ],
        topScorers: [], topAssists: [], topMotm: [],
      };
    }
  }

  private calculateTeamOverall(players: Player[]): number {
    return 60; // Legado: não é mais usado, o overall é base agora.
  }

  executeTransfer(playerId: string, buyingTeamId: string): { success: boolean, message: string } {
    return { success: false, message: "Sistema de transferências individuais desativado (Modo Overall Base)." };
  }

  updatePlayerDetails(updatedPlayer: Player, teamId: string): void {
    // Desativado
  }

  updateTeamDetails(updatedTeam: Team): void {
    this.teams.update(currentTeams => {
      const teamIndex = currentTeams.findIndex(t => t.id === updatedTeam.id);
      if (teamIndex > -1) {
        const newTeams = [...currentTeams];
        const existingTeam = newTeams[teamIndex];
        newTeams[teamIndex] = {
          ...existingTeam,
          teamName: updatedTeam.teamName,
          logoUrl: updatedTeam.logoUrl,
          budget: updatedTeam.budget,
          trophies: updatedTeam.trophies || []
        };
        return newTeams;
      }
      return currentTeams;
    });

    this.leagues.update(currentLeagues => {
      const newLeagues = JSON.parse(JSON.stringify(currentLeagues));
      let teamUpdated = false;
      for (const league of newLeagues) {
        for (const division of league.divisions) {
          const teamIndex = division.teams.findIndex((t: Team) => t.id === updatedTeam.id);
          if (teamIndex > -1) {
            const existingTeamInLeague = division.teams[teamIndex];
            division.teams[teamIndex] = {
              ...existingTeamInLeague,
              teamName: updatedTeam.teamName,
              logoUrl: updatedTeam.logoUrl,
              budget: updatedTeam.budget,
              trophies: updatedTeam.trophies || []
            };
            teamUpdated = true;
            break;
          }
        }
        if (teamUpdated) {
          break;
        }
      }
      return newLeagues;
    });
  }

  renewPlayerContract(playerId: string, teamId: string, newLength: number): void {
    // Desativado
  }

  terminatePlayerContract(playerId: string, teamId: string): void {
    // Desativado
  }

  retirePlayer(playerId: string, teamId: string): void {

    this.syncLeagues();
  }

  promotePlayer(playerId: string, teamId: string): void {
    // Desativado
  }

  releasePlayer(playerId: string, teamId: string): void {
    // Desativado
  }

  getPlayerHistory(playerId: string) {
    return {
      careerStats: {},
      totalCareerStats: { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 },
      trophies: new Map(),
      individualAwards: [],
      clubHistory: [],
      overallHistory: []
    };
  }

  public getHeadToHead(teamAId: string, teamBId: string): H2HData {
      const history = this.matchHistory().filter(
        m => (m.homeTeamId === teamAId && m.awayTeamId === teamBId) || (m.homeTeamId === teamBId && m.awayTeamId === teamAId)
      );

      const teamAWins = history.filter(
        m => (m.homeTeamId === teamAId && m.homeScore > m.awayScore) || (m.awayTeamId === teamAId && m.awayScore > m.homeScore)
      ).length;

      const teamBWins = history.filter(
        m => (m.homeTeamId === teamBId && m.homeScore > m.awayScore) || (m.awayTeamId === teamBId && m.awayScore > m.homeScore)
      ).length;

      const draws = history.filter(m => m.homeScore === m.awayScore).length;

      return {
        teamAWins,
        teamBWins,
        draws,
        history: history.sort((a, b) => b.season - a.season)
      };
    }

  public getUpToDateTeamsForInternationalComp(competition: InternationalCompetition): Team[] {
      if(competition.status === 'playoffs') {
      return competition.teams;
    }
    const teamsFromLeague = competition.leaguePhase.flatMap((g: Division) => g.teams);
    if (teamsFromLeague.length > 0) {
      return teamsFromLeague;
    }
    const teamsFromKnockout = new Map<string, Team>();
    competition.knockoutPhase?.rounds.forEach(r => {
      r.matches.forEach(m => {
        if (m.homeTeam) teamsFromKnockout.set(m.homeTeam.id, m.homeTeam);
        if (m.awayTeam) teamsFromKnockout.set(m.awayTeam.id, m.awayTeam);
      });
    });
    if (teamsFromKnockout.size > 0) {
      return Array.from(teamsFromKnockout.values());
    }
    return competition.teams;
  }

  public _recordHistoricMatch(homeTeam: Team, awayTeam: Team, homeScore: number, awayScore: number, competitionName: string, id?: string, scorers?: { home: { name: string, goals: number }[], away: { name: string, goals: number }[] }, round?: number): void {
    const historicMatch: HistoricMatch = {
      id: id || `hist-${Date.now()}-${Math.random()}`,
      season: this.season(),
      round_number: round,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeTeamName: homeTeam.teamName,
      awayTeamName: awayTeam.teamName,
      homeScore,
      awayScore,
      competitionName,
      homeScorers: scorers?.home,
      awayScorers: scorers?.away,
    };
    this.matchHistory.update(history => [...history, historicMatch]);
  }

  // --- NOVO MÉTODO ---
  public updateNationalTeamPlayerNumber(playerId: string, clubTeamId: string, newNumber: number): void {
    // Desativado
  }

  public getNationalTeams(): Team[] {
    return []; // Desativado: o jogo é focado em clubes agora.
  }

  public getNationalTeamsFullList(): Team[] {
    return NATIONALITIES.map(n => ({
      id: `NT-${n.code3}`,
      teamName: n.name,
      countryId: n.code3,
      players: [],
      youthAcademy: [],
      overall: 0,
      budget: 0,
      stats: { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
    })).sort((a, b) => a.teamName.localeCompare(b.teamName));
  }

  private syncLeagues(): void {
    const updatedTeamsMap = new Map();
    this.teams().forEach(t => updatedTeamsMap.set(t.id, t));

    this.leagues.update(currentLeagues => {
      return currentLeagues.map(league => ({
        ...league,
        divisions: league.divisions.map(division => ({
          ...division,
          teams: division.teams.map(team => updatedTeamsMap.get(team.id) || team)
        }))
      }));
    });
  }

  /**
   * Carrega o estado do Universo a partir de um objeto de save do Firebase reconstruído
   */
  loadFromFirebaseState(state: any) {
    if (!state) return;

    console.log("♻️ Aplicando estado carregado do Firebase...");

    // 1. Restaurar Metadados
    this.season.set(state.season || 1);

    // 2. Restaurar Times (Master List)
    if (state.teams && state.teams.length > 0) {
      this.teams.set(state.teams);
    }

    // Criar um mapa para re-linkar referências e garantir que todos usem o MESMO objeto em memória
    const teamMap = new Map(this.teams().map(t => [t.id, t]));

    // 3. Restaurar Ligas (Re-linkando referências)
    if (state.leagues && state.leagues.length > 0) {
      const linkedLeagues = state.leagues.map((l: League) => ({
        ...l,
        divisions: l.divisions.map(d => ({
          ...d,
          teams: d.teams.map(t => teamMap.get(t.id) || t)
        }))
      }));
      this.leagues.set(linkedLeagues);
    }

    // 4. Restaurar Competições Internacionais (Re-linkando referências)
    if (state.internationalComps && state.internationalComps.length > 0) {
      const linkedIntComps = state.internationalComps.map((comp: InternationalCompetition) => {
        if (comp.rankings) {
          comp.rankings = comp.rankings.map(r => ({
            ...r,
            team: teamMap.get(r.team.id) || r.team
          }));
        }
        return comp;
      });
      this.internationalCompetitions.set(linkedIntComps);
    }

    // 5. Restaurar Resumos
    this.seasonSummaries.set(state.summaries || []);

    // 6. Autocorreção: Recalibrar estatísticas
    // Isso garante que se algum save foi feito com stats zeradas (devido a bugs de referência ou clones profundos),
    // elas serão restauradas a partir do histórico real de partidas (fixtures).
    this.recalibrateAllStats();

    console.log("✅ Estado do Universo restaurado e estatísticas recalibradas.");
  }

  /**
   * Dispara a evolução anual das equipes
   */
  processYearlyEvolution() {
    // 1. Consolidar os times das ligas para a Master List (Garante que pontos/stats sejam preservados)
    const consolidatedTeams = new Map<string, Team>();
    this.leagues().forEach(league => {
      league.divisions.forEach(div => {
        div.teams.forEach(t => consolidatedTeams.set(t.id, t));
      });
    });

    if (consolidatedTeams.size > 0) {
      this.teams.set(Array.from(consolidatedTeams.values()));
    }

    const allTeams = this.teams();
    const currentLeagues = this.leagues();

    // 2. Rodar a evolução
    this.evolutionService.evolveUniverse(allTeams, currentLeagues);

    // 3. Atualizar os signals e refletir em todo o app
    this.teams.set([...allTeams]);
    this.syncLeagues();
  }

  /**
   * Retorna a configuração de vagas de promoção e rebaixamento por país.
   * Centraliza as regras para que o SeasonService e SeasonLifecycleService apenas obedeçam.
   */
  public getLeagueSlotsConfig(countryId: string): { promotion: number, relegation: number } {
    const id = countryId.trim();

    // Regras por país
    if (['ENG', 'ESP'].includes(id)) return { promotion: 3, relegation: 3 };
    if (['ITA', 'GER', 'FRA', 'POR', 'NED', 'ARG', 'RUS', 'TUR', 'BEL'].includes(id)) return { promotion: 2, relegation: 2 };
    if (id === 'BRA') return { promotion: 4, relegation: 4 };
    if (id === 'USA') return { promotion: 0, relegation: 0 };

    // Padrão para ligas menores ou não listadas
    return { promotion: 2, relegation: 2 };
  }

  /**
   * RECALIBRAGEM DE EMERGÊNCIA:
   * Reconstrói as estatísticas de todos os times do zero baseando-se apenas nos resultados reais das partidas.
   * Útil para consertar saves com jogos duplicados ou estatísticas corrompidas.
   */
  public recalibrateAllStats(): void {
    console.log('🛠️ Iniciando recalibragem de estatísticas...');

    // 1. Resetar stats de todos os times
    const currentTeams = this.teams();
    currentTeams.forEach(t => {
      t.stats = { points: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
    });

    // 2. Reprocessar Ligas Nacionais
    this.leagues().forEach(league => {
      league.divisions.forEach(div => {
        Object.values(div.fixtures).forEach(round => {
          round.forEach(match => {
            if (match.played && match.homeScore !== undefined && match.awayScore !== undefined) {
              const home = currentTeams.find(t => t.id === match.homeTeam.id);
              const away = currentTeams.find(t => t.id === match.awayTeam.id);

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
            }
          });
        });
      });
    });

    // 3. Reprocessar Competições Internacionais (Fase de Liga e Grupos)
    this.internationalCompetitions().forEach(comp => {
      if (comp.leaguePhase) {
        comp.leaguePhase.forEach(div => {
          Object.values(div.fixtures).forEach(round => {
            round.forEach(match => {
              if (match.played && match.homeScore !== undefined && match.awayScore !== undefined) {
                const home = currentTeams.find(t => t.id === match.homeTeam.id);
                const away = currentTeams.find(t => t.id === match.awayTeam.id);
                if (home && away) this._applyStats(home, away, match.homeScore, match.awayScore);
              }
            });
          });
        });
      }

      // Reprocessar Mata-mata Internacional (Playoffs e Knockout)
      [comp.playoffPhase, comp.knockoutPhase].forEach(cup => {
        if (cup && cup.rounds) {
          cup.rounds.forEach(round => {
            round.matches.forEach(m => {
              // Ida
              if (m.leg1Played && m.homeScoreLeg1 !== undefined && m.awayScoreLeg1 !== undefined) {
                const home = currentTeams.find(t => t.id === m.homeTeam.id);
                const away = currentTeams.find(t => t.id === m.awayTeam.id);
                if (home && away) this._applyStats(home, away, m.homeScoreLeg1, m.awayScoreLeg1);
              }
              // Volta
              if (m.leg2Played && m.homeScoreLeg2 !== undefined && m.awayScoreLeg2 !== undefined) {
                const home = currentTeams.find(t => t.id === m.awayTeam.id); // Invertido na volta
                const away = currentTeams.find(t => t.id === m.homeTeam.id);
                if (home && away) this._applyStats(home, away, m.homeScoreLeg2, m.awayScoreLeg2);
              }
            });
          });
        }
      });
    });

    // 4. Reprocessar Copas Nacionais
    this.leagues().forEach(league => {
      [league.cup, league.leagueCup, league.supercup].forEach(cup => {
        if (cup && cup.rounds) {
          cup.rounds.forEach(round => {
            round.matches.forEach(m => {
              // Ida
              if (m.leg1Played && m.homeScoreLeg1 !== undefined && m.awayScoreLeg1 !== undefined) {
                const home = currentTeams.find(t => t.id === m.homeTeam.id);
                const away = currentTeams.find(t => t.id === m.awayTeam.id);
                if (home && away) this._applyStats(home, away, m.homeScoreLeg1, m.awayScoreLeg1);
              }
              // Volta
              if (m.leg2Played && m.homeScoreLeg2 !== undefined && m.awayScoreLeg2 !== undefined) {
                const home = currentTeams.find(t => t.id === m.awayTeam.id); // Invertido na volta
                const away = currentTeams.find(t => t.id === m.homeTeam.id);
                if (home && away) this._applyStats(home, away, m.homeScoreLeg2, m.awayScoreLeg2);
              }
            });
          });
        }
      });
    });

    // 5. Forçar atualização do sinal
    this.teams.set([...currentTeams]);
    console.log('✅ Recalibragem total concluída!');
  }

  /**
   * Helper interno para aplicar estatísticas de uma partida a dois times
   */
  private _applyStats(home: Team, away: Team, hGoals: number, aGoals: number): void {
    home.stats.matchesPlayed++;
    away.stats.matchesPlayed++;
    home.stats.goalsFor += hGoals;
    away.stats.goalsFor += aGoals;
    home.stats.goalsAgainst += aGoals;
    away.stats.goalsAgainst += hGoals;

    if (hGoals > aGoals) {
      home.stats.wins++;
      away.stats.losses++;
      home.stats.points += 3;
    } else if (aGoals > hGoals) {
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
}
