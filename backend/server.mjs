#!/usr/bin/env node

/**
 * 🚀 FUTSAL UNIVERSE - BACKEND API REST
 * 
 * Servidor Node.js com Express + SQLite
 * Fornece API REST para o frontend Angular
 */

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3008;
const DB_PATH = join(__dirname, 'futsal.db');

// Armazenar logs em memória para debug remoto
const logs = [];
const maxLogs = 100;
const addLog = (msg) => {
    const logEntry = `[${new Date().toISOString()}] ${msg}`;
    console.log(msg);
    logs.push(logEntry);
    if (logs.length > maxLogs) logs.shift();
};

// Endpoint de Debug
app.get('/api/debug-logs', (req, res) => {
    res.json({ logs });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));

// Logging de requisições
app.use((req, res, next) => {
    if (req.method === 'POST') {
        console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url} - Payload: ~${Math.round(JSON.stringify(req.body).length / 1024)}KB`);
    } else {
        console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Inicializar banco de dados
let db;

function initDatabase() {
    console.log('🔄 Inicializando banco de dados...');

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF');
    db.pragma('temp_store = MEMORY');
    db.pragma('cache_size = -128000'); // 128MB

    // Aplicar migrations
    applyMigrations();

    console.log('✅ Banco de dados inicializado!');
    
    // Listar tabelas para debug
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📊 Tabelas encontradas:', tables.map(t => t.name).join(', '));
}

function applyMigrations() {
    // Criar tabela de versão
    db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT NOT NULL
    );
  `);

    const currentVersion = getCurrentVersion();
    console.log(`📊 Versão atual do schema: ${currentVersion}`);

    // Aplicar migrations
    const migrationsDir = join(__dirname, '..', 'src', 'database', 'migrations');

    if (existsSync(migrationsDir)) {
        // Aplicar migration 001 se necessário
        if (currentVersion < 1) {
            console.log('  → Aplicando Migration 001...');
            const migration001 = readFileSync(join(migrationsDir, '001_initial_schema.sql'), 'utf-8');
            db.exec(migration001);
            console.log('  ✅ Migration 001 aplicada');
        }

        // Aplicar migration 002 se necessário
        if (currentVersion < 2) {
            console.log('  → Aplicando Migration 002...');
            const migration002 = readFileSync(join(migrationsDir, '002_international_competitions.sql'), 'utf-8');
            db.exec(migration002);
            console.log('  ✅ Migration 002 aplicada');
        }

        // Aplicar migration 003 se necessário
        if (currentVersion < 3) {
            console.log('  → Aplicando Migration 003...');
            const migration003 = readFileSync(join(migrationsDir, '003_game_saves.sql'), 'utf-8');
            db.exec(migration003);
            console.log('  ✅ Migration 003 aplicada');
        }
    }

    const newVersion = getCurrentVersion();
    console.log(`✅ Schema atualizado para versão ${newVersion}`);
}

function getCurrentVersion() {
    try {
        const result = db.prepare('SELECT MAX(version) as version FROM schema_version').get();
        return result?.version || 0;
    } catch {
        return 0;
    }
}

// ============================================================================
// ROTAS DA API
// ============================================================================

// Health check
// Resetar todo o banco de dados (CUIDADO!)
app.post('/api/reset-database', (req, res) => {
    try {
        console.log('🗑️ Resetando todo o banco de dados...');
        
        // Deletar tabelas na ordem correta devido a chaves estrangeiras
        const tables = [
            'match_events', 'matches', 'player_awards', 'titles', 
            'transfers', 'player_seasons', 'team_seasons',
            'division_seasons', 'league_seasons', 'international_competitions',
            'global_history', 'players', 'teams', 'countries', 
            'game_metadata', 'snapshots', 'game_saves'
        ];

        console.log('🗑️ Resetando todo o banco de dados (FK=OFF)...');
        db.prepare('PRAGMA foreign_keys = OFF').run();

        db.transaction(() => {
            for (const table of tables) {
                try {
                    db.prepare(`DELETE FROM ${table}`).run();
                } catch (e) {
                    console.warn(`    ⚠️ Tabela ${table} não pôde ser limpa ou não existe:`, e.message);
                }
            }
        })();

        db.prepare('PRAGMA foreign_keys = ON').run();

        // Otimizar e verificar integridade
        console.log('🧹 Otimizando banco de dados (VACUUM)...');
        db.prepare('VACUUM').run();
        
        const integrity = db.prepare('PRAGMA integrity_check').get();
        console.log('🛡️ Verificação de integridade:', integrity.integrity_check);

        console.log('✅ Banco de dados limpo e otimizado com sucesso!');
        res.json({ success: true, message: 'Banco de dados resetado e otimizado' });
    } catch (error) {
        console.error('❌ Erro ao resetar banco de dados:');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: error.message, detail: 'Falha ao limpar tabelas do banco' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: db ? 'connected' : 'disconnected',
        version: getCurrentVersion(),
        timestamp: new Date().toISOString()
    });
});

