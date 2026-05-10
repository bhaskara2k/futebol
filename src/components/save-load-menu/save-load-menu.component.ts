import { Component, signal, inject, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SqlitePersistenceService } from '../../services/sqlite-persistence.service';
import { GameStateService } from '../../services/game-state.service';

@Component({
    selector: 'app-save-load-menu',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <!-- Backdrop with blur -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-xl" (click)="close()"></div>
      
      <div class="relative w-full max-w-5xl bg-[#0f172a]/95 rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        
        <!-- Premium Header -->
        <div class="relative p-8 md:p-12 overflow-hidden border-b border-white/5">
            <!-- Decorative background glow -->
            <div class="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full"></div>
            <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full"></div>

            <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <div class="flex items-center gap-3 mb-2">
                       <div class="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
                           <i class="fas fa-database text-white"></i>
                       </div>
                       <h2 class="text-3xl font-black text-white tracking-tighter uppercase italic">Gestão de <span class="text-purple-400">Dados</span></h2>
                   </div>
                   <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] ml-1">SQLite Persistence & Snapshot system</p>
                </div>

                <div class="flex items-center gap-6">
                    <button (click)="close()" 
                        class="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all group">
                        <i class="fas fa-times text-xl group-hover:rotate-90 transition-transform"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Tab Navigation -->
        <nav class="flex px-8 border-b border-white/5 bg-black/20">
            <button (click)="activeTab.set('save')"
                [class]="'flex items-center gap-3 px-8 py-5 text-sm font-black uppercase tracking-widest transition-all relative ' + (activeTab() === 'save' ? 'text-white' : 'text-gray-500 hover:text-gray-300')">
                <i class="fas fa-save" [class.text-purple-400]="activeTab() === 'save'"></i>
                Salvar Jogo
                @if (activeTab() === 'save') {
                    <div class="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                }
            </button>
            <button (click)="activeTab.set('load')"
                [class]="'flex items-center gap-3 px-8 py-5 text-sm font-black uppercase tracking-widest transition-all relative ' + (activeTab() === 'load' ? 'text-white' : 'text-gray-500 hover:text-gray-300')">
                <i class="fas fa-folder-open" [class.text-purple-400]="activeTab() === 'load'"></i>
                Carregar Jogo
                @if (activeTab() === 'load') {
                    <div class="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                }
            </button>
        </nav>

        <!-- Main Content (Scrollable) -->
        <div class="flex-grow overflow-y-auto p-8 md:p-12 custom-scrollbar">
            
            <!-- SAVE TAB CONTENT -->
            @if (activeTab() === 'save') {
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-left-5 duration-500">
                    
                    <!-- Left: New Save Input -->
                    <div class="lg:col-span-7 space-y-10">
                        <div class="space-y-6">
                            <div class="flex items-center gap-3">
                                <span class="w-8 h-px bg-purple-500/30"></span>
                                <h3 class="text-sm font-black text-gray-500 uppercase tracking-[0.4em]">Checkpoint Name</h3>
                            </div>
                            
                            <div class="relative group">
                                <input type="text" [ngModel]="newSaveName()" (ngModelChange)="newSaveName.set($event)"
                                    placeholder="Ex: Rumo ao Título Europeu"
                                    class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl font-bold text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all">
                                <div class="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors">
                                    <i class="fas fa-pen-nib"></i>
                                </div>
                            </div>
                            
                            <button (click)="createNewSave()"
                                class="w-full relative group overflow-hidden bg-purple-600 hover:bg-purple-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-purple-900/20">
                                <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer"></div>
                                <div class="relative flex items-center justify-center gap-3 uppercase tracking-widest">
                                    <span>Criar Snapshot Manual</span>
                                    <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                </div>
                            </button>
                        </div>
                    </div>

                    <!-- Right: Info Panel -->
                    <div class="lg:col-span-5">
                       <div class="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-6">
                           <h4 class="text-xs font-black text-gray-500 uppercase tracking-widest">Snapshot Info</h4>
                           
                           <div class="space-y-4">
                               <div class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                   <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                       <i class="fas fa-info-circle"></i>
                                   </div>
                                   <div>
                                       <p class="text-[10px] font-bold text-gray-500 uppercase">Tipo</p>
                                       <p class="text-sm font-bold text-white uppercase italic">Manual Snapshot</p>
                                   </div>
                               </div>

                               <div class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                   <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                                       <i class="fas fa-shield-alt"></i>
                                   </div>
                                   <div>
                                       <p class="text-[10px] font-bold text-gray-500 uppercase">Integridade</p>
                                       <p class="text-sm font-bold text-white uppercase italic">SQLite Transactional</p>
                                   </div>
                               </div>
                           </div>
                       </div>
                    </div>
                </div>
            }

            <!-- LOAD TAB CONTENT -->
            @if (activeTab() === 'load') {
                <div class="space-y-8 animate-in slide-in-from-right-5 duration-500">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-3">
                            <span class="w-8 h-px bg-purple-500/30"></span>
                            <h3 class="text-sm font-black text-gray-500 uppercase tracking-[0.4em]">Snapshots Disponíveis</h3>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        @for (save of snapshots(); track save.createdAt) {
                            <div class="relative group">
                                <div class="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl blur-xl"></div>
                                
                                <div class="relative bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/30 rounded-3xl p-6 transition-all duration-300">
                                    <div class="flex justify-between items-start mb-4">
                                        <div class="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 shadow-inner">
                                            <i class="fas fa-clock"></i>
                                        </div>
                                        <div class="flex gap-2">
                                            <button (click)="deleteSave(save.season, 'manual')" 
                                                class="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center">
                                                <i class="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="space-y-4">
                                        <div>
                                            <h4 class="text-lg font-black text-white italic truncate">{{ 'Temporada ' + save.season }}</h4>
                                            <p class="text-xs font-bold text-purple-400 uppercase tracking-widest mt-1">{{ save.type }}</p>
                                        </div>

                                        <div class="flex items-center gap-4 py-3 border-y border-white/5">
                                            <div>
                                                <p class="text-[9px] font-black text-gray-500 uppercase mb-1">Data</p>
                                                <p class="text-xs font-bold text-gray-300">{{ save.createdAt }}</p>
                                            </div>
                                            <div class="w-px h-6 bg-white/5"></div>
                                            <div>
                                                <p class="text-[9px] font-black text-gray-500 uppercase mb-1">Tamanho</p>
                                                <p class="text-xs font-bold text-gray-300">{{ save.sizeMB.toFixed(2) }} MB</p>
                                            </div>
                                        </div>

                                        <button (click)="loadSave(save.season)"
                                            class="w-full bg-white/10 hover:bg-purple-600 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs">
                                            Carregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        } @empty {
                            <div class="col-span-full py-20 flex flex-col items-center justify-center bg-white/2 rounded-[2rem] border border-dashed border-white/10">
                                <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-600 mb-4">
                                    <i class="fas fa-folder-open text-3xl"></i>
                                </div>
                                <h4 class="text-xl font-bold text-gray-500">Nenhum snapshot encontrado</h4>
                                <p class="text-gray-600 text-sm mt-2">Crie um novo checkpoint na aba "Salvar Jogo"</p>
                            </div>
                        }
                    </div>
                </div>
            }
        </div>
        
        <!-- Premium Footer -->
        <div class="p-8 bg-black/40 border-t border-white/5 flex justify-between items-center">
            <div class="flex items-center gap-4">
                 <div class="flex -space-x-3">
                     <div class="w-8 h-8 rounded-full bg-purple-600 border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold">SQL</div>
                     <div class="w-8 h-8 rounded-full bg-indigo-600 border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold">LIT</div>
                     <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold">E</div>
                 </div>
                 <p class="text-xs font-bold text-gray-500 italic">Advanced Data Persistence System v2.0</p>
            </div>
            
            <div class="flex items-center gap-8">
                <button (click)="gameStateService.downloadBackupJSON()" class="flex items-center gap-2 text-xs font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors">
                    <i class="fas fa-file-export"></i>
                    Exportar Backup JSON
                </button>
                
                <button (click)="fileInput.click()" class="flex items-center gap-2 text-xs font-black text-purple-400 hover:text-purple-300 uppercase tracking-widest transition-colors">
                    <i class="fas fa-file-import"></i>
                    Importar Backup JSON
                </button>
            </div>
            <input #fileInput type="file" (change)="onFileSelected($event)" accept=".json" class="hidden">
        </div>
      </div>
    </div>
  `,
    styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.2); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.4); }
  `]
})
export class SaveLoadMenuComponent implements OnInit {
    sqliteService = inject(SqlitePersistenceService);
    gameStateService = inject(GameStateService);

