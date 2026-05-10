/**
 * 🎮 INTEGRAÇÃO FINAL NO APP.COMPONENT.TS
 * 
 * Este é o código completo para integrar o sistema de persistência SQLite
 * no seu app Angular com suporte a múltiplos saves.
 * 
 * COPIE E COLE no seu app.component.ts
 */

import { Component, OnInit, inject } from '@angular/core';
import { SaveManagerService, SaveMetadata } from './services/save-manager.service';
import { SeasonLifecycleService } from './services/season-lifecycle.service';
import { GamePersistenceService } from './services/game-persistence.service';

@Component({
    selector: 'app-root',
    template: `
    <div class="app-container">
      <!-- ============================================ -->
      <!-- TELA DE SELEÇÃO DE SAVES -->
      <!-- ============================================ -->
      <div *ngIf="!currentSaveLoaded" class="save-selection-screen">
        <h1>⚽ Futsal Universe Simulator</h1>
        
        <div class="saves-list">
          <h2>Seus Saves</h2>
          
          <!-- Lista de Saves -->
          <div *ngFor="let save of availableSaves" class="save-card">
            <div class="save-info">
              <h3>{{ save.name }}</h3>
              <p>Temporada: {{ save.currentSeason }}</p>
              <p>Tempo de jogo: {{ formatPlaytime(save.playtimeMs) }}</p>
              <p class="save-date">Último jogo: {{ formatDate(save.lastPlayedAt) }}</p>
            </div>
            
            <div class="save-actions">
              <button (click)="loadSave(save.id)" class="btn-load">
                📂 Carregar
              </button>
              <button (click)="renameSave(save.id)" class="btn-rename">
                ✏️ Renomear
              </button>
              <button (click)="deleteSave(save.id)" class="btn-delete">
                🗑️ Deletar
              </button>
            </div>
          </div>

          <!-- Botão Novo Save -->
          <button (click)="createNewSave()" class="btn-new-save">
            ➕ Novo Jogo
          </button>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- TELA DO JOGO (após carregar save) -->
      <!-- ============================================ -->
      <div *ngIf="currentSaveLoaded" class="game-screen">
        <!-- Header com info do save -->
        <div class="game-header">
          <div class="save-info-header">
            <span>💾 {{ currentSaveName }}</span>
            <span>📅 Temporada {{ currentSeason }}</span>
            <span>⏱️ {{ formatPlaytime(currentPlaytime) }}</span>
          </div>
          
          <button (click)="returnToMenu()" class="btn-menu">
            🏠 Menu
          </button>
        </div>

        <!-- SEU JOGO AQUI -->
        <div class="game-content">
          <!-- Seus componentes existentes do jogo -->
          <p>Seu jogo vai aqui...</p>
        </div>

        <!-- Botões de teste (remover depois) -->
        <div class="test-controls" *ngIf="showTestButtons">
          <h3>🧪 Controles de Teste</h3>
          <button (click)="testStartSeason()">🎬 Iniciar Temporada</button>
          <button (click)="testSaveRound()">💾 Salvar Rodada</button>
          <button (click)="testEndSeason()">🏁 Finalizar Temporada</button>
          <button (click)="testCreateSnapshot()">📸 Criar Snapshot</button>
          <button (click)="testAutoSave()">💾 Autosave</button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .save-selection-screen {
      max-width: 800px;
      margin: 0 auto;
      color: white;
    }

    h1 {
      text-align: center;
      font-size: 3rem;
      margin-bottom: 2rem;
    }

    .saves-list {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 30px;
    }

    .save-card {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 15px;
      padding: 20px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: transform 0.2s;
    }

    .save-card:hover {
      transform: translateY(-5px);
      background: rgba(255, 255, 255, 0.2);
    }

    .save-info h3 {
      margin: 0 0 10px 0;
      font-size: 1.5rem;
    }

    .save-info p {
      margin: 5px 0;
      opacity: 0.9;
    }

    .save-date {
      font-size: 0.9rem;
      opacity: 0.7;
    }

    .save-actions {
      display: flex;
      gap: 10px;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .btn-load {
      background: #4CAF50;
      color: white;
    }

    .btn-load:hover {
      background: #45a049;
      transform: scale(1.05);
    }

    .btn-rename {
      background: #2196F3;
      color: white;
    }

    .btn-delete {
      background: #f44336;
      color: white;
    }

    .btn-new-save {
      width: 100%;
      background: #FF9800;
      color: white;
      font-size: 1.2rem;
      padding: 15px;
      margin-top: 20px;
    }

    .btn-new-save:hover {
      background: #e68900;
    }

    .game-screen {
      max-width: 1200px;
      margin: 0 auto;
    }

    .game-header {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 15px;
      padding: 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
    }

    .save-info-header {
      display: flex;
      gap: 30px;
      font-size: 1.1rem;
    }

    .test-controls {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 15px;
      padding: 20px;
      margin-top: 20px;
      color: white;
    }

    .test-controls button {
      margin: 5px;
      background: #9C27B0;
      color: white;
    }
  `]
})
export class AppComponent implements OnInit {
    private saveManager = inject(SaveManagerService);
    private lifecycle = inject(SeasonLifecycleService);
    private gamePersistence = inject(GamePersistenceService);

    // Estado da UI
    currentSaveLoaded = false;
    availableSaves: SaveMetadata[] = [];
    currentSaveName = '';
    currentSeason = 0;
    currentPlaytime = 0;
    showTestButtons = true; // Mudar para false em produção

    async ngOnInit() {
        await this.initializeApp();
    }