// Obter versão do schema
app.get('/api/schema/version', (req, res) => {
    try {
        const version = getCurrentVersion();
        const migrations = db.prepare('SELECT * FROM schema_version ORDER BY version').all();

        res.json({
            currentVersion: version,
            migrations
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Salvar estado da temporada
app.post('/api/season/save', (req, res) => {
    try {
        const { season, teams, countries } = req.body;

        if (season === undefined || !teams) {
            console.error('❌ Falha na validação: season ou teams ausentes');
            return res.status(400).json({ error: 'Missing required fields (season, teams)' });
        }

        addLog(`💾 Salvando temporada ${season}: ${teams.length} times`);

        const saveTransaction = db.transaction(() => {
            addLog('  - Gravando metadados...');
            db.prepare('INSERT OR REPLACE INTO game_metadata (key, value) VALUES (?, ?)').run('current_season', season.toString());

            addLog('  - Gravando países...');
            if (countries && Array.isArray(countries)) {
                const stmtCountry = db.prepare('INSERT OR REPLACE INTO countries (id, name, continent) VALUES (?, ?, ?)');
                for (const c of countries) stmtCountry.run(c.id, c.name, c.continent || 'WORLD');
                addLog(`    - ${countries.length} países processados`);
            }

            // 3. Times e Jogadores
            const stmtTeam = db.prepare('INSERT OR IGNORE INTO teams (id, name, country_id) VALUES (?, ?, ?)');
            const stmtPlayer = db.prepare('INSERT OR IGNORE INTO players (id, name, nationality_id, is_goalkeeper, birth_season) VALUES (?, ?, ?, ?, ?)');
            const stmtTeamSeason = db.prepare(`
                INSERT OR REPLACE INTO team_seasons 
                (team_id, season, division_level, budget, overall, matches_played, wins, draws, losses, goals_for, goals_against, points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const stmtPlayerSeason = db.prepare(`
                INSERT OR REPLACE INTO player_seasons 
                (player_id, season, team_id, jersey_number, overall, market_value, contract_years, league_matches, league_goals, league_assists)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            let teamsCount = 0;
            let playersCount = 0;

            const stmtCountryIgnore = db.prepare('INSERT OR IGNORE INTO countries (id, name, continent) VALUES (?, ?, ?)');

            for (const team of teams) {
                try {
                    if (!team.id || !team.countryId) {
                        console.warn(`    ⚠️ Time ignorado por falta de dados básicos: ${team.teamName}`);
                        continue;
                    }

                    // Garantir que o país do time existe
                    stmtCountryIgnore.run(team.countryId, team.countryName || team.countryId, team.continent || 'WORLD');
                    
                    stmtTeam.run(team.id, team.teamName, team.countryId);
                    stmtTeamSeason.run(
                        team.id, season, team.division || 1, team.budget || 0, team.stats?.overall || 70,
                        team.stats?.played || 0, team.stats?.wins || 0, team.stats?.draws || 0, team.stats?.losses || 0,
                        team.stats?.goalsFor || 0, team.stats?.goalsAgainst || 0, team.stats?.points || 0
                    );
                    teamsCount++;

                    if (team.players && Array.isArray(team.players)) {
                        for (const p of team.players) {
                            try {
                                const pNationality = p.nationalityId || team.countryId;
                                stmtCountryIgnore.run(pNationality, pNationality, 'WORLD');
                                
                                stmtPlayer.run(p.id, p.name, pNationality, p.isGoalkeeper ? 1 : 0, 0);
                                stmtPlayerSeason.run(
                                    p.id, season, team.id, p.jerseyNumber || 0, p.overall || 70, p.value || 0,
                                    p.contractYears || 0, p.stats?.played || 0, p.stats?.goals || 0, p.stats?.assists || 0
                                );
                                playersCount++;
                            } catch (pError) {
                                console.error(`      ❌ Erro no jogador ${p.name} (${p.id}):`, pError.message);
                            }
                        }
                    }
                } catch (e) {
                    addLog(`    ❌ Erro crítico no time ${team.teamName} (${team.id}): ${e.message}`);
                    throw e; 
                }
            }
            addLog(`    - ${teamsCount} times e ${playersCount} jogadores processados`);
        });

        saveTransaction();

        res.json({
            success: true,
            season,
            message: `Temporada ${season} salva com sucesso no SQLite`
        });
    } catch (error) {
        addLog(`❌ Erro crítico ao salvar temporada: ${error.message}`);
        if (error.stack) addLog(`Stack: ${error.stack}`);
        
        res.status(500).json({ 
            error: error.message, 
            code: error.code,
            detail: 'Erro interno no servidor SQLite'
        });
    }
});

// Descobrir última temporada salva
app.get('/api/season/latest', (req, res) => {
    try {
        const result = db.prepare('SELECT MAX(season) as season FROM team_seasons').get();
        res.json({ season: result?.season || 1 });
    } catch (error) {
        res.json({ season: 1 });
    }
});

// Carregar estado da temporada
app.get('/api/season/:season', (req, res) => {
    try {
        const season = parseInt(req.params.season);
        console.log(`🔍 Carregando dados da temporada ${season}...`);

        // 1. TENTAR CARREGAR DO SNAPSHOT MAIS RECENTE DA TEMPORADA (Fidelidade Máxima)
        const snapshot = db.prepare('SELECT compressed_data FROM snapshots WHERE season = ? ORDER BY created_at DESC LIMIT 1').get(season);

        if (snapshot) {
            try {
                const data = JSON.parse(snapshot.compressed_data.toString());
                console.log(`✅ Temporada ${season} carregada via Snapshot`);
                return res.json({
                    ...data, // Mantém chaves originais do snapshot
                    season,
                    countries: data.countries || [],
                    leaguesData: data.leaguesData || data.leagues || [],
                    teamsData: data.teamsData || data.teams || [],
                    intlData: data.intlData || data.internationalCompetitions || [],
                    message: `Temporada ${season} carregada com sucesso do Snapshot`
                });
            } catch (e) {
                console.warn('⚠️ Erro ao parsear snapshot, tentando reconstrução manual...');
            }
        }

        // 2. Carregar Ligas e Reconstruir Fixtures
        const leagueRows = db.prepare('SELECT * FROM league_seasons WHERE season = ?').all(season);
        const leagues = leagueRows.map(lr => {
            const divisions = db.prepare('SELECT * FROM division_seasons WHERE country_id = ? AND season = ?').all(lr.country_id, season);

            return {
                id: lr.country_id,
                countryId: lr.country_id,
                status: lr.status,
                divisions: divisions.map(d => {
                    // Buscar todas as partidas desta divisão e temporada
                    const matchRows = db.prepare(`
                        SELECT * FROM matches 
                        WHERE country_id = ? AND season = ? AND division_id = ?
                        ORDER BY round_number ASC
                    `).all(lr.country_id, season, d.division_level);

                    // Reconstruir o array de Fixtures (Match[][])
                    const fixtures = [];
                    matchRows.forEach(mr => {
                        const roundIdx = mr.round_number;
                        if (!fixtures[roundIdx]) fixtures[roundIdx] = [];

                        // Buscar artilheiros para esta partida
                        const scorers = db.prepare('SELECT * FROM match_events WHERE match_id = ?').all(mr.id);

                        fixtures[roundIdx].push({
                            id: mr.id,
                            homeTeamId: mr.home_team_id,
                            awayTeamId: mr.away_team_id,
                            homeScore: mr.home_score,
                            awayScore: mr.away_score,
                            played: mr.played === 1,
                            competitionName: mr.competition_name,
                            round_number: mr.round_number,
                            homeScorers: scorers.filter(s => {
                                // Lógica simplificada: precisamos saber de qual time é o jogador
                                // No fallback de reconstrução, isso é complexo, mas o Snapshot resolve 100%
                                return false;
                            })
                        });
                    });

                    return {
                        level: d.division_level,
                        name: d.division_name,
                        fixtures: fixtures.filter(f => f !== null)
                    };
                })
            };
        });

        // 3. Carregar Times e Jogadores
        const countries = db.prepare('SELECT * FROM countries').all();
        const teamsBase = db.prepare('SELECT * FROM teams').all();
        const teamDeltas = db.prepare('SELECT * FROM team_seasons WHERE season = ?').all(season);
        const playerDeltas = db.prepare('SELECT * FROM player_seasons WHERE season = ?').all(season);

        const playerMap = new Map();
        for (const delta of playerDeltas) {
            const playerBase = db.prepare('SELECT * FROM players WHERE id = ?').get(delta.player_id);
            if (playerBase) {
                const playerObj = {
                    id: playerBase.id, name: playerBase.name, nationalityId: playerBase.nationality_id, isGoalkeeper: playerBase.is_goalkeeper === 1,
                    overall: delta.overall, value: delta.market_value, jerseyNumber: delta.jersey_number,
                    contractYears: delta.contract_years, stats: { played: delta.league_matches, goals: delta.league_goals, assists: delta.league_assists }
                };
                if (!playerMap.has(delta.team_id)) playerMap.set(delta.team_id, []);
                playerMap.get(delta.team_id).push(playerObj);
            }
        }

        const teams = teamsBase.map(tb => {
            const delta = teamDeltas.find(d => d.team_id === tb.id);
            if (!delta) return null;
            return {
                id: tb.id, teamName: tb.name, countryId: tb.country_id, division: delta.division_level,
                budget: delta.budget, stats: { overall: delta.overall, played: delta.matches_played, wins: delta.wins, draws: delta.draws, losses: delta.losses, goalsFor: delta.goals_for, goalsAgainst: delta.goals_against, points: delta.points },
                players: playerMap.get(tb.id) || []
            };
        }).filter(t => t !== null);

        res.json({
            season,
            countries,
            leaguesData: leagues,
            teamsData: teams,
            intlData: [],
            message: `Temporada ${season} carregada via reconstrução manual`
        });
    } catch (error) {
        console.error('❌ Erro ao carregar temporada:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// SISTEMA DE SLOTS DE SAVE (MÚLTIPLAS CARREIRAS)
// ============================================================================

// Listar todos os saves disponíveis
app.get('/api/saves', (req, res) => {
    try {
        const saves = db.prepare(`
            SELECT 
                id,
                save_name,
                season,
                player_team,
                created_at,
                updated_at,
                size_bytes
            FROM game_saves
            ORDER BY updated_at DESC
        `).all();

        res.json(saves.map(s => ({
            id: s.id,
            name: s.save_name,
            season: s.season,
            team: s.player_team,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            sizeMB: (s.size_bytes / 1024 / 1024).toFixed(2)
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar novo save
app.post('/api/saves', (req, res) => {
    try {
        const { name, season, team, data } = req.body;
        const compressed = JSON.stringify(data);

        const result = db.prepare(`
            INSERT INTO game_saves (save_name, season, player_team, snapshot_data, size_bytes)
            VALUES (?, ?, ?, ?, ?)
        `).run(name || `Save ${Date.now()}`, season || 1, team || 'Unknown', compressed, compressed.length);

        res.json({
            success: true,
            id: result.lastInsertRowid,
            message: `Save "${name}" criado com sucesso`
        });
    } catch (error) {
        console.error('❌ Erro ao criar save:', error);
        res.status(500).json({ error: error.message });
    }
});

// Carregar save específico
app.get('/api/saves/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const save = db.prepare('SELECT * FROM game_saves WHERE id = ?').get(id);

        if (!save) {
            return res.status(404).json({ error: 'Save não encontrado' });
        }

        const data = JSON.parse(save.snapshot_data.toString());

        res.json({
            id: save.id,
            name: save.save_name,
            season: save.season,
            team: save.player_team,
            data: data
        });
    } catch (error) {
        console.error('❌ Erro ao carregar save:', error);
        res.status(500).json({ error: error.message });
    }
});

// Atualizar save existente
app.put('/api/saves/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, season, team, data } = req.body;

        let updateFields = [];
        let params = [];

        if (name !== undefined) {
            updateFields.push('save_name = ?');
            params.push(name);
        }
        if (season !== undefined) {
            updateFields.push('season = ?');
            params.push(season);
        }
        if (team !== undefined) {
            updateFields.push('player_team = ?');
            params.push(team);
        }
        if (data !== undefined) {
            const compressed = JSON.stringify(data);
            updateFields.push('snapshot_data = ?', 'size_bytes = ?');
            params.push(compressed, compressed.length);
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        db.prepare(`
            UPDATE game_saves 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `).run(...params);

        res.json({
            success: true,
            message: 'Save atualizado com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar save:', error);
        res.status(500).json({ error: error.message });
    }
});

// Deletar save
app.delete('/api/saves/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        db.prepare('DELETE FROM game_saves WHERE id = ?').run(id);

        res.json({
            success: true,
            message: 'Save deletado com sucesso'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// SNAPSHOTS (SISTEMA ANTIGO - MANTIDO PARA COMPATIBILIDADE)
// ============================================================================

// Listar snapshots
app.get('/api/snapshots', (req, res) => {
    try {
        const snapshots = db.prepare(`
      SELECT season, snapshot_type, size_bytes, created_at
      FROM snapshots
      ORDER BY season DESC
    `).all();

        res.json({
            snapshots: snapshots.map(s => ({
                season: s.season,
                type: s.snapshot_type,
                sizeMB: (s.size_bytes / 1024 / 1024).toFixed(2),
                createdAt: s.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar snapshot
app.post('/api/snapshots', (req, res) => {
    try {
        const { season, type, data, description } = req.body;

        const compressed = Buffer.from(JSON.stringify(data));

        db.prepare(`
            INSERT OR REPLACE INTO snapshots (season, snapshot_type, compressed_data, size_bytes, description)
            VALUES (?, ?, ?, ?, ?)
        `).run(season, type || 'manual', compressed, compressed.length, description || '');

        res.json({
            success: true,
            season,
            type: type || 'manual',
            sizeMB: (compressed.length / 1024 / 1024).toFixed(2)
        });
    } catch (error) {
        console.error('❌ Erro ao criar snapshot:', error);
        res.status(500).json({ error: error.message });
    }
});

// Deletar snapshot
app.delete('/api/snapshots/:season/:type', (req, res) => {
    try {
        const season = parseInt(req.params.season);
        const type = req.params.type;

        db.prepare('DELETE FROM snapshots WHERE season = ? AND snapshot_type = ?').run(season, type);

        res.json({
            success: true,
            message: `Snapshot temporada ${season} (${type}) deletado`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter dados base (países, times, jogadores)
app.get('/api/base-data', (req, res) => {
    try {
        const countries = db.prepare('SELECT * FROM countries').all();
        const teams = db.prepare('SELECT * FROM teams LIMIT 100').all();
        const players = db.prepare('SELECT * FROM players LIMIT 100').all();

        res.json({
            countries,
            teams,
            players
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Estatísticas do banco
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            countries: db.prepare('SELECT COUNT(*) as count FROM countries').get()?.count || 0,
            teams: db.prepare('SELECT COUNT(*) as count FROM teams').get()?.count || 0,
            players: db.prepare('SELECT COUNT(*) as count FROM players').get()?.count || 0,
            snapshots: db.prepare('SELECT COUNT(*) as count FROM snapshots').get()?.count || 0,
            matches: db.prepare('SELECT COUNT(*) as count FROM matches').get()?.count || 0,
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================================

function startServer() {
    try {
        initDatabase();

        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(60));
            console.log('🚀 FUTSAL UNIVERSE - BACKEND API REST');
            console.log('='.repeat(60));
            console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
            console.log(`💾 Banco de dados: ${DB_PATH}`);
            console.log(`📊 Versão do schema: ${getCurrentVersion()}`);
            console.log('\n📋 Endpoints disponíveis:');
            console.log(`   GET  /api/health              - Health check`);
            console.log(`   GET  /api/schema/version      - Versão do schema`);
            console.log(`   GET  /api/stats               - Estatísticas do banco`);
            console.log(`   GET  /api/base-data           - Dados base`);
            console.log(`   `);
            console.log(`   📁 SAVES (Múltiplas Carreiras):`);
            console.log(`   GET    /api/saves             - Listar todos os saves`);
            console.log(`   POST   /api/saves             - Criar novo save`);
            console.log(`   GET    /api/saves/:id         - Carregar save específico`);
            console.log(`   PUT    /api/saves/:id         - Atualizar save`);
            console.log(`   DELETE /api/saves/:id         - Deletar save`);
            console.log(`   `);
            console.log(`   📸 SNAPSHOTS (Sistema Antigo):`);
            console.log(`   GET  /api/snapshots           - Listar snapshots`);
            console.log(`   POST /api/snapshots           - Criar snapshot`);
            console.log(`   `);
            console.log(`   🎮 TEMPORADAS:`);
            console.log(`   GET  /api/season/:season      - Carregar temporada`);
            console.log(`   POST /api/season/save         - Salvar temporada`);
            console.log('='.repeat(60) + '\n');
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não tratado:', error);
});

process.on('SIGINT', () => {
    console.log('\n👋 Encerrando servidor...');
    if (db) db.close();
    process.exit(0);
});

// Iniciar
startServer();
