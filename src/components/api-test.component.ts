import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, HealthResponse, StatsResponse } from '../services/api.service';

/**
 * 🧪 COMPONENTE DE TESTE DA API
 * 
 * Testa a conexão com o backend Node.js
 */

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="api-test-container">
      <div class="header-actions">
        <button (click)="goHome()" class="btn-back">
          <i class="fas fa-arrow-left"></i> Voltar ao Jogo
        </button>
        <button (click)="resetGame()" class="btn-danger">
          <i class="fas fa-trash-alt"></i> Reset Geral (Limpar Banco/Setup)
        </button>
      </div>
      <h1>🧪 Teste de Conexão - Backend API</h1>

      <!-- Health Check -->
      <div class="test-section">
        <h2>1. Health Check</h2>
        <button (click)="testHealth()" class="btn-test">
          Testar Conexão
        </button>
        
        @if (healthStatus()) {
          <div class="result success">
            <h3>✅ Backend Conectado!</h3>
            <pre>{{ healthStatus() | json }}</pre>
          </div>
        }
        
        @if (healthError()) {
          <div class="result error">
            <h3>❌ Erro de Conexão</h3>
            <p>{{ healthError() }}</p>
            <p class="hint">Certifique-se de que o backend está rodando em http://localhost:3003</p>
          </div>
        }
      </div>

      <!-- Estatísticas -->
      <div class="test-section">
        <h2>2. Estatísticas do Banco</h2>
        <button (click)="testStats()" class="btn-test">
          Obter Estatísticas
        </button>
        
        @if (stats()) {
          <div class="result success">
            <h3>📊 Dados do Banco:</h3>
            <ul>
              <li>🌍 Países: {{ stats()?.countries }}</li>
              <li>⚽ Times: {{ stats()?.teams }}</li>
              <li>👤 Jogadores: {{ stats()?.players }}</li>
              <li>📸 Snapshots: {{ stats()?.snapshots }}</li>
              <li>🏆 Partidas: {{ stats()?.matches }}</li>
            </ul>
          </div>
        }
      </div>

      <!-- Snapshots -->
      <div class="test-section">
        <h2>3. Snapshots</h2>
        <button (click)="testSnapshots()" class="btn-test">
          Listar Snapshots
        </button>
        
        @if (snapshots()) {
          <div class="result success">
            <h3>📸 Snapshots Disponíveis:</h3>
            @if (snapshots()!.length === 0) {
              <p>Nenhum snapshot encontrado</p>
            } @else {
              <ul>
                @for (snapshot of snapshots(); track snapshot.season) {
                  <li>
                    Temporada {{ snapshot.season }} 
                    ({{ snapshot.type }}, {{ snapshot.sizeMB }}MB)
                  </li>
                }
              </ul>
            }
          </div>
        }
      </div>

      <!-- Schema Version -->
      <div class="test-section">
        <h2>4. Versão do Schema</h2>
        <button (click)="testSchema()" class="btn-test">
          Verificar Schema
        </button>
        
        @if (schemaVersion()) {
          <div class="result success">
            <h3>📦 Schema:</h3>
            <p>Versão atual: <strong>{{ schemaVersion()?.currentVersion }}</strong></p>
            <h4>Migrations aplicadas:</h4>
            <ul>
              @for (migration of schemaVersion()?.migrations; track migration.version) {
                <li>
                  v{{ migration.version }}: {{ migration.description }}
                  <small>({{ migration.applied_at }})</small>
                </li>
              }
            </ul>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .header-actions {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2rem;
      gap: 1rem;
    }

    .btn-back {
      background: rgba(255, 255, 255, 0.05);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 700;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateX(-5px);
    }

    .btn-danger {
      background: rgba(220, 38, 38, 0.1);
      color: #f87171;
      border: 1px solid rgba(220, 38, 38, 0.2);
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 700;
      transition: all 0.2s;
    }

    .btn-danger:hover {
      background: #dc2626;
      color: white;
    }

    .api-test-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      color: #f1f5f9;
    }

    h1 {
      font-weight: 900;
      font-size: 2.5rem;
      background: linear-gradient(to right, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 2rem;
      text-transform: uppercase;
      letter-spacing: -0.025em;
    }

    .test-section {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      transition: transform 0.2s ease;
    }

    .test-section:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2);
    }

    h2 {
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 0;
      margin-bottom: 1.5rem;
      display: flex;
      items-center;
      gap: 0.5rem;
    }

    .btn-test {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.875rem 2rem;
      border-radius: 12px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 700;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }

    .btn-test:hover {
      transform: scale(1.02);
      box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }

    .result {
      margin-top: 1.5rem;
      padding: 1.5rem;
      border-radius: 16px;
      font-size: 0.95rem;
    }

    .result.success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
    }

    .result.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .result h3 {
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 1rem;
      color: inherit;
    }

    pre {
      background: #020617;
      color: #10b981;
      padding: 1.25rem;
      border-radius: 12px;
      overflow-x: auto;
      font-size: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-family: 'Fira Code', monospace;
    }

    ul {
      list-style: none;
      padding: 0;
    }

    li {
      padding: 0.875rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    li:last-child {
      border-bottom: none;
    }

    strong {
      color: #f8fafc;
    }

    small {
      color: #64748b;
      font-family: monospace;
    }

    .hint {
      color: #f87171;
      font-weight: 600;
      margin-top: 0.75rem;
      font-size: 0.85rem;
    }
  `]
})
export class ApiTestComponent implements OnInit {
  private apiService = inject(ApiService);

  healthStatus = signal<HealthResponse | null>(null);
  healthError = signal<string | null>(null);
  stats = signal<StatsResponse | null>(null);
  snapshots = signal<any[] | null>(null);
  schemaVersion = signal<any>(null);

  ngOnInit() {
    // Testar conexão automaticamente ao carregar
    this.testHealth();
  }

  testHealth() {
    this.healthError.set(null);
    this.apiService.healthCheck().subscribe({
      next: (response) => {
        this.healthStatus.set(response);
        console.log('✅ Backend conectado:', response);
      },
      error: (error) => {
        this.healthError.set(error.message || 'Erro ao conectar com o backend');
        console.error('❌ Erro de conexão:', error);
      }
    });
  }

  testStats() {
    this.apiService.getStats().subscribe({
      next: (response) => {
        this.stats.set(response);
        console.log('📊 Estatísticas:', response);
      },
      error: (error) => {
        console.error('❌ Erro ao obter estatísticas:', error);
      }
    });
  }

  testSnapshots() {
    this.apiService.listSnapshots().subscribe({
      next: (response) => {
        this.snapshots.set(response.snapshots);
        console.log('📸 Snapshots:', response);
      },
      error: (error) => {
        console.error('❌ Erro ao listar snapshots:', error);
      }
    });
  }

  testSchema() {
    this.apiService.getSchemaVersion().subscribe({
      next: (response) => {
        this.schemaVersion.set(response);
        console.log('📦 Schema:', response);
      },
      error: (error) => {
        console.error('❌ Erro ao obter schema:', error);
      }
    });
  }

  goHome() {
    if ((window as any).appComponent) {
      (window as any).appComponent.view.set('main_menu');
    }
  }

  resetGame() {
    if (confirm('⚠️ ATENÇÃO: Isso vai apagar o setup local e voltar para o MENU inicial. Deseja continuar?')) {
      localStorage.clear();
      if ((window as any).appComponent) {
        (window as any).appComponent.isSetupComplete.set(false);
        (window as any).appComponent.view.set('main_menu');
      }
      window.location.reload();
    }
  }
}