    activeTab = signal<'save' | 'load'>('save');
    newSaveName = signal('');
    snapshots = signal<any[]>([]);

    onClose = output<void>();
    onLoad = output<any>();
    onSaveRequest = output<string>();

    async ngOnInit() {
        await this.refreshSnapshots();
    }

    async refreshSnapshots() {
        const list = await this.sqliteService.listSnapshots();
        this.snapshots.set(list);
    }

    close() {
        this.onClose.emit();
    }

    async createNewSave() {
        const name = this.newSaveName() || `Save ${new Date().toLocaleString('pt-BR')}`;
        this.onSaveRequest.emit(name);
        this.newSaveName.set('');
        // Aguarda um pouco e atualiza a lista
        setTimeout(() => this.refreshSnapshots(), 2000);
    }

    async loadSave(season: number) {
        if (confirm(`Deseja carregar o snapshot da temporada ${season}? O estado atual será perdido.`)) {
            // No SQLite, o loading do estado ja restaura o universo TODO
            alert('Funcionalidade de restauração de snapshot via SQLite em desenvolvimento.');
            this.close();
        }
    }

    async deleteSave(season: number, type: 'auto' | 'manual') {
        if (confirm(`Tem certeza que deseja deletar este snapshot?`)) {
            try {
                await this.sqliteService.deleteSnapshot(season, type);
                await this.refreshSnapshots();
            } catch (error) {
                console.error('Erro ao deletar snapshot:', error);
            }
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                this.gameStateService.importBackupJSON(content);
                this.close();
            }
        };

        reader.readAsText(file);
        input.value = ''; // Reset input
    }
}
