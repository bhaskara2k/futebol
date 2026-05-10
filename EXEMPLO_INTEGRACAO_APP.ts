/**
 * 📝 EXEMPLO DE INTEGRAÇÃO NO APP.COMPONENT.TS
 * 
 * Copie e cole este código no seu app.component.ts
 */

import { Component, OnInit, inject } from '@angular/core';
import { GamePersistenceService } from './services/game-persistence.service';
import { SeasonLifecycleService } from './services/season-lifecycle.service';

@Component({
    selector: 'app-root',
    template: `
    <div class="app-container">
      <!-- Status da Persistência -->
      <div class="persistence-status" *ngIf="persistenceInitialized">
        <span class="status-indicator">💾</span>
        <span>SQLite Ativo</span>
      </div>

      <!-- Seus componentes existentes aqui -->
      
      <!-- Botões de teste (remover depois) -->
      <div class="test-buttons" *ngIf="showTestButtons">
        <button (click)="testSaveRound()">💾 Testar Save Rodada</button>
        <button (click)="testSnapshot()">📸 Testar Snapshot</button>
        <button (click)="showStats()">📊 Ver Estatísticas</button>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
    private gamePersistence = inject(GamePersistenceService);
    private lifecycle = inject(SeasonLifecycleService);

    persistenceInitialized = false;
    showTestButtons = true; // Mudar para false em produção

    async ngOnInit() {
        // 🎯 PASSO 1: Inicializar persistência
        await this.initPersistence();
    }

    /**
     * Inicializa o sistema de persistência
     */
    private async initPersistence() {
        try {
            console.log('🎮 Inicializando jogo...');

            await this.gamePersistence.init();

            this.persistenceInitialized = true;
            console.log('✅ Jogo pronto!');

        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
            alert('Erro ao inicializar o jogo. Veja o console.');
        }
    }

    // ============================================================================
    // INTEGRAÇÃO COM SEU FLUXO EXISTENTE
    // ============================================================================

    /**
     * Chame isso quando uma TEMPORADA começar
     */
    async onSeasonStart() {
        if (!this.persistenceInitialized) return;

        try {
            await this.lifecycle.startSeason();
            console.log('✅ Temporada iniciada');
        } catch (error) {
            console.error('❌ Erro ao iniciar temporada:', error);
        }
    }

    /**
     * Chame isso quando uma RODADA terminar
     */
    async onRoundComplete(roundNumber: number) {
        if (!this.persistenceInitialized) return;

        try {
            const result = await this.lifecycle.saveRound(roundNumber);

            if (result.success) {
                console.log(`✅ Rodada ${roundNumber} salva em ${result.timeMs}ms`);
            } else {
                console.error(`❌ Erro ao salvar rodada:`, result.errors);
            }
        } catch (error) {
            console.error('❌ Erro ao salvar rodada:', error);
        }
    }

    /**
     * Chame isso quando a TEMPORADA terminar
     */
    async onSeasonEnd() {
        if (!this.persistenceInitialized) return;

        try {
            const result = await this.lifecycle.endSeason();

            if (result.success) {
                console.log(`✅ Temporada finalizada em ${result.timeMs}ms`);

                if (result.snapshotCreated) {
                    console.log('📸 Snapshot automático criado!');
                }
            } else {
                console.error(`❌ Erro ao finalizar temporada:`, result.errors);
            }
        } catch (error) {
            console.error('❌ Erro ao finalizar temporada:', error);
        }
    }

    /**
     * Cria snapshot manual (antes de eventos importantes)
     */
    async createManualSnapshot(description: string) {
        if (!this.persistenceInitialized) return;

        try {
            await this.lifecycle.createManualSnapshot(description);
            console.log(`📸 Snapshot manual criado: ${description}`);
        } catch (error) {
            console.error('❌ Erro ao criar snapshot:', error);
        }
    }

    // ============================================================================
    // MÉTODOS DE TESTE (REMOVER EM PRODUÇÃO)
    // ============================================================================

    async testSaveRound() {
        console.log('🧪 Testando save de rodada...');

        // Simular início de temporada
        await this.lifecycle.startSeason();

        // Simular save de rodada
        const result = await this.lifecycle.saveRound(1);

        console.log('Resultado:', result);
        alert(`Rodada salva em ${result.timeMs}ms!`);
    }

    async testSnapshot() {
        console.log('🧪 Testando snapshot...');

        await this.lifecycle.createManualSnapshot('Teste manual');

        const snapshots = this.gamePersistence.getSqliteService().listSnapshots();
        console.log('Snapshots:', snapshots);

        alert(`${snapshots.length} snapshots criados!`);
    }

    showStats() {
        const stats = this.gamePersistence.getStats();
        console.log('📊 Estatísticas:', stats);

        alert(JSON.stringify(stats, null, 2));
    }
}
