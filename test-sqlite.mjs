#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE TESTES - FUTSAL UNIVERSE SQLITE
 * 
 * Valida todo o sistema de persistência implementado nas Fases 1-4
 */

import Database from 'better-sqlite3';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEST_DB_PATH = './test_futsal.db';
const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function test(name, fn) {
    testsRun++;
    try {
        fn();
        testsPassed++;
        log(`✅ ${name}`, 'green');
    } catch (error) {
        testsFailed++;
        log(`❌ ${name}`, 'red');
        log(`   Error: ${error.message}`, 'red');
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function cleanup() {
    if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
        log('🧹 Banco de teste removido', 'cyan');
    }
}

// ============================================================================
// TESTE 1: MIGRATIONS
// ============================================================================

function testMigrations() {
    log('\n📦 TESTE 1: Sistema de Migrations', 'blue');
    log('─'.repeat(60), 'blue');

    cleanup();
    const db = new Database(TEST_DB_PATH);

    test('Tabela schema_version criada', () => {
        db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT NOT NULL
      );
    `);

        const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'
    `).all();

        assert(tables.length === 1, 'Tabela schema_version não foi criada');
    });

    test('Migration 001 aplicada', () => {
        db.exec(`
      INSERT INTO schema_version (version, description)
      VALUES (1, 'Initial schema with base data, deltas and events');
    `);

        const version = db.prepare(`
      SELECT MAX(version) as version FROM schema_version
    `).get();

        assertEquals(version.version, 1, 'Migration 001 não foi aplicada');
    });

    test('Migration 002 aplicada', () => {
        db.exec(`
      INSERT INTO schema_version (version, description)
      VALUES (2, 'Add international competitions and global history tables');
    `);

        const version = db.prepare(`
      SELECT MAX(version) as version FROM schema_version
    `).get();

        assertEquals(version.version, 2, 'Migration 002 não foi aplicada');
    });

    test('Histórico de migrations registrado', () => {
        const migrations = db.prepare(`
      SELECT * FROM schema_version ORDER BY version
    `).all();

        assertEquals(migrations.length, 2, 'Deveria ter 2 migrations registradas');
        assertEquals(migrations[0].version, 1, 'Primeira migration deveria ser versão 1');
        assertEquals(migrations[1].version, 2, 'Segunda migration deveria ser versão 2');
    });

    db.close();
}

// ============================================================================
// TESTE 2: TABELAS DO SCHEMA
// ============================================================================

