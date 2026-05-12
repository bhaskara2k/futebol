import { Component, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebasePersistenceService, SaveMetadata } from '../../services/firebase-persistence.service';
import { UniverseService } from '../../services/universe.service';

@Component({
    selector: 'app-save-selection',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="save-selection-screen">
      <!-- Background Decorativo -->
      <div class="cinematic-bg">
        <div class="overlay"></div>
        <img src="assets/renders/ronaldo.png" class="bg-render ronaldo-bg" alt="">
        <img src="assets/renders/messi.png" class="bg-render messi-bg" alt="">
      </div>

      <div class="content-wrapper">
        <header class="header">
          <h1 class="brand-name">FUTEBOL <span class="accent">UNIVERSE</span></h1>
          <p class="subtitle">Sua jornada épica no mundo do futebol começa aqui</p>
        </header>
        
        <div class="saves-container">
          <div class="saves-grid">
            <!-- Save Cards -->
            <div *ngFor="let save of saves()" class="save-card" (click)="selectSave(save.id)">
              <div class="card-glow"></div>
              <div class="save-header">
                <span class="season-badge">Temporada {{ save.season }}</span>
                <span class="last-played">{{ formatDate(save.lastPlayed) }}</span>
              </div>
              
              <div class="save-body">
                <h3 class="save-name">{{ save.description || 'Universo Sem Nome' }}</h3>
              </div>

              <div class="save-footer">
                <button (click)="deleteSave(save.id, $event)" class="btn-delete-save" title="Deletar Universo">
                   <span class="icon">🗑️</span> Deletar
                </button>
                <div class="enter-save">Continuar ➔</div>
              </div>
            </div>

            <!-- New Save Card -->
            <div class="save-card new-save-card" (click)="createNewSave()">
              <div class="card-glow"></div>
              <div class="new-save-content">
                <div class="plus-circle">
                  <span class="plus-icon">+</span>
                </div>
                <h3>Novo Universo</h3>
                <p>Inicie do zero em 2026</p>
              </div>
            </div>
          </div>
        </div>

        <footer class="footer">
          <p>Versão 7.0 - Lean Architecture</p>
        </footer>
      </div>
    </div>
  `,
    styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;900&display=swap');

    .save-selection-screen {
      position: fixed;
      inset: 0;
      background: #020205;
      font-family: 'Montserrat', sans-serif;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      overflow: hidden;
    }

    .cinematic-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(10, 10, 30, 0.4) 0%, rgba(0, 0, 0, 0.95) 100%);
      z-index: 1;
    }

    .bg-render {
      position: absolute;
      height: 120%;
      filter: grayscale(100%) brightness(20%) blur(5px);
      pointer-events: none;
      opacity: 0.3;
      transition: all 2s ease;
    }

    .ronaldo-bg { right: -10%; top: -10%; transform: rotate(5deg); }
    .messi-bg { left: -10%; bottom: -10%; transform: rotate(-5deg); }

    .content-wrapper {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 1200px;
      padding: 40px;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .header {
      text-align: center;
      margin-bottom: 60px;
      animation: fadeInDown 1.2s cubic-bezier(0.19, 1, 0.22, 1);
    }

    .logo-container, .main-logo {
      display: none;
    }

    @keyframes logoFloat {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-15px) scale(1.05); }
    }

    .brand-name {
      font-size: 4.5rem;
      font-weight: 900;
      letter-spacing: -3px;
      margin: 0;
      line-height: 0.9;
      text-transform: uppercase;
      background: linear-gradient(to bottom, #fff 0%, #aaa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 5px 15px rgba(0,0,0,0.5));
    }

    .accent {
      background: linear-gradient(to bottom, #ffd700 0%, #b8860b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: none;
    }

    .subtitle {
      font-size: 1.1rem;
      opacity: 0.5;
      font-weight: 400;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 15px;
    }

    .saves-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px 10px;
      mask-image: linear-gradient(to bottom, transparent, black 5%, black 95%, transparent);
    }

    .saves-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 25px;
      padding: 20px;
    }

     .save-card {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 28px;
      padding: 30px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 240px;
      backdrop-filter: blur(10px);
    }

    .save-card:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 215, 0, 0.4);
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    .card-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at top right, rgba(255, 215, 0, 0.1), transparent 70%);
      opacity: 0;
      transition: opacity 0.4s;
    }

    .save-card:hover .card-glow {
      opacity: 1;
    }

    .save-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .season-badge {
      background: rgba(255, 215, 0, 0.15);
      color: #ffd700;
      padding: 6px 12px;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .last-played {
      font-size: 0.75rem;
      opacity: 0.4;
    }

    .save-name {
      font-size: 1.6rem;
      margin: 0 0 8px 0;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      color: #fff;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }

    .save-team {
      font-size: 1rem;
      opacity: 0.7;
      margin: 0;
    }

    .save-footer {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }

    .save-card:hover .save-footer {
      opacity: 1;
      transform: translateY(0);
    }

    .enter-save {
      font-weight: 600;
      color: #ffd700;
      font-size: 0.9rem;
    }

    .btn-delete-save {
      background: transparent;
      border: none;
      color: rgba(255, 50, 50, 0.6);
      font-size: 0.8rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px;
      border-radius: 5px;
    }

    .btn-delete-save:hover {
      color: #ff3232;
      background: rgba(255, 50, 50, 0.1);
    }

    .new-save-card {
      border: 2px dashed rgba(255, 255, 255, 0.1);
      background: transparent;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .plus-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 15px;
      transition: all 0.3s;
    }

    .save-card:hover .plus-circle {
      background: #ffd700;
      color: black;
      transform: rotate(90deg);
    }

    .plus-icon {
      font-size: 2rem;
      font-weight: 300;
    }

    .footer {
      text-align: center;
      margin-top: 30px;
      opacity: 0.3;
      font-size: 0.8rem;
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Scrollbar Custom */
    .saves-container::-webkit-scrollbar { width: 4px; }
    .saves-container::-webkit-scrollbar-track { background: transparent; }
    .saves-container::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.2); border-radius: 10px; }
  `]
})
export class SaveSelectionComponent implements OnInit {
    private firebaseService = inject(FirebasePersistenceService);
    private universeService = inject(UniverseService);

    saves = signal<SaveMetadata[]>([]);

    // Outputs
    saveSelected = output<string>();
    startNewGame = output<void>();

    async ngOnInit() {
        await this.refreshSaves();
    }

    private async refreshSaves() {
        const list = await this.firebaseService.listSaves();
        this.saves.set(list);
    }

    async selectSave(saveId: string) {
        // Emitir imediatamente para que o pai (AppComponent) possa mostrar o loading
        this.saveSelected.emit(saveId);
    }

    async createNewSave() {
        this.startNewGame.emit();
    }

    async deleteSave(saveId: string, event: Event) {
        event.stopPropagation();
        const save = this.saves().find(s => s.id === saveId);
        const displayName = save?.description || saveId;
        if (confirm(`Deseja apagar o universo "${displayName}" para sempre?`)) {
            await this.firebaseService.deleteSave(saveId);
            await this.refreshSaves();
        }
    }

    formatDate(timestamp: any): string {
        if (!timestamp) return 'Nunca';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
}
