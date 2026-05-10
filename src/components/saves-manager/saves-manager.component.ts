import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SaveSlot {
  id: string | number;
  name: string;
  season: number;
  team: string;
  updatedAt: string;
  sizeMB?: string;
}

@Component({
  selector: 'app-saves-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div class="w-full max-w-5xl max-h-[85vh] bg-[#0d0d12] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden flex flex-col animate-modal-in">
        
        <!-- Header Moderno -->
        <div class="relative p-8 border-b border-white/5">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-5">
              <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                <i class="fas fa-cloud text-2xl text-indigo-400"></i>
              </div>
              <div>
                <h2 class="text-2xl font-black text-white tracking-tight uppercase">Gerenciador de Universos</h2>
                <p class="text-gray-400 text-sm font-medium">Seus saves estão seguros na nuvem do Firebase</p>
              </div>
            </div>
            <button (click)="onClose.emit()" 
                    class="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all flex items-center justify-center border border-white/5">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          <!-- Seção de Criação -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div class="p-8 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl border border-white/5 relative group">
              <div class="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider">Novo Slot</div>
              
              <div class="flex flex-col gap-4">
                <input 
                  type="text" 
                  [(ngModel)]="newSaveName"
                  (keyup.enter)="onCreate.emit(newSaveName())"
                  placeholder="Ex: Minha Carreira 2026"
                  class="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all text-lg font-semibold"
                />
                <button 
                  (click)="onCreate.emit(newSaveName())"
                  [disabled]="!newSaveName().trim()"
                  class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-900/20">
                  <i class="fas fa-plus-circle"></i>
                  Criar Novo Universo
                </button>
              </div>
            </div>

            <!-- Card de Status do Save Ativo -->
            <div class="p-8 bg-white/2 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center">
              @if (activeId()) {
                @let activeSave = getActiveSave();
                @if (activeSave) {
                  <div class="mb-4">
                    <span class="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full uppercase border border-green-500/20">Ativo no momento</span>
                  </div>
                  <h3 class="text-xl font-bold text-white mb-1">{{ activeSave.name }}</h3>
                  <p class="text-sm text-gray-500 mb-5">Temporada {{ activeSave.season }}</p>
                  <button 
                    (click)="onUpdate.emit(activeId()!)"
                    class="px-8 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2">
                    <i class="fas fa-sync-alt"></i> Sobrescrever com Progresso Atual
                  </button>
                }
              } @else {
                <i class="fas fa-info-circle text-3xl text-gray-700 mb-3"></i>
                <p class="text-gray-500 text-sm max-w-[200px]">Carregue um save para habilitar o salvamento rápido.</p>
              }
            </div>
          </div>

          <div class="flex items-center gap-4 mb-8">
            <span class="text-xs font-black text-gray-600 uppercase tracking-[0.2em] whitespace-nowrap">Seus Slots de Universo</span>
            <div class="h-px w-full bg-white/5"></div>
          </div>

          <!-- Grid de Saves -->
          @if (isLoading()) {
            <div class="flex flex-col items-center justify-center py-20 gap-4">
              <div class="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p class="text-gray-500 font-medium">Sincronizando com Firebase...</p>
            </div>
          }
          @else if (saves().length === 0) {
            <div class="text-center py-20 bg-white/2 rounded-3xl border border-dashed border-white/10">
              <i class="fas fa-folder-open text-5xl text-gray-700 mb-4"></i>
              <h3 class="text-xl font-bold text-gray-400">Nenhum save encontrado</h3>
              <p class="text-gray-500 text-sm">Crie seu primeiro universo para começar a jogar.</p>
            </div>
          }
          @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
              @for (save of saves(); track save.id) {
                <div [class]="'relative p-6 rounded-2xl border transition-all ' + (activeId() === save.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.05)]' : 'bg-white/2 border-white/5 hover:border-white/20')">
                  
                  @if (activeId() === save.id) {
                    <div class="absolute -top-2 -right-2 px-2 py-1 bg-indigo-500 text-[8px] font-black text-white uppercase rounded shadow-lg z-10">ATIVO</div>
                  }

                  <div class="flex items-start justify-between mb-6">
                    <div>
                      <h3 class="text-lg font-bold text-white mb-1">{{ save.name }}</h3>
                      <div class="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase">
                        <span class="text-indigo-400">T{{ save.season }}</span>
                        <span class="w-1 h-1 bg-gray-700 rounded-full"></span>
                        <span>{{ formatDate(save.updatedAt) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <button 
                      (click)="onLoad.emit(save.id)"
                      class="py-3 bg-white text-black hover:bg-gray-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2">
                      <i class="fas fa-play"></i> Carregar
                    </button>
                    <div class="flex gap-2">
                       <button 
                        (click)="renameId.set(save.id); renameValue.set(save.name)"
                        class="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl border border-white/10 transition-all flex items-center justify-center"
                        title="Renomear">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button 
                        (click)="deleteId.set(save.id)"
                        class="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all flex items-center justify-center"
                        title="Deletar">
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Rename Input Overlay -->
                  @if (renameId() === save.id) {
                    <div class="absolute inset-0 bg-black/95 rounded-2xl p-4 flex flex-col gap-3 z-20 border border-indigo-500/50">
                      <p class="text-[10px] font-bold text-indigo-400 uppercase">Novo Nome</p>
                      <input 
                        type="text" 
                        [(ngModel)]="renameValue"
                        class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <div class="flex gap-2">
                        <button (click)="onRename.emit({ id: save.id, name: renameValue() }); renameId.set(null)" class="flex-1 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg">Confirmar</button>
                        <button (click)="renameId.set(null)" class="flex-1 py-2 bg-white/5 text-white text-[10px] font-bold rounded-lg">Cancelar</button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
          <div class="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
            <i class="fas fa-database text-indigo-500"></i>
            {{ saves().length }} Universos na Nuvem
          </div>
          <button 
            (click)="onClose.emit()"
            class="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-xl border border-white/10 transition-all">
            Fechar Gerenciador
          </button>
        </div>
      </div>

      <!-- Confirmação de Deleção Modernizada -->
      @if (deleteId()) {
        <div class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div class="bg-[#15151a] rounded-3xl p-8 max-w-sm border border-red-500/20 shadow-2xl text-center">
            <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Excluir Universo?</h3>
            <p class="text-gray-400 text-sm mb-8 leading-relaxed">
              Esta ação é irreversível. Todos os dados desta carreira serão removidos permanentemente.
            </p>
            <div class="flex gap-3">
              <button 
                (click)="deleteId.set(null)"
                class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
                Manter
              </button>
              <button 
                (click)="onDelete.emit(deleteId()!); deleteId.set(null)"
                class="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all">
                Excluir
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.3);
    }

    .animate-modal-in {
      animation: modalIn 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.95) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .animate-fade-in {
      animation: fadeIn 0.3s ease;
    }
  `]
})
export class SavesManagerComponent {
  saves = input.required<SaveSlot[]>();
  isLoading = input<boolean>(false);
  activeId = input<string | number | null>(null); // Recebe o id do save ativo do AppComponent

  onClose = output<void>();
  onCreate = output<string>();
  onLoad = output<string | number>();
  onUpdate = output<string | number>();
  onRename = output<{ id: string | number; name: string }>();
  onDelete = output<string | number>();

  newSaveName = signal('');
  renameId = signal<string | number | null>(null);
  renameValue = signal('');
  deleteId = signal<string | number | null>(null);

  getActiveSave() {
    return this.saves().find(s => s.id === this.activeId());
  }

  formatDate(dateStr: string): string {
    // Se já estiver formatado (contém '/'), apenas retorna
    if (dateStr.includes('/')) return dateStr;
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }
}
