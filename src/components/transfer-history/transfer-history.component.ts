import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniverseService } from '../../services/universe.service';
import { TransferRecord } from '../../models';
import { NATIONALITIES } from '../../nationalities.data';

@Component({
  selector: 'app-transfer-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-7xl mx-auto py-8 px-4 animate-in fade-in duration-500">

      <!-- Header -->
      <div class="relative mb-10 text-center">
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-96 h-32 bg-amber-500/10 blur-[80px] rounded-full"></div>
        </div>
        <div class="relative z-10">
          <div class="inline-flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-full px-5 py-2 mb-4">
            <i class="fas fa-exchange-alt text-amber-400 text-sm"></i>
            <span class="text-amber-300 text-xs font-black uppercase tracking-widest">Arquivo Oficial</span>
          </div>
          <h2 class="text-5xl font-black text-white tracking-tight">
            Histórico de <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Transferências</span>
          </h2>
          <p class="text-gray-400 mt-2 text-sm">Todos os movimentos do mercado ao longo das temporadas.</p>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col items-center">
          <span class="text-3xl font-black text-white">{{ totalTransfers() }}</span>
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Total de Transfers</span>
        </div>
        <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col items-center">
          <span class="text-3xl font-black text-amber-400">{{ availableSeasons().length }}</span>
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Temporadas</span>
        </div>
        <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col items-center">
          <span class="text-2xl font-black text-green-400">{{ formatFee(mostExpensiveTransfer()?.fee || 0) }}</span>
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Maior Valor</span>
        </div>
        <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col items-center">
          <span class="text-2xl font-black text-blue-400">{{ formatFee(totalVolume()) }}</span>
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Volume Total</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <!-- Season Filter -->
        <div class="flex items-center gap-2 flex-1 flex-wrap">
          <button (click)="selectedSeason.set(null)"
            class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            [class]="selectedSeason() === null
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'">
            Todas
          </button>
          @for (season of availableSeasons(); track season) {
            <button (click)="selectedSeason.set(season)"
              class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              [class]="selectedSeason() === season
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'">
              T{{ season }}
            </button>
          }
        </div>

        <!-- Search -->
        <div class="relative min-w-[220px]">
          <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm"></i>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Buscar jogador ou clube..."
            class="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-all">
        </div>

        <!-- Sort -->
        <select
          [ngModel]="sortBy()"
          (ngModelChange)="sortBy.set($event)"
          class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none min-w-[160px]">
          <option value="fee_desc">Maior Valor</option>
          <option value="fee_asc">Menor Valor</option>
          <option value="season_desc">Temporada (recente)</option>
          <option value="season_asc">Temporada (antiga)</option>
          <option value="overall_desc">Maior Overall</option>
        </select>
      </div>

      <!-- Table -->
      <div class="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">

        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-2 px-6 py-4 bg-white/[0.04] border-b border-white/5">
          <div class="col-span-1 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">T.</div>
          <div class="col-span-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Jogador</div>
          <div class="col-span-1 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center hidden sm:block">OVR</div>
          <div class="col-span-2 text-[10px] font-black text-gray-500 uppercase tracking-widest hidden md:block">De</div>
          <div class="col-span-2 text-[10px] font-black text-gray-500 uppercase tracking-widest hidden md:block">Para</div>
          <div class="col-span-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Valor</div>
        </div>

        <!-- Empty State -->
        @if (filteredTransfers().length === 0) {
          <div class="py-20 flex flex-col items-center justify-center bg-white/[0.01]">
            <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <i class="fas fa-exchange-alt text-3xl text-gray-700"></i>
            </div>
            <p class="text-gray-500 font-bold">Nenhuma transferência encontrada.</p>
            <p class="text-gray-700 text-sm mt-1">Tente ajustar os filtros.</p>
          </div>
        }

        <!-- Rows -->
        <div class="divide-y divide-white/5">
          @for (transfer of paginatedTransfers(); track $index) {
            <div class="grid grid-cols-12 gap-2 px-6 py-4 items-center hover:bg-white/[0.03] transition-colors group">

              <!-- Season Badge -->
              <div class="col-span-1 flex justify-center">
                <span class="text-[11px] font-black text-amber-400/70 bg-amber-500/10 rounded-lg px-2 py-1 tabular-nums">
                  {{ transfer.season }}
                </span>
              </div>

              <!-- Player Name -->
              <div class="col-span-3">
                <div class="flex items-center gap-2">
                  @if (transfer.playerNationalityId) {
                    <img [src]="getFlagUrl(transfer.playerNationalityId)" class="w-5 h-auto rounded-sm opacity-80 flex-shrink-0" [title]="transfer.playerNationalityId">
                  }
                  <p class="font-bold text-white text-sm truncate group-hover:text-amber-300 transition-colors">
                    {{ transfer.playerName }}
                  </p>
                </div>
              </div>

              <!-- OVR -->
              <div class="col-span-1 hidden sm:flex justify-center">
                <span class="text-sm font-black px-2 py-1 rounded-lg"
                  [class]="getOvrClass(transfer.playerOverall)">
                  {{ transfer.playerOverall || '—' }}
                </span>
              </div>

              <!-- From Team -->
              <div class="col-span-2 hidden md:block">
                <div class="flex items-center gap-2">
                  @if (transfer.fromTeamCountryId) {
                    <img [src]="getFlagUrl(transfer.fromTeamCountryId)" class="w-5 h-auto rounded-sm opacity-80 flex-shrink-0" [title]="transfer.fromTeamCountryId">
                  } @else {
                    <div class="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0"></div>
                  }
                  <p class="text-sm text-gray-300 truncate">{{ transfer.fromTeamName || 'Livre' }}</p>
                </div>
              </div>

              <!-- To Team -->
              <div class="col-span-2 hidden md:block">
                <div class="flex items-center gap-2">
                  @if (transfer.toTeamCountryId) {
                    <img [src]="getFlagUrl(transfer.toTeamCountryId)" class="w-5 h-auto rounded-sm opacity-80 flex-shrink-0" [title]="transfer.toTeamCountryId">
                  } @else {
                    <div class="w-1.5 h-1.5 rounded-full bg-green-500/60 flex-shrink-0"></div>
                  }
                  <p class="text-sm text-white font-semibold truncate">{{ transfer.toTeamName }}</p>
                </div>
              </div>

              <!-- Fee -->
              <div class="col-span-3 flex justify-end">
                @if (!transfer.fee || transfer.fee === 0) {
                  <span class="text-xs font-bold text-gray-500 bg-white/5 border border-white/10 px-3 py-1 rounded-full">Livre</span>
                } @else {
                  <span class="text-sm font-black text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full tabular-nums">
                    {{ formatFee(transfer.fee) }}
                  </span>
                }
              </div>

            </div>
          }
        </div>

        <!-- Pagination / Load More -->
        @if (filteredTransfers().length > pageSize()) {
          <div class="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
            <span class="text-xs text-gray-500">
              Exibindo {{ paginatedTransfers().length }} de {{ filteredTransfers().length }} transferências
            </span>
            @if (paginatedTransfers().length < filteredTransfers().length) {
              <button (click)="pageSize.set(pageSize() + 50)"
                class="px-5 py-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-xs font-black text-gray-400 hover:text-amber-300 transition-all uppercase tracking-widest">
                Carregar mais
              </button>
            }
          </div>
        }
      </div>

    </div>
  `
})
export class TransferHistoryComponent implements OnInit {
  private universeService = inject(UniverseService);

  selectedSeason = signal<number | null>(null);
  searchQuery = signal('');
  sortBy = signal<'fee_desc' | 'fee_asc' | 'season_desc' | 'season_asc' | 'overall_desc'>('season_desc');
  pageSize = signal(50);

  ngOnInit() {
    // reset filters on open
    this.selectedSeason.set(null);
    this.searchQuery.set('');
    this.pageSize.set(50);
  }

  allTransfers = computed<TransferRecord[]>(() => {
    return this.universeService.transferHistory() || [];
  });

  availableSeasons = computed<number[]>(() => {
    const seasons = [...new Set(this.allTransfers().map(t => t.season))];
    return seasons.sort((a, b) => b - a);
  });

  totalTransfers = computed(() => this.allTransfers().length);

  mostExpensiveTransfer = computed<TransferRecord | null>(() => {
    const transfers = this.allTransfers();
    if (!transfers.length) return null;
    return transfers.reduce((max, t) => (t.fee > max.fee ? t : max), transfers[0]);
  });

  totalVolume = computed(() => {
    return this.allTransfers().reduce((sum, t) => sum + (t.fee || 0), 0);
  });

  filteredTransfers = computed<TransferRecord[]>(() => {
    let list = [...this.allTransfers()];

    // Season filter
    const season = this.selectedSeason();
    if (season !== null) {
      list = list.filter(t => t.season === season);
    }

    // Search filter
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(t =>
        t.playerName?.toLowerCase().includes(q) ||
        t.fromTeamName?.toLowerCase().includes(q) ||
        t.toTeamName?.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (this.sortBy()) {
      case 'fee_desc':    list.sort((a, b) => (b.fee || 0) - (a.fee || 0)); break;
      case 'fee_asc':     list.sort((a, b) => (a.fee || 0) - (b.fee || 0)); break;
      case 'season_desc': list.sort((a, b) => b.season - a.season); break;
      case 'season_asc':  list.sort((a, b) => a.season - b.season); break;
      case 'overall_desc':list.sort((a, b) => (b.playerOverall || 0) - (a.playerOverall || 0)); break;
    }

    return list;
  });

  paginatedTransfers = computed<TransferRecord[]>(() => {
    return this.filteredTransfers().slice(0, this.pageSize());
  });

  formatFee(fee: number): string {
    if (!fee || fee === 0) return 'Livre';
    if (fee >= 1_000_000) return `€${(fee / 1_000_000).toFixed(1)}M`;
    if (fee >= 1_000) return `€${(fee / 1_000).toFixed(0)}K`;
    return `€${fee}`;
  }

  getOvrClass(ovr: number): string {
    if (!ovr) return 'text-gray-500 bg-white/5';
    if (ovr >= 90) return 'text-yellow-300 bg-yellow-500/20';
    if (ovr >= 80) return 'text-green-300 bg-green-500/20';
    if (ovr >= 70) return 'text-blue-300 bg-blue-500/20';
    return 'text-gray-400 bg-white/5';
  }

  private nationalityMap = new Map<string, string>(
    NATIONALITIES.map(n => [n.code3.toUpperCase(), n.code2])
  );

  getFlagUrl(countryId: string): string {
    if (!countryId) return '';
    const code2 = this.nationalityMap.get(countryId.toUpperCase());
    if (code2) return `https://flagcdn.com/w40/${code2.toLowerCase()}.png`;
    return '';
  }
}