    // ============================================================================
    // INICIALIZAÇÃO
    // ============================================================================

    private async initializeApp() {
        try {
            console.log('🎮 Inicializando aplicação...');

            // 1. Inicializar Save Manager
            await this.saveManager.init();

            // 2. Listar saves disponíveis
            await this.refreshSavesList();

            console.log('✅ Aplicação inicializada!');

        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
            alert('Erro ao inicializar o jogo. Veja o console.');
        }
    }

    // ============================================================================
    // GERENCIAMENTO DE SAVES
    // ============================================================================

    async refreshSavesList() {
        this.availableSaves = await this.saveManager.listSaves();
        console.log(`📋 ${this.availableSaves.length} saves encontrados`);
    }

    async createNewSave() {
        const saveName = prompt('Nome do novo save:');
        if (!saveName) return;

        try {
            console.log(`💾 Criando novo save: ${saveName}`);

            const saveId = await this.saveManager.createNewSave(saveName);

            // Inicializar persistência
            await this.gamePersistence.init();

            // Carregar save
            this.currentSaveLoaded = true;
            this.currentSaveName = saveName;
            this.currentSeason = 0;
            this.currentPlaytime = 0;

            console.log(`✅ Save criado: ${saveId}`);
            alert(`Save "${saveName}" criado com sucesso!`);

        } catch (error) {
            console.error('❌ Erro ao criar save:', error);
            alert('Erro ao criar save. Veja o console.');
        }
    }

    async loadSave(saveId: string) {
        try {
            console.log(`📂 Carregando save: ${saveId}`);

            // Carregar save
            await this.saveManager.loadSave(saveId);

            // Inicializar persistência
            await this.gamePersistence.init();

            // Buscar metadata
            const metadata = await this.saveManager.getSaveMetadata(saveId);
            if (metadata) {
                this.currentSaveName = metadata.name;
                this.currentSeason = metadata.currentSeason;
                this.currentPlaytime = metadata.playtimeMs;
            }

            this.currentSaveLoaded = true;

            console.log(`✅ Save carregado: ${saveId}`);

        } catch (error) {
            console.error('❌ Erro ao carregar save:', error);
            alert('Erro ao carregar save. Veja o console.');
        }
    }

    async renameSave(saveId: string) {
        const newName = prompt('Novo nome:');
        if (!newName) return;

        try {
            await this.saveManager.renameSave(saveId, newName);
            await this.refreshSavesList();
            console.log(`✅ Save renomeado para: ${newName}`);
        } catch (error) {
            console.error('❌ Erro ao renomear:', error);
        }
    }

    async deleteSave(saveId: string) {
        const confirmed = confirm('Tem certeza que deseja deletar este save?');
        if (!confirmed) return;

        try {
            await this.saveManager.deleteSave(saveId);
            await this.refreshSavesList();
            console.log('✅ Save deletado');
        } catch (error) {
            console.error('❌ Erro ao deletar:', error);
            alert(error instanceof Error ? error.message : 'Erro ao deletar save');
        }
    }

    async returnToMenu() {
        const confirmed = confirm('Voltar ao menu? (Progresso não salvo será perdido)');
        if (!confirmed) return;

        // Atualizar tempo de jogo
        await this.saveManager.updatePlaytime(this.currentSeason);

        this.currentSaveLoaded = false;
        await this.refreshSavesList();
    }

    // ============================================================================
    // INTEGRAÇÃO COM SEU JOGO
    // ============================================================================

    /**
     * Chame isso quando uma TEMPORADA começar
     */
    async onSeasonStart() {
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
        try {
            const result = await this.lifecycle.saveRound(roundNumber);

            if (result.success) {
                console.log(`✅ Rodada ${roundNumber} salva em ${result.timeMs}ms`);

                // Autosave a cada 5 rodadas
                if (roundNumber % 5 === 0) {
                    await this.saveManager.createAutoSave(this.currentSeason);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao salvar rodada:', error);
        }
    }

    /**
     * Chame isso quando a TEMPORADA terminar
     */
    async onSeasonEnd() {
        try {
            const result = await this.lifecycle.endSeason();

            if (result.success) {
                this.currentSeason++;
                console.log(`✅ Temporada finalizada`);

                if (result.snapshotCreated) {
                    console.log('📸 Snapshot automático criado!');
                }

                // Atualizar tempo de jogo
                await this.saveManager.updatePlaytime(this.currentSeason);
            }
        } catch (error) {
            console.error('❌ Erro ao finalizar temporada:', error);
        }
    }

    // ============================================================================
    // MÉTODOS DE TESTE (REMOVER EM PRODUÇÃO)
    // ============================================================================

    async testStartSeason() {
        this.currentSeason++;
        await this.onSeasonStart();
        alert(`Temporada ${this.currentSeason} iniciada!`);
    }

    async testSaveRound() {
        await this.onRoundComplete(1);
        alert('Rodada 1 salva!');
    }

    async testEndSeason() {
        await this.onSeasonEnd();
        alert(`Temporada ${this.currentSeason} finalizada!`);
    }

    async testCreateSnapshot() {
        await this.lifecycle.createManualSnapshot('Teste manual');
        alert('Snapshot criado!');
    }

    async testAutoSave() {
        await this.saveManager.createAutoSave(this.currentSeason);
        alert('Autosave criado!');
    }

    // ============================================================================
    // UTILITÁRIOS
    // ============================================================================

    formatPlaytime(playtimeMs: number): string {
        return this.saveManager.formatPlaytime(playtimeMs);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString('pt-BR');
    }
}
