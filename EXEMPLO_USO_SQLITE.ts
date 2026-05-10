/**
 * EXEMPLO PRÁTICO: Como usar o SQLite no seu app
 * 
 * Este arquivo demonstra como integrar o novo sistema de persistência
 * SQLite no fluxo normal do jogo.
 */

import { Component, inject, OnInit } from '@angular/core';
import { SqlitePersistenceService } from './services/sqlite-persistence.service';
import { FirebaseToSqliteMigrationService } from './services/firebase-to-sqlite-migration.service';
import { UniverseService } from './services/universe.service';
import { SeasonService } from './services/season.service';

@Component({
    selector: 'app-root',
    template: `
    <div class="app-container">
      <!-- Botão de Migração (usar apenas 1x) -->
      <button 
        *ngIf="!migrationComplete" 
        (click)="runMigration()"
        class="migrate-btn">
        🚀 Migrar Firebase → SQLite
      </button>

      <!-- Progresso da Migração -->
      <div *ngIf="migrationProgress" class="progress-bar">
        <div class="progress-fill" [style.width.%]="migrationProgress.percentage"></div>
        <span>{{ migrationProgress.message }}</span>
      </div>

      <!-- Controles do Jogo -->
      <div class="game-controls">
        <button (click)="saveCurrentSeason()">💾 Salvar Temporada</button>
        <button (click)="loadSeason(selectedSeason)">📂 Carregar Temporada</button>
        <button (click)="createManualSnapshot()">📸 Criar Snapshot</button>
        <button (click)="viewSnapshots()">📊 Ver Snapshots</button>
      </div>

      <!-- Lista de Snapshots -->
      <div *ngIf="showSnapshots" class="snapshots-list">
        <h3>Snapshots Disponíveis</h3>
        <div *ngFor="let snapshot of snapshots" class="snapshot-item">
          <span>Temporada {{ snapshot.season }}</span>
          <span>{{ snapshot.sizeMB }} MB</span>
          <span>{{ snapshot.type }}</span>
          <button (click)="loadFromSnapshot(snapshot.season)">Carregar</button>
        </div>
      </div>

      <!-- Estatísticas Rápidas -->
      <div class="quick-stats">
        <h3>Top Artilheiros (Temporada {{ currentSeason }})</h3>
        <div *ngFor="let scorer of topScorers" class="scorer-item">
          <span>{{ scorer.player_name }}</span>
          <span>{{ scorer.team_name }}</span>
          <span>{{ scorer.total_goals }} gols</span>
        </div>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
    private sqliteService = inject(SqlitePersistenceService);
    private migrationService = inject(FirebaseToSqliteMigrationService);
    private universeService = inject(UniverseService);
    private seasonService = inject(SeasonService);

    migrationComplete = false;
    migrationProgress: any = null;
    showSnapshots = false;
    snapshots: any[] = [];
    topScorers: any[] = [];
    currentSeason = 1;
    selectedSeason = 1;

    async ngOnInit() {
        // Inicializar SQLite
        await this.sqliteService.initDatabase();

        // Verificar se já foi migrado
        this.checkMigrationStatus();
    }

    // ============================================================================
    // MIGRAÇÃO (Executar apenas 1x)
    // ============================================================================

    async runMigration() {
        console.log('🚀 Iniciando migração Firebase → SQLite...');

        await this.migrationService.migrate((progress) => {
            this.migrationProgress = progress;
            console.log(`[${progress.percentage}%] ${progress.message}`);
        });

        this.migrationComplete = true;
        this.migrationProgress = null;

        // Exportar relatório
        const report = await this.migrationService.exportMigrationReport();
        console.log(report);

        alert('✅ Migração concluída! Veja o console para detalhes.');
    }

    private checkMigrationStatus() {
        // Verificar se há snapshots (indica que já foi migrado)
        const snapshots = this.sqliteService.listSnapshots();
        this.migrationComplete = snapshots.length > 0;
    }

    // ============================================================================
    // SALVAR / CARREGAR
    // ============================================================================

    /**
     * Salva o estado da temporada atual
     * QUANDO USAR: Ao finalizar cada rodada ou temporada
     */
    async saveCurrentSeason() {
        const startTime = Date.now();

        const season = this.universeService.season();
        const teams = this.universeService.teams();
        const leagues = this.universeService.leagues();
        const matchHistory = this.universeService.matchHistory();
        const transferHistory = this.universeService.transferHistory();

        console.log(`💾 Salvando temporada ${season}...`);

        // 1. Salvar deltas (apenas mudanças)
        this.sqliteService.saveSeasonState(season, teams, leagues);

        // 2. Salvar eventos novos (apenas da temporada atual)
        const currentSeasonMatches = matchHistory.filter(m => m.season === season);
        const currentSeasonTransfers = transferHistory.filter(t => t.season === season);

        this.sqliteService.saveMatches(currentSeasonMatches);
        this.sqliteService.saveTransfers(currentSeasonTransfers);
        this.sqliteService.saveTitles(season, teams);

        // 3. Criar snapshot a cada 10 temporadas
        if (season % 10 === 0) {
            console.log(`📸 Criando snapshot da temporada ${season}...`);
            const fullState = this.exportFullState();
            this.sqliteService.createSnapshot(season, fullState, 'auto');
        }

        const elapsed = Date.now() - startTime;
        console.log(`✅ Temporada ${season} salva em ${elapsed}ms`);

        alert(`✅ Temporada ${season} salva com sucesso!`);
    }

    /**
     * Carrega uma temporada específica
     * QUANDO USAR: Para voltar no tempo ou carregar um save
     */
    async loadSeason(season: number) {
        console.log(`📂 Carregando temporada ${season}...`);

        const state = this.sqliteService.loadSeasonState(season);

        if (state) {
            // Importar para o jogo
            await this.importGameState(state);
            this.currentSeason = season;
            console.log(`✅ Temporada ${season} carregada!`);
            alert(`✅ Temporada ${season} carregada!`);
        } else {
            alert(`❌ Temporada ${season} não encontrada`);
        }
    }

    // ============================================================================
    // SNAPSHOTS
    // ============================================================================

    /**
     * Cria um snapshot manual
     * QUANDO USAR: Antes de decisões importantes ou experimentos
     */
    async createManualSnapshot() {
        const season = this.universeService.season();
        const description = prompt('Descrição do snapshot (opcional):');

        const fullState = this.exportFullState();
        this.sqliteService.createSnapshot(season, fullState, 'manual', description || undefined);

        alert(`✅ Snapshot manual criado para temporada ${season}`);
    }

    /**
     * Lista todos os snapshots disponíveis
     */
    viewSnapshots() {
        this.snapshots = this.sqliteService.listSnapshots();
        this.showSnapshots = true;
        console.log('📊 Snapshots disponíveis:', this.snapshots);
    }

    /**
     * Carrega um snapshot específico
     */
    async loadFromSnapshot(season: number) {
        const confirmed = confirm(`Carregar snapshot da temporada ${season}?`);
        if (!confirmed) return;

        const state = this.sqliteService.loadSnapshot(season);
        if (state) {
            await this.importGameState(state);
            this.currentSeason = season;
            alert(`✅ Snapshot da temporada ${season} restaurado!`);
        }
    }

    // ============================================================================
    // CONSULTAS RÁPIDAS
    // ============================================================================

    /**
     * Busca top artilheiros da temporada
     * QUANDO USAR: Para exibir estatísticas
     */
    loadTopScorers() {
        const season = this.universeService.season();
        this.topScorers = this.sqliteService.getTopScorers(season, 20);
        console.log('⚽ Top 20 Artilheiros:', this.topScorers);
    }

    /**
     * Busca histórico H2H entre dois times
     * QUANDO USAR: Antes de um clássico
     */
    viewH2H(teamId1: string, teamId2: string) {
        const h2h = this.sqliteService.getH2HHistory(teamId1, teamId2);
        console.log('📊 Histórico H2H:', h2h);

        // Calcular estatísticas
        const team1Wins = h2h.filter(m =>
            (m.home_team_id === teamId1 && m.home_score > m.away_score) ||
            (m.away_team_id === teamId1 && m.away_score > m.home_score)
        ).length;

        const team2Wins = h2h.filter(m =>
            (m.home_team_id === teamId2 && m.home_score > m.away_score) ||
            (m.away_team_id === teamId2 && m.away_score > m.home_score)
        ).length;

        const draws = h2h.filter(m => m.home_score === m.away_score).length;

        console.log(`Vitórias Time 1: ${team1Wins}`);
        console.log(`Vitórias Time 2: ${team2Wins}`);
        console.log(`Empates: ${draws}`);
    }

    /**
     * Busca todos os títulos de um time
     * QUANDO USAR: Para exibir troféus
     */
    viewTeamTitles(teamId: string) {
        const titles = this.sqliteService.getTeamTitles(teamId);
        console.log('🏆 Títulos do time:', titles);

        // Agrupar por tipo
        const grouped = titles.reduce((acc: any, title: any) => {
            if (!acc[title.competition_type]) {
                acc[title.competition_type] = [];
            }
            acc[title.competition_type].push(title);
            return acc;
        }, {});

        console.log('Títulos agrupados:', grouped);
    }

    // ============================================================================
    // UTILITÁRIOS
    // ============================================================================

    private exportFullState(): any {
        return {
            season: this.universeService.season(),
            teams: this.universeService.teams(),
            leagues: this.universeService.leagues(),
            internationalCompetitions: this.universeService.internationalCompetitions(),
            matchHistory: this.universeService.matchHistory(),
            transferHistory: this.universeService.transferHistory(),
            bestPlayerHistory: this.universeService.bestPlayerInTheWorldHistory(),
            worldCupHistory: this.universeService.worldCupHistory()
        };
    }

    private async importGameState(state: any): Promise<void> {
        // TODO: Implementar importação completa
        console.log('Importando estado:', state);
    }

    // ============================================================================
    // INTEGRAÇÃO COM O FLUXO DO JOGO
    // ============================================================================

    /**
     * Exemplo: Ao finalizar uma rodada
     */
    async onRoundComplete() {
        // Salvar automaticamente após cada rodada
        await this.saveCurrentSeason();

        // Atualizar estatísticas
        this.loadTopScorers();
    }

    /**
     * Exemplo: Ao finalizar uma temporada
     */
    async onSeasonComplete() {
        const season = this.universeService.season();

        // Salvar estado final da temporada
        await this.saveCurrentSeason();

        // Criar snapshot se for temporada especial
        if (season % 5 === 0) {
            const fullState = this.exportFullState();
            this.sqliteService.createSnapshot(
                season,
                fullState,
                'auto',
                `Final da temporada ${season}`
            );
        }

        console.log(`✅ Temporada ${season} finalizada e salva!`);
    }

    /**
     * Exemplo: Antes de uma decisão importante
     */
    async beforeImportantMatch() {
        // Criar snapshot manual
        const season = this.universeService.season();
        const fullState = this.exportFullState();

        this.sqliteService.createSnapshot(
            season,
            fullState,
            'manual',
            'Antes da final da Champions League'
        );

        console.log('📸 Snapshot de segurança criado!');
    }
}