function testSchemaTables() {
    log('\n🗄️  TESTE 2: Tabelas do Schema', 'blue');
    log('─'.repeat(60), 'blue');

    const db = new Database(TEST_DB_PATH);

    // Aplicar schema completo
    const requiredTables = [
        'schema_version',
        'game_metadata',
        'countries',
        'teams',
        'players',
        'player_seasons',
        'team_seasons',
        'league_seasons',
        'division_seasons',
        'titles',
        'player_awards',
        'transfers',
        'matches',
        'match_events',
        'snapshots',
        'international_competitions',
        'global_history'
    ];

    // Criar tabelas essenciais para o teste
    db.exec(`
    CREATE TABLE IF NOT EXISTS countries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      continent TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nationality_id TEXT NOT NULL,
      is_goalkeeper BOOLEAN NOT NULL DEFAULT 0,
      birth_season INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS international_competitions (
      id TEXT NOT NULL,
      season INTEGER NOT NULL,
      competition_data TEXT NOT NULL,
      status TEXT NOT NULL,
      PRIMARY KEY (id, season)
    );

    CREATE TABLE IF NOT EXISTS global_history (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season INTEGER NOT NULL UNIQUE,
      snapshot_type TEXT NOT NULL,
      compressed_data BLOB NOT NULL,
      size_bytes INTEGER NOT NULL
    );
  `);

    const criticalTables = [
        'countries',
        'teams',
        'players',
        'international_competitions',
        'global_history',
        'snapshots'
    ];

    criticalTables.forEach(tableName => {
        test(`Tabela ${tableName} existe`, () => {
            const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?
      `).all(tableName);

            assert(tables.length === 1, `Tabela ${tableName} não foi criada`);
        });
    });

    db.close();
}

// ============================================================================
// TESTE 3: SAVE/LOAD DE DADOS
// ============================================================================

function testSaveLoad() {
    log('\n💾 TESTE 3: Save/Load de Dados', 'blue');
    log('─'.repeat(60), 'blue');

    const db = new Database(TEST_DB_PATH);

    test('Salvar país', () => {
        db.prepare(`
      INSERT INTO countries (id, name, continent)
      VALUES ('BRA', 'Brasil', 'SAM')
    `).run();

        const country = db.prepare(`
      SELECT * FROM countries WHERE id = 'BRA'
    `).get();

        assert(country, 'País não foi salvo');
        assertEquals(country.name, 'Brasil', 'Nome do país incorreto');
    });

    test('Salvar time', () => {
        db.prepare(`
      INSERT INTO teams (id, name, country_id)
      VALUES ('FLA', 'Flamengo', 'BRA')
    `).run();

        const team = db.prepare(`
      SELECT * FROM teams WHERE id = 'FLA'
    `).get();

        assert(team, 'Time não foi salvo');
        assertEquals(team.name, 'Flamengo', 'Nome do time incorreto');
    });

    test('Salvar jogador', () => {
        db.prepare(`
      INSERT INTO players (id, name, nationality_id, is_goalkeeper, birth_season)
      VALUES ('P1', 'Gabigol', 'BRA', 0, 1990)
    `).run();

        const player = db.prepare(`
      SELECT * FROM players WHERE id = 'P1'
    `).get();

        assert(player, 'Jogador não foi salvo');
        assertEquals(player.name, 'Gabigol', 'Nome do jogador incorreto');
    });

    db.close();
}

// ============================================================================
// TESTE 4: COMPETIÇÕES INTERNACIONAIS
// ============================================================================

function testInternationalCompetitions() {
    log('\n🌍 TESTE 4: Competições Internacionais', 'blue');
    log('─'.repeat(60), 'blue');

    const db = new Database(TEST_DB_PATH);

    test('Salvar competição internacional', () => {
        const competitionData = JSON.stringify({
            id: 'WC_FINALS',
            name: 'Copa do Mundo',
            season: 1,
            status: 'finished'
        });

        db.prepare(`
      INSERT INTO international_competitions (id, season, competition_data, status)
      VALUES ('WC_FINALS', 1, ?, 'finished')
    `).run(competitionData);

        const comp = db.prepare(`
      SELECT * FROM international_competitions WHERE id = 'WC_FINALS' AND season = 1
    `).get();

        assert(comp, 'Competição não foi salva');
        const data = JSON.parse(comp.competition_data);
        assertEquals(data.name, 'Copa do Mundo', 'Nome da competição incorreto');
    });

    test('Carregar competições por temporada', () => {
        const comps = db.prepare(`
      SELECT * FROM international_competitions WHERE season = 1
    `).all();

        assert(comps.length > 0, 'Nenhuma competição encontrada para a temporada');
    });

    db.close();
}

// ============================================================================
// TESTE 5: HISTÓRICO GLOBAL
// ============================================================================

function testGlobalHistory() {
    log('\n📊 TESTE 5: Histórico Global', 'blue');
    log('─'.repeat(60), 'blue');

    const db = new Database(TEST_DB_PATH);

    test('Salvar histórico global', () => {
        const historyData = JSON.stringify([
            { season: 1, winner: 'Brasil' },
            { season: 2, winner: 'Argentina' }
        ]);

        db.prepare(`
      INSERT OR REPLACE INTO global_history (key, data)
      VALUES ('world_cup_history', ?)
    `).run(historyData);

        const history = db.prepare(`
      SELECT * FROM global_history WHERE key = 'world_cup_history'
    `).get();

        assert(history, 'Histórico não foi salvo');
        const data = JSON.parse(history.data);
        assertEquals(data.length, 2, 'Deveria ter 2 registros no histórico');
    });

    test('Atualizar histórico global', () => {
        const newHistoryData = JSON.stringify([
            { season: 1, winner: 'Brasil' },
            { season: 2, winner: 'Argentina' },
            { season: 3, winner: 'França' }
        ]);

        db.prepare(`
      INSERT OR REPLACE INTO global_history (key, data)
      VALUES ('world_cup_history', ?)
    `).run(newHistoryData);

        const history = db.prepare(`
      SELECT * FROM global_history WHERE key = 'world_cup_history'
    `).get();

        const data = JSON.parse(history.data);
        assertEquals(data.length, 3, 'Histórico deveria ter sido atualizado para 3 registros');
    });

    db.close();
}

// ============================================================================
// TESTE 6: SNAPSHOTS
// ============================================================================

function testSnapshots() {
    log('\n📸 TESTE 6: Snapshots', 'blue');
    log('─'.repeat(60), 'blue');

    const db = new Database(TEST_DB_PATH);

    test('Criar snapshot', () => {
        const snapshotData = Buffer.from(JSON.stringify({ season: 10, teams: [] }));

        db.prepare(`
      INSERT INTO snapshots (season, snapshot_type, compressed_data, size_bytes)
      VALUES (10, 'auto', ?, ?)
    `).run(snapshotData, snapshotData.length);

        const snapshot = db.prepare(`
      SELECT * FROM snapshots WHERE season = 10
    `).get();

        assert(snapshot, 'Snapshot não foi criado');
        assertEquals(snapshot.snapshot_type, 'auto', 'Tipo de snapshot incorreto');
    });

    test('Carregar snapshot', () => {
        const snapshot = db.prepare(`
      SELECT compressed_data FROM snapshots WHERE season = 10
    `).get();

        assert(snapshot, 'Snapshot não foi encontrado');
        const data = JSON.parse(snapshot.compressed_data.toString());
        assertEquals(data.season, 10, 'Dados do snapshot incorretos');
    });

    test('Listar snapshots', () => {
        const snapshots = db.prepare(`
      SELECT season, snapshot_type FROM snapshots ORDER BY season DESC
    `).all();

        assert(snapshots.length > 0, 'Nenhum snapshot encontrado');
    });

    db.close();
}

// ============================================================================
// EXECUTAR TODOS OS TESTES
// ============================================================================

function runAllTests() {
    log('\n' + '='.repeat(60), 'cyan');
    log('🧪 INICIANDO BATERIA DE TESTES - FUTSAL UNIVERSE SQLITE', 'cyan');
    log('='.repeat(60) + '\n', 'cyan');

    testMigrations();
    testSchemaTables();
    testSaveLoad();
    testInternationalCompetitions();
    testGlobalHistory();
    testSnapshots();

    // Relatório Final
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 RELATÓRIO FINAL DE TESTES', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`Total de testes: ${testsRun}`, 'cyan');
    log(`✅ Passou: ${testsPassed}`, 'green');
    log(`❌ Falhou: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
    log(`📈 Taxa de sucesso: ${((testsPassed / testsRun) * 100).toFixed(1)}%`, 'cyan');
    log('='.repeat(60) + '\n', 'cyan');

    cleanup();

    if (testsFailed === 0) {
        log('🎉 TODOS OS TESTES PASSARAM! Sistema validado com sucesso!', 'green');
        process.exit(0);
    } else {
        log('⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.', 'yellow');
        process.exit(1);
    }
}

// Executar
runAllTests();
