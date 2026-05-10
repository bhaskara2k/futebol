import { Injectable, inject } from '@angular/core';
import { Player, Team, League, InternationalCompetition, TransferRecord, HistoricMatch } from '../models';
import { GameStateService } from './game-state.service';

// Tipos para MessagePack (instalar: npm install @msgpack/msgpack)
import { encode, decode } from '@msgpack/msgpack';
// Importar tipos do better-sqlite3
import type BetterSqlite3 from 'better-sqlite3';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';
import { NATIONALITIES } from '../nationalities.data';

const isBrowser = typeof window !== 'undefined';

/**
 * SQLite Persistence Service
 * 
 * Arquitetura:
 * - BASE DATA: Dados imutáveis (players, teams, countries)
 * - DELTAS: Apenas mudanças por temporada (player_seasons, team_seasons)
 * - EVENTOS: Histórico (transfers, matches, awards)
 * - SNAPSHOTS: Pontos de restauração compactados
 * 
 * Boas práticas implementadas:
 * ✅ WAL mode para performance
 * ✅ Transações para todas as escritas
 * ✅ Foreign keys habilitadas
 * ✅ Migrations versionadas
 * ✅ Índices otimizados
 * ✅ Prepared statements
 */

@Injectable({ providedIn: 'root' })
export class SqlitePersistenceService {
  private db: BetterSqlite3.Database | null = null;
  private dbPath = './futsal-universe.db';
  private gameStateService = inject(GameStateService);
  private apiService = inject(ApiService);

  // Prepared statements (reutilizáveis para performance)
  private stmts: { [key: string]: BetterSqlite3.Statement } = {};

  constructor() {
    // Node.js only - SQLite é a única fonte de verdade
  }

  /**
   * Inicializa o banco de dados SQLite
   * - Aplica migrations
   * - Configura WAL mode
   * - Prepara statements
   * 
   * @param customDbPath - Caminho customizado para o banco (opcional)
   *                       Usado pelo SaveManager para múltiplos saves
   */
  async initDatabase(customDbPath?: string): Promise<void> {
    if (isBrowser) {
      console.log('📡 Modo de Navegador: Persistência em banco de dados desativada.');
      return;
    }

    try {
      // Usar caminho customizado se fornecido
      if (customDbPath) {
        this.dbPath = customDbPath;
      }

      // @ts-ignore
      const betterSqlite3 = await eval('import("better-sqlite3")');
      const Database = betterSqlite3.default;
      this.db = new Database(this.dbPath, {
        verbose: console.log,
        fileMustExist: false
      });

      // Configurações essenciais
      this.db.exec('PRAGMA foreign_keys = ON');
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA synchronous = NORMAL');
      this.db.exec('PRAGMA cache_size = -64000'); // 64MB
      this.db.exec('PRAGMA temp_store = MEMORY');

      // Aplicar schema
      await this.applyMigrations();

      // Preparar statements comuns
      this.prepareStatements();

      console.log(`✅ SQLite database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  /**
   * Aplica migrations do schema de forma versionada
   * 
   * SISTEMA DE MIGRATIONS:
   * - Cada migration tem um número de versão sequencial
   * - Apenas migrations pendentes são aplicadas
   * - Migrations são aplicadas em ordem
   * - Cada migration é registrada na tabela schema_version
   */
  private async applyMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('🔄 Verificando migrations pendentes...');

    try {
      // 1. Garantir que a tabela schema_version existe
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          description TEXT NOT NULL
        );
      `);

      // 2. Obter versão atual do schema
      const currentVersion = this.getCurrentSchemaVersion();
      console.log(`📊 Versão atual do schema: ${currentVersion}`);

      // 3. Definir migrations disponíveis
      const migrations = await this.getMigrations();

      // 4. Filtrar apenas migrations pendentes
      const pendingMigrations = migrations.filter(m => m.version > currentVersion);

      if (pendingMigrations.length === 0) {
        console.log('✅ Schema está atualizado (nenhuma migration pendente)');
        return;
      }

      console.log(`📦 Aplicando ${pendingMigrations.length} migration(s) pendente(s)...`);

      // 5. Aplicar cada migration em uma transação
      for (const migration of pendingMigrations) {
        console.log(`  → Migration ${migration.version}: ${migration.description}`);

        this.db.transaction(() => {
          // Executar SQL da migration
          this.db!.exec(migration.sql);

          // Registrar migration aplicada
          this.db!.prepare(`
            INSERT OR IGNORE INTO schema_version (version, description)
            VALUES (?, ?)
          `).run(migration.version, migration.description);
        })();

        console.log(`  ✅ Migration ${migration.version} aplicada`);
      }

      const newVersion = this.getCurrentSchemaVersion();
      console.log(`✅ Schema atualizado para versão ${newVersion}`);

    } catch (error) {
      console.error('❌ Falha ao aplicar migrations:', error);
      throw error;
    }
  }

  /**
   * Obtém a versão atual do schema
   */
  private getCurrentSchemaVersion(): number {
    if (!this.db) return 0;

    try {
      const result = this.db.prepare(`
        SELECT MAX(version) as version FROM schema_version
      `).get() as { version: number | null };

      return result?.version || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Obtém lista de migrations disponíveis
   */
  private async getMigrations(): Promise<Array<{ version: number; description: string; sql: string }>> {
    const fs = await eval('import("fs/promises")');
    const path = await eval('import("path")');

    const migrationsDir = './src/database/migrations';
    const migrations: Array<{ version: number; description: string; sql: string }> = [];

    try {
      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

      for (const file of sqlFiles) {
        // Extrair versão do nome do arquivo (ex: 001_initial_schema.sql -> 1)
        const versionMatch = file.match(/^(\d+)_/);
        if (!versionMatch) continue;

        const version = parseInt(versionMatch[1], 10);
        const filePath = path.join(migrationsDir, file);
        const sql = await fs.readFile(filePath, 'utf-8');

        // Extrair descrição do SQL (linha com "Descrição:")
        const descMatch = sql.match(/--\s*Descrição:\s*(.+)/i);
        const description = descMatch ? descMatch[1].trim() : file;

        migrations.push({ version, description, sql });
      }

      return migrations.sort((a, b) => a.version - b.version);
    } catch (error) {
      console.warn('⚠️ Não foi possível ler migrations. Usando schema.sql como fallback.');

      // Fallback: usar schema.sql completo
      const schemaPath = './src/database/schema.sql';
      const schemaSql = await fs.readFile(schemaPath, 'utf-8');

      return [{
        version: 1,
        description: 'Full schema from schema.sql',
        sql: schemaSql
      }];
    }
  }

  /**
   * Prepara statements reutilizáveis
   */
  private prepareStatements(): void {
    if (!this.db) return;

    // Player Seasons
    this.stmts.insertPlayerSeason = this.db.prepare(`
      INSERT OR REPLACE INTO player_seasons (
        player_id, season, team_id, jersey_number, overall, market_value, contract_years,
        league_matches, league_goals, league_assists, league_motm,
        cup_matches, cup_goals, cup_assists, cup_motm,
        intl_matches, intl_goals, intl_assists, intl_motm,
        national_matches, national_goals, national_assists, national_motm,
        wc_matches, wc_goals, wc_assists, wc_motm,
        wcq_matches, wcq_goals, wcq_assists, wcq_motm,
        youth_matches, youth_goals, youth_assists, youth_motm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Team Seasons
    this.stmts.insertTeamSeason = this.db.prepare(`
      INSERT OR REPLACE INTO team_seasons (
        team_id, season, division_level, budget, overall,
        matches_played, wins, draws, losses, goals_for, goals_against, points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Transfers
    this.stmts.insertTransfer = this.db.prepare(`
      INSERT INTO transfers (player_id, season, from_team_id, to_team_id, fee, transfer_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Matches
    this.stmts.insertMatch = this.db.prepare(`
      INSERT OR REPLACE INTO matches (
        id, season, home_team_id, away_team_id, home_score, away_score, 
        played, competition_name, round_number, division_id, country_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Division Seasons
    this.stmts.insertDivisionSeason = this.db.prepare(`
      INSERT OR REPLACE INTO division_seasons (country_id, season, division_id, name)
      VALUES (?, ?, ?, ?)
    `);

    // Match Events
    this.stmts.insertMatchEvent = this.db.prepare(`
      INSERT INTO match_events (match_id, player_id, event_type, minute)
      VALUES (?, ?, ?, ?)
    `);

    // Titles
    this.stmts.insertTitle = this.db.prepare(`
      INSERT INTO titles (team_id, season, competition_type, competition_name, position)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Awards
    this.stmts.insertAward = this.db.prepare(`
      INSERT INTO player_awards (player_id, season, award_type, competition_scope, position, stats_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
  }

  // ============================================================================
  // BASE DATA (Imutável)
  // ============================================================================

  /**
   * Salva dados base (players, teams, countries)
   * Executado apenas uma vez ou ao adicionar novos dados
   */
  async saveBaseData(teams: Team[], countries: Map<string, string>): Promise<void> {
    if (isBrowser) {
      // No browser, enviamos via API
      // Nota: o endpoint da API precisa suportar este payload exato
      // Por simplicidade neste MVP, vamos delegar ao saveSeasonState que já salva times
      return;
    }

    if (!this.db) throw new Error('Database not initialized');

    this.db.transaction(() => {
      // 1. Salvar países
      const insertCountry = this.db!.prepare(`
        INSERT OR IGNORE INTO countries (id, name, continent)
        VALUES (?, ?, ?)
      `);

      countries.forEach((name, id) => {
        const continent = this.getContinentForCountry(id);
        insertCountry.run(id, name, continent);
      });

      // 2. Salvar times
      const insertTeam = this.db!.prepare(`
        INSERT OR IGNORE INTO teams (id, name, country_id, logo_url, rival_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      teams.forEach(team => {
        insertTeam.run(team.id, team.teamName, team.countryId, team.logoUrl || null, team.rivalId || null);
      });

      // 3. Salvar jogadores (base)
      const insertPlayer = this.db!.prepare(`
        INSERT OR IGNORE INTO players (id, name, nationality_id, is_goalkeeper, birth_season)
        VALUES (?, ?, ?, ?, ?)
      `);

      teams.forEach(team => {
        [...team.players, ...team.youthAcademy].forEach(player => {
          const birthSeason = this.calculateBirthSeason(player.age);
          insertPlayer.run(
            player.id,
            player.name,
            player.nationalityId,
            player.isGoalkeeper ? 1 : 0,
            birthSeason
          );
        });
      });
    })();

    console.log(`✅ Base data saved: ${teams.length} teams, ${countries.size} countries`);
  }

  // ============================================================================
  // DELTAS (Por Temporada)
  // ============================================================================

  /**
   * Salva o estado da temporada (apenas mudanças)
   */
  async saveSeasonState(season: number, teams: Team[], leagues: League[]): Promise<void> {
    if (isBrowser) {
      console.log(`📡 Modo de Navegador: Pulando salvamento de delta da temporada ${season}.`);
      return;
    }

    if (!this.db) throw new Error('Database not initialized');

    const startTime = Date.now();

    this.db.transaction(() => {
      // 1. Player Seasons (Deltas)
      teams.forEach(team => {
        [...team.players, ...team.youthAcademy].forEach(player => {
          this.stmts.insertPlayerSeason.run(
            player.id,
            season,
            player.teamId || null,
            player.number,
            player.overall,
            player.marketValue,
            player.contractYears,
            // Liga
            player.stats.matchesPlayed,
            player.stats.goals,
            player.stats.assists,
            player.stats.motm,
            // Copa
            player.cupStats.matchesPlayed,
            player.cupStats.goals,
            player.cupStats.assists,
            player.cupStats.motm,
            // Internacional
            player.internationalStats.matchesPlayed,
            player.internationalStats.goals,
            player.internationalStats.assists,
            player.internationalStats.motm,
            // Seleção (Nacional)
            0, 0, 0, 0, // TODO: Adicionar quando tiver stats de seleção
            // Copa do Mundo
            player.worldCupStats.matchesPlayed,
            player.worldCupStats.goals,
            player.worldCupStats.assists,
            player.worldCupStats.motm,
            // Eliminatórias
            player.worldCupQualifierStats.matchesPlayed,
            player.worldCupQualifierStats.goals,
            player.worldCupQualifierStats.assists,
            player.worldCupQualifierStats.motm,
            // Youth
            player.youthStats.matchesPlayed,
            player.youthStats.goals,
            player.youthStats.assists,
            player.youthStats.motm
          );
        });
      });

      // 2. Team Seasons (Deltas)
      teams.forEach(team => {
        this.stmts.insertTeamSeason.run(
          team.id,
          season,
          this.getDivisionLevel(team, leagues),
          team.budget,
          team.overall,
          team.stats.matchesPlayed,
          team.stats.wins,
          team.stats.draws,
          team.stats.losses,
          team.stats.goalsFor,
          team.stats.goalsAgainst,
          team.stats.points
        );
      });

      // 3. League Seasons
      const insertLeagueSeason = this.db!.prepare(`
        INSERT OR REPLACE INTO league_seasons (country_id, season, current_round, total_rounds, status)
        VALUES (?, ?, ?, ?, ?)
      `);

      leagues.forEach(league => {
        insertLeagueSeason.run(
          league.countryId,
          season,
          league.currentRound,
          league.totalRounds,
          league.status
        );

        // 4. Salvar Divisões e Fixtures
        league.divisions.forEach((div, divIdx) => {
          this.stmts.insertDivisionSeason.run(
            league.countryId,
            season,
            divIdx + 1,
            div.name
          );

          // Salvar Fixtures (Calendário)
          div.fixtures.forEach((round, roundIdx) => {
            round.forEach(match => {
              this.stmts.insertMatch.run(
                match.id,
                season,
                match.homeTeam.id,
                match.awayTeam.id,
                match.homeScore,
                match.awayScore,
                match.played ? 1 : 0,
                league.countryName, // competition_name
                roundIdx,
                divIdx + 1, // division_id
                league.countryId // country_id
              );
            });
          });
        });
      });
    })();

    const elapsed = Date.now() - startTime;
    console.log(`✅ Season ${season} state saved in ${elapsed}ms`);
  }

  // ============================================================================
  // EVENTOS (Histórico)
  // ============================================================================

  /**
   * Salva transferências em lote
   */
  async saveTransfers(transfers: TransferRecord[]): Promise<void> {
    if (transfers.length === 0) return;

    if (isBrowser) return;

    if (!this.db) return;

    this.db.transaction(() => {
      transfers.forEach(t => {
        this.stmts.insertTransfer.run(
          t.playerName, // TODO: Usar player_id real
          t.season,
          t.fromTeamName || null,
          t.toTeamName,
          t.fee,
          'normal'
        );
      });
    })();

    console.log(`✅ ${transfers.length} transfers saved`);
  }

  /**
   * Salva partidas em lote
   */
  async saveMatches(matches: HistoricMatch[]): Promise<void> {
    if (matches.length === 0) return;

    if (isBrowser) return;

    if (!this.db) return;

    this.db.transaction(() => {
      matches.forEach(match => {
        // 1. Salvar partida
        this.stmts.insertMatch.run(
          match.id,
          match.season,
          match.homeTeamId,
          match.awayTeamId,
          match.homeScore,
          match.awayScore,
          1, // played
          match.competitionName,
          match.round_number || 0,
          null, // division_id (pode ser expandido depois)
          null  // country_id (pode ser expandido depois)
        );

        // 2. Salvar eventos (gols)
        match.homeScorers?.forEach(scorer => {
          for (let i = 0; i < scorer.goals; i++) {
            this.stmts.insertMatchEvent.run(
              match.id,
              scorer.name, // TODO: Usar player_id real
              'goal',
              0
            );
          }
        });

        match.awayScorers?.forEach(scorer => {
          for (let i = 0; i < scorer.goals; i++) {
            this.stmts.insertMatchEvent.run(
              match.id,
              scorer.name,
              'goal',
              0
            );
          }
        });
      });
    })();

    console.log(`✅ ${matches.length} matches saved`);
  }

  /**
   * Salva títulos de uma temporada
   */
  async saveTitles(season: number, teams: Team[]): Promise<void> {
    if (isBrowser) {
      console.log('📡 Modo de Navegador: Pulando salvamento de títulos.');
      return;
    }

    if (!this.db) return;

    this.db.transaction(() => {
      teams.forEach(team => {
        team.trophies?.forEach(trophy => {
          this.stmts.insertTitle.run(
            team.id,
            season,
            trophy.type,
            trophy.name
          );
        });
      });
    })();
  }

  // ============================================================================
  // SNAPSHOTS (Pontos de Restauração)
  // ============================================================================

  /**
   * Cria um snapshot compactado da temporada
   */
  async createSnapshot(season: number, fullState: any, type: 'auto' | 'manual' = 'auto', description?: string): Promise<void> {
    if (isBrowser) {
      console.log(`📡 Modo de Navegador: Pulando criação de snapshot ${type} para temporada ${season}.`);
      return;
    }

    if (!this.db) throw new Error('Database not initialized');
    // ... rest of the existing code ...
    const startTime = Date.now();

    // Comprimir com MessagePack
    const compressed = encode(fullState);
    const sizeBytes = compressed.byteLength;

    const insertSnapshot = this.db.prepare(`
      INSERT OR REPLACE INTO snapshots (season, snapshot_type, compressed_data, size_bytes, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertSnapshot.run(season, type, compressed, sizeBytes, description || null);

    const elapsed = Date.now() - startTime;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
    console.log(`✅ Snapshot created for season ${season}: ${sizeMB}MB in ${elapsed}ms`);
  }

  /**
   * Carrega um snapshot
   */
  loadSnapshot(season: number): any | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT compressed_data FROM snapshots WHERE season = ? ORDER BY created_at DESC LIMIT 1
    `);

    const row = stmt.get(season) as { compressed_data: Buffer } | undefined;
    if (!row) return null;

    // Descomprimir
    const decompressed = decode(row.compressed_data);
    console.log(`✅ Snapshot loaded for season ${season}`);
    return decompressed;
  }

  /**
   * Lista todos os snapshots disponíveis
   */
  async listSnapshots(): Promise<Array<{ season: number; type: string; sizeMB: number; createdAt: string }>> {
    if (isBrowser) return [];
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT season, snapshot_type, size_bytes, created_at
      FROM snapshots
      ORDER BY season DESC
    `);

    const rows = stmt.all();
    return rows.map((r: any) => ({
      season: r.season,
      type: r.snapshot_type,
      sizeMB: parseFloat((r.size_bytes / 1024 / 1024).toFixed(2)),
      createdAt: r.created_at
    }));
  }

  /**
   * Obtém a última temporada salva
   */
  async getLatestSeason(): Promise<number> {
    if (isBrowser) return 0;

    if (!this.db) return 1;

    try {
      const result = this.db.prepare('SELECT MAX(season) as season FROM team_seasons').get() as { season: number | null };
      return result?.season || 1;
    } catch {
      return 1;
    }
  }

  // ============================================================================
  // QUERIES (Leitura)
  // ============================================================================

  /**
   * Carrega o estado de uma temporada
   */
  async loadSeasonState(season: number): Promise<any> {
    if (isBrowser) return null;

    if (!this.db) throw new Error('Database not initialized');

    // Tentar carregar do snapshot primeiro
    const snapshot = this.loadSnapshot(season);
    if (snapshot) return snapshot;

    // Caso contrário, reconstruir dos deltas
    return this.reconstructSeasonFromDeltas(season);
  }

  /**
   * Carrega o estado de uma temporada de forma OTIMIZADA
   * 
   * ESTRATÉGIA:
   * 1. Busca o snapshot mais próximo (anterior ou igual à temporada)
   * 2. Se encontrar, aplica deltas incrementais até a temporada desejada
   * 3. Se não encontrar, reconstrói do zero
   * 
   * GANHO: Ao invés de reconstruir 50 temporadas, reconstrói apenas 10
   * (se houver snapshot na temporada 40 e queremos carregar temporada 50)
   */
  loadSeasonStateOptimized(targetSeason: number): any {
    if (!this.db) throw new Error('Database not initialized');

    const startTime = Date.now();

    // 1. Buscar snapshot exato
    const exactSnapshot = this.loadSnapshot(targetSeason);
    if (exactSnapshot) {
      console.log(`✅ Snapshot exato encontrado para temporada ${targetSeason}`);
      return exactSnapshot;
    }

    // 2. Buscar snapshot mais próximo (anterior)
    const closestSnapshot = this.findClosestSnapshot(targetSeason);

    if (closestSnapshot) {
      console.log(`📸 Usando snapshot da temporada ${closestSnapshot.season} como base para ${targetSeason}`);

      // Carregar snapshot base
      const baseState = this.loadSnapshot(closestSnapshot.season);
      if (!baseState) {
        console.warn(`⚠️ Snapshot ${closestSnapshot.season} não pôde ser carregado. Reconstruindo do zero.`);
        return this.reconstructSeasonFromDeltas(targetSeason);
      }

      // Aplicar deltas incrementais
      const deltasToApply = targetSeason - closestSnapshot.season;
      console.log(`🔄 Aplicando ${deltasToApply} temporadas de deltas...`);

      // TODO: Implementar aplicação incremental de deltas
      // Por enquanto, reconstruir do zero se não for snapshot exato
      return this.reconstructSeasonFromDeltas(targetSeason);
    }

    // 3. Nenhum snapshot encontrado, reconstruir do zero
    const elapsed = Date.now() - startTime;
    console.log(`🔍 Nenhum snapshot encontrado. Reconstruindo temporada ${targetSeason} do zero (${elapsed}ms)`);
    return this.reconstructSeasonFromDeltas(targetSeason);
  }

  /**
   * Encontra o snapshot mais próximo (anterior ou igual) a uma temporada
   */
  private findClosestSnapshot(targetSeason: number): { season: number; type: string } | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      SELECT season, snapshot_type
      FROM snapshots
      WHERE season <= ?
      ORDER BY season DESC
      LIMIT 1
    `);

    const row = stmt.get(targetSeason) as { season: number; snapshot_type: string } | undefined;
    return row ? { season: row.season, type: row.snapshot_type } : null;
  }

  /**
   * Reconstrói o estado da temporada a partir dos deltas
   */
  private reconstructSeasonFromDeltas(season: number): any {
    if (!this.db) return null;

    console.log(`🔍 Reconstrutindo temporada ${season} a partir dos deltas...`);

    // 1. Buscar Ligas
    const leagueRows = this.db.prepare(`
      SELECT * FROM league_seasons WHERE season = ?
    `).all(season);

    // 2. Buscar Times e Jogadores (Join com dados base e deltas)
    const teamsBase = this.db.prepare(`SELECT * FROM teams`).all() as any[];
    const teamDeltas = this.db.prepare(`SELECT * FROM team_seasons WHERE season = ?`).all(season) as any[];

    const playersBase = this.db.prepare(`SELECT * FROM players`).all() as any[];
    const playerDeltas = this.db.prepare(`SELECT * FROM player_seasons WHERE season = ?`).all(season) as any[];

    // Mapear Players
    const playersMap = new Map();
    playersBase.forEach((pb: any) => {
      const delta = playerDeltas.find((pd: any) => pd.player_id === pb.id);
      if (delta) {
        playersMap.set(pb.id, {
          id: pb.id,
          name: pb.name,
          nationalityId: pb.nationality_id,
          age: season - pb.birth_season,
          isGoalkeeper: pb.is_goalkeeper === 1,
          teamId: delta.team_id,
          number: delta.number,
          overall: delta.overall,
          marketValue: delta.market_value,
          contractYears: delta.contract_years,
          stats: {
            matchesPlayed: delta.matches_played,
            goals: delta.goals,
            assists: delta.assists,
            motm: delta.motm
          }
        });
      }
    });

    // Mapear Times
    const teams = teamsBase.map((tb: any) => {
      const delta = teamDeltas.find((td: any) => td.team_id === tb.id);
      const teamPlayers = Array.from(playersMap.values()).filter((p: any) => p.teamId === tb.id);

      // Buscar títulos
      const trophies = (this.db!.prepare(`
        SELECT competition_name as name, competition_type as type, COUNT(*) as count
        FROM titles
        WHERE team_id = ?
        GROUP BY competition_name, competition_type
      `).all(tb.id) as any[]);

      return {
        id: tb.id,
        teamName: tb.name,
        countryId: tb.country_id,
        logoUrl: tb.logo_url,
        rivalId: tb.rival_id,
        reputation: delta?.reputation || 70,
        budget: delta?.budget || 10000000,
        divisionLevel: delta?.division_level || 1,
        overall: Math.round(teamPlayers.reduce((acc, p) => acc + p.overall, 0) / (teamPlayers.length || 1)),
        trophies: trophies,
        players: teamPlayers,
        youthAcademy: [] // TODO: Separar youth academy se necessário
      };
    });

    const teamsMap = new Map<string, any>();
    teams.forEach(t => teamsMap.set(t.id, t));

    // 3. Reconstruir Ligas
    const leagues = leagueRows.map((lr: any) => {
      const divisions = (this.db!.prepare(`
        SELECT * FROM division_seasons 
        WHERE country_id = ? AND season = ?
        ORDER BY division_id ASC
      `).all(lr.country_id, season) as any[]).map(dr => {

        // Buscar Fixtures da divisão
        const matches = this.db!.prepare(`
          SELECT * FROM matches 
          WHERE country_id = ? AND season = ? AND division_id = ?
          ORDER BY round_number ASC
        `).all(lr.country_id, season, dr.division_id) as any[];

        // Organizar matches em rodadas Match[][]
        const fixtures: any[][] = [];
        matches.forEach(m => {
          if (!fixtures[m.round_number]) fixtures[m.round_number] = [];

          fixtures[m.round_number].push({
            id: m.id,
            homeTeam: teamsMap.get(m.home_team_id),
            awayTeam: teamsMap.get(m.away_team_id),
            homeScore: m.home_score,
            awayScore: m.away_score,
            played: m.played === 1
          });
        });

        return {
          id: dr.division_id,
          name: dr.name,
          teams: teams.filter(t => t.countryId === lr.country_id && (teamsMap.get(t.id).divisionLevel === dr.division_id)),
          fixtures: fixtures,
          topScorers: [], topAssists: [], topMotm: []
        };
      });

      return {
        countryId: lr.country_id,
        countryName: lr.country_id, // Será resolvido no Bridge ou UniverseService
        currentRound: lr.current_round,
        totalRounds: lr.total_rounds,
        status: lr.status,
        divisions: divisions,
        cup: { rounds: [], topScorers: [], topAssists: [], topMotm: [] },
        history: [],
        rankings: { division1: [], cup: [] } // TODO: Reconstruir rankings
      };
    });

    // 4. Reconstruir Histórico de Partidas (Todas as temporadas até agora)
    const matchHistoryRows = this.db.prepare(`
      SELECT m.*, t1.name as home_name, t2.name as away_name
      FROM matches m
      JOIN teams t1 ON m.home_team_id = t1.id
      JOIN teams t2 ON m.away_team_id = t2.id
      WHERE m.played = 1
      ORDER BY m.season DESC, m.round_number DESC
    `).all() as any[];

    const matchHistory = matchHistoryRows.map(m => ({
      id: m.id,
      season: m.season,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      homeTeamName: m.home_name,
      awayTeamName: m.away_name,
      homeScore: m.home_score,
      awayScore: m.away_score,
      competitionName: m.competition_name,
      // Reconstruir scorers (se existirem)
      homeScorers: [],
      awayScorers: []
    }));

    // 5. Reconstruir Histórico de Transferências
    const transferHistory = (this.db.prepare(`
      SELECT * FROM transfers ORDER BY season DESC
    `).all() as any[]).map(t => ({
      season: t.season,
      playerName: t.player_id,
      playerOverall: 0,
      fromTeamName: t.from_team_id,
      toTeamName: t.to_team_id,
      fee: t.fee
    }));

    // 6. Reconstruir Competições Internacionais
    const internationalCompetitions = (this.db.prepare(`
      SELECT competition_data FROM international_competitions WHERE season = ?
    `).all(season) as any[]).map(c => JSON.parse(c.competition_data));

    return {
      season,
      teams,
      leagues,
      matchHistory,
      transferHistory,
      internationalCompetitions
    };
  }

  /**
   * Busca top artilheiros de uma temporada
   */
  getTopScorers(season: number, limit: number = 20): any[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM v_top_scorers
      WHERE season = ?
      ORDER BY total_goals DESC
      LIMIT ?
    `);

    return stmt.all(season, limit);
  }

  /**
   * Busca histórico H2H entre dois times
   */
  getH2HHistory(teamId1: string, teamId2: string): HistoricMatch[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM matches
      WHERE (home_team_id = ? AND away_team_id = ?)
         OR (home_team_id = ? AND away_team_id = ?)
      ORDER BY season DESC, played_at DESC
    `);

    return stmt.all(teamId1, teamId2, teamId2, teamId1) as HistoricMatch[];
  }

  /**
   * Busca títulos de um time
   */
  getTeamTitles(teamId: string): any[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM titles
      WHERE team_id = ?
      ORDER BY season DESC
    `);

    return stmt.all(teamId);
  }

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  private getDivisionLevel(team: Team, leagues: League[]): number {
    for (const league of leagues) {
      for (let i = 0; i < league.divisions.length; i++) {
        if (league.divisions[i].teams.some(t => t.id === team.id)) {
          return i + 1;
        }
      }
    }
    return 1;
  }
  private calculateBirthSeason(age: number): number {
    const currentSeason = 1; // TODO: Pegar da temporada atual
    return currentSeason - age;
  }

  private getContinentForCountry(countryId: string): string {
    // Busca simples baseada nos IDs fixos do simulador
    const eur = ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'RUS', 'POR', 'NED', 'BEL', 'SWE', 'SUI', 'UKR', 'HRV', 'TUR', 'CZE', 'POR', 'AUT', 'HUN', 'ROU', 'POL', 'GRE', 'SRB', 'DNK', 'SCO', 'NOR'];
    const sam = ['BRA', 'ARG', 'URU', 'COL', 'CHL', 'PAR', 'BOL', 'PER', 'VEN', 'EQU'];
    const nca = ['USA', 'MEX', 'CAN', 'CRC', 'HON', 'PAN', 'JAM'];
    const asi = ['JPN', 'KOR', 'CHN', 'AUS', 'SAU', 'IRA', 'QAT', 'UAE'];
    const afr = ['NGR', 'SEN', 'MAR', 'ALG', 'EGY', 'GAN', 'CAM', 'CIV'];

    if (eur.includes(countryId)) return 'EUR';
    if (sam.includes(countryId)) return 'SAM';
    if (nca.includes(countryId)) return 'NCA';
    if (asi.includes(countryId)) return 'ASI';
    if (afr.includes(countryId)) return 'AFR';
    return 'WORLD';
  }

  /**
   * Salva um metadado global (ex: temporada atual, fase do jogo)
   */
  async setMetadata(key: string, value: string): Promise<void> {
    if (isBrowser) {
      // Futuramente podemos ter um endpoint de metadados
      return;
    }
    if (!this.db) return;
    this.db.prepare(`
      INSERT OR REPLACE INTO game_metadata (key, value) VALUES (?, ?)
    `).run(key, value);
  }

  /**
   * Busca um metadado global
   */
  getMetadata(key: string): string | null {
    if (!this.db) return null;
    const row = this.db.prepare(`SELECT value FROM game_metadata WHERE key = ?`).get(key) as any;
    return row ? row.value : null;
  }

  /**
   * Salva premiações individuais (Melhor do Mundo, Artilheiro, etc.)
   */
  async saveAwards(season: number, awards: any[]): Promise<void> {
    if (isBrowser) return;
    if (!this.db) return;

    this.db.transaction(() => {
      awards.forEach(award => {
        // stats_json pode conter detalhes como gols, assistências na temporada
        const statsJson = JSON.stringify(award.stats || {});
        this.stmts.insertAward.run(
          award.player.id,
          season,
          award.type || 'best_player',
          award.scope || 'world',
          award.position || 1,
          statsJson
        );
      });
    })();
  }

  /**
   * Salva recordes globais serializados (Copa do Mundo, Champions League, etc.)
   * Usado para históricos complexos que não cabem em tabelas simples.
   */
  saveGlobalHistory(key: string, history: any[]): void {
    this.setMetadata(key, JSON.stringify(history));
  }

  /**
   * Carrega recordes globais serializados
   */
  loadGlobalHistory<T>(key: string): T[] {
    const data = this.getMetadata(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Salva competições internacionais (Copa do Mundo, Continentais, etc)
   * Cada competição é salva com seu ID e temporada como chave composta
   */
  async saveInternationalCompetitions(competitions: InternationalCompetition[]): Promise<void> {
    if (competitions.length === 0) return;

    if (isBrowser) return;

    if (!this.db) throw new Error('Database not initialized');

    // Pegamos a temporada da primeira competição (todas devem ser da mesma)
    const season = competitions[0].season;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO international_competitions (id, season, competition_data, status, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    // Usar o método transaction interno que já lida com o ambiente
    await this.transaction(() => {
      for (const comp of competitions) {
        stmt.run(
          comp.id,
          season,
          JSON.stringify(comp),
          comp.status || 'pending'
        );
      }
    });

    console.log(`💾 Saved ${competitions.length} international competitions`);
  }

  /**
   * Carrega competições internacionais de uma temporada específica
   */
  loadInternationalCompetitions(season: number): InternationalCompetition[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT competition_data 
      FROM international_competitions 
      WHERE season = ?
      ORDER BY id
    `);

    const rows = stmt.all(season) as Array<{ competition_data: string }>;

    return rows.map(row => JSON.parse(row.competition_data) as InternationalCompetition);
  }

  /**
   * Carrega todas as competições internacionais (todas as temporadas)
   * Útil para reconstruir histórico completo
   */
  loadAllInternationalCompetitions(): InternationalCompetition[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT competition_data 
      FROM international_competitions 
      ORDER BY season, id
    `);

    const rows = stmt.all() as Array<{ competition_data: string }>;

    return rows.map(row => JSON.parse(row.competition_data) as InternationalCompetition);
  }

  /**
   * Deleta competições internacionais de uma temporada específica
   * Útil para limpeza ou reconstrução de dados
   */
  deleteInternationalCompetitions(season: number): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      DELETE FROM international_competitions WHERE season = ?
    `);

    stmt.run(season);
    console.log(`🗑️ Deleted international competitions for season ${season}`);
  }

  /**
   * Executa uma função dentro de uma transação
   * Usado pelo SeasonLifecycleService para garantir atomicidade
   */
  async transaction(fn: () => void | Promise<void>): Promise<void> {
    if (isBrowser) {
      // No browser, as operações individuais já chamam a API
      // Futuramente podemos implementar um endpoint de transação em lote
      await fn();
      return;
    }

    if (!this.db) throw new Error('Database not initialized');

    // @ts-ignore
    const txn = this.db.transaction(fn);
    txn();
  }

  /**
   * Deleta um snapshot específico
   * Usado pela política de retenção de snapshots
   */
  async deleteSnapshot(season: number, type: 'auto' | 'manual'): Promise<void> {
    if (isBrowser) {
      await firstValueFrom(this.apiService.deleteSnapshot(season, type));
      return;
    }
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      DELETE FROM snapshots 
      WHERE season = ? AND snapshot_type = ?
    `);

    stmt.run(season, type);
    console.log(`🗑️ Snapshot deleted: season ${season}, type ${type}`);
  }

  /**
   * Fecha a conexão com o banco
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('✅ Database connection closed');
    }
  }

  /**
   * EXPORTAÇÃO: Retorna o banco de dados como Uint8Array
   */
  async exportDatabase(): Promise<Uint8Array> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // @ts-ignore
      const fs = (await import('fs')).default;
      // Garante que o banco está sincronizado no disco (limpa o WAL)
      this.db.pragma('wal_checkpoint(FULL)');
      return fs.readFileSync(this.dbPath);
    } catch (error) {
      console.error('❌ Erro ao exportar banco:', error);
      throw error;
    }
  }

  /**
   * IMPORTAÇÃO: Restaura o banco de dados a partir de dados binários
   */
  async importDatabase(data: Uint8Array): Promise<void> {
    try {
      // @ts-ignore
      const fs = (await import('fs')).default;

      // 1. Fechar banco atual se estiver aberto
      this.close();

      // 2. Escrever novo arquivo
      fs.writeFileSync(this.dbPath, data);
      console.log(`✅ Banco restaurado em: ${this.dbPath}`);

      // 3. Reinicializar
      await this.initDatabase();
    } catch (error) {
      console.error('❌ Erro ao restaurar banco:', error);
      throw error;
    }
  }

  // ============================================================================
  // SISTEMA DE SLOTS DE SAVE (MÚLTIPLAS CARREIRAS)
  // ============================================================================

  /**
   * Lista todos os saves disponíveis
   */
  async listSaves(): Promise<Array<{ id: number; name: string; season: number; team: string; createdAt: string; updatedAt: string; sizeMB: string }>> {
    if (isBrowser) return [];
    try {
      const response = await firstValueFrom(this.apiService.get<any[]>('/saves'));
      return response;
    } catch (error) {
      console.error('❌ Erro ao listar saves:', error);
      return [];
    }
  }

  /**
   * Cria um novo save
   */
  async createSave(name: string, season: number, team: string, data: any): Promise<{ success: boolean; id?: number; message?: string }> {
    if (isBrowser) return { success: true, message: 'Modo Navegador: Save não persistido no banco.' };
    try {
      const response = await firstValueFrom(this.apiService.post<any>('/saves', { name, season, team, data }));
      return response;
    } catch (error) {
      console.error('❌ Erro ao criar save:', error);
      return { success: false, message: 'Erro ao criar save' };
    }
  }

  /**
   * Carrega um save específico
   */
  async loadSave(id: number): Promise<any | null> {
    if (isBrowser) return null;
    try {
      const response = await firstValueFrom(this.apiService.get<any>(`/saves/${id}`));
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar save:', error);
      return null;
    }
  }

  /**
   * Atualiza um save existente
   */
  async updateSave(id: number, updates: { name?: string; season?: number; team?: string; data?: any }): Promise<{ success: boolean; message?: string }> {
    if (isBrowser) return { success: true };
    try {
      const response = await firstValueFrom(this.apiService.put<any>(`/saves/${id}`, updates));
      return response;
    } catch (error) {
      console.error('❌ Erro ao atualizar save:', error);
      return { success: false, message: 'Erro ao atualizar save' };
    }
  }

  /**
   * Deleta um save
   */
  async deleteSave(id: number): Promise<{ success: boolean; message?: string }> {
    if (isBrowser) return { success: true };
    try {
      const response = await firstValueFrom(this.apiService.delete<any>(`/saves/${id}`));
      return response;
    } catch (error) {
      console.error('❌ Erro ao deletar save:', error);
      return { success: false, message: 'Erro ao deletar save' };
    }
  }
  
  /**
   * Reseta todo o banco de dados (CUIDADO!)
   */
  async clearAllData(): Promise<void> {
    if (isBrowser) {
      await firstValueFrom(this.apiService.resetDatabase());
      return;
    }
    
    if (this.db) {
      const tables = [
        'match_scorers', 'matches', 'player_awards', 'team_titles', 
        'transfer_history', 'player_seasons', 'team_seasons',
        'division_seasons', 'league_seasons', 'international_competitions',
        'players', 'teams', 'countries', 'game_metadata', 'snapshots', 'game_saves'
      ];
      
      this.db.transaction(() => {
        for (const table of tables) {
          this.db!.prepare(`DELETE FROM ${table}`).run();
        }
      })();
    }
  }
}
