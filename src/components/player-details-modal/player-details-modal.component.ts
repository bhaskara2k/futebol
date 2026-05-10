import { Component, ChangeDetectionStrategy, input, output, EventEmitter, signal, inject, OnInit, computed, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Player, Team, Trophy } from '../../models';
import { UniverseService } from '../../services/universe.service';
import { CurrencyShortPipe } from '../../pipes/currency-short.pipe';
import { NATIONALITIES } from '../../nationalities.data';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';
import { OverallChartComponent } from '../overall-chart/overall-chart.component';

declare var d3: any;

interface PlayerHistory {
  careerStats: Player['careerStats'];
  totalCareerStats: { matchesPlayed: number; goals: number; assists: number; motm: number; };
  trophies: Map<string, { wins: { season: number; teamName: string }[] }>;
  individualAwards: { season: number; award: string; competition: string; teamName: string; }[];
  clubHistory: { season: number; teamName: string; }[];
  overallHistory: Player['overallHistory'];
}

@Component({
  selector: 'app-player-details-modal',
  imports: [CommonModule, ReactiveFormsModule, OverallColorPipe, OverallChartComponent],
  templateUrl: './player-details-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.escape)': 'onClose()',
  },
})
export class PlayerDetailsModalComponent implements OnInit {
  playerData = input.required<{ player: Player; team: Team }>();
  closeModal = output<void>();
  savePlayerDetails = output<{ player: Player; teamId: string }>();
  saveNationalTeamNumber = output<{ playerId: string, clubTeamId: string, newNumber: number }>();
  renewContract = output<{ player: Player, teamId: string, newLength: number }>();
  terminateContract = output<{ player: Player, teamId: string }>();
  retirePlayer = output<{ player: Player, teamId: string }>();

  private fb: FormBuilder = inject(FormBuilder);
  universeService = inject(UniverseService);

  activeTab = signal<'overview' | 'details' | 'history' | 'overall'>('overview');
  isRenewing = signal(false);
  confirmingAction = signal<'terminate' | 'retire' | null>(null);
  playerForm!: FormGroup;
  renewalForm!: FormGroup;
  playerHistory = signal<PlayerHistory | null>(null);
  nationalities = [...NATIONALITIES].sort((a, b) => a.name.localeCompare(b.name));

  chartData = signal<{ season: number; overall: number; }[]>([]);
  radarChartContainer = viewChild<ElementRef<HTMLDivElement>>('radarChart');

  isNationalTeamContext = computed(() => this.playerData().team.budget === 0);
  isGoalkeeper = computed(() => this.playerData().player.isGoalkeeper);

  keyAttributes = computed(() => {
    const { player } = this.playerData();
    return this.generateKeyAttributes(player, this.isGoalkeeper());
  });

  currentSeasonStats = computed(() => {
    const player = this.playerData().player;
    return {
      matchesPlayed: (player.stats?.matchesPlayed || 0) + (player.cupStats?.matchesPlayed || 0) + (player.internationalStats?.matchesPlayed || 0) + (player.worldCupStats?.matchesPlayed || 0) + (player.worldCupQualifierStats?.matchesPlayed || 0),
      goals: (player.stats?.goals || 0) + (player.cupStats?.goals || 0) + (player.internationalStats?.goals || 0) + (player.worldCupStats?.goals || 0) + (player.worldCupQualifierStats?.goals || 0),
      assists: (player.stats?.assists || 0) + (player.cupStats?.assists || 0) + (player.internationalStats?.assists || 0) + (player.worldCupStats?.assists || 0) + (player.worldCupQualifierStats?.assists || 0),
      motm: (player.stats?.motm || 0) + (player.cupStats?.motm || 0) + (player.internationalStats?.motm || 0) + (player.worldCupStats?.motm || 0) + (player.worldCupQualifierStats?.motm || 0)
    };
  });

  aggregatedQualifierStats = computed(() => {
    const history = this.playerHistory();
    const player = this.playerData().player;

    const historicalStats = { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };

    if (history && history.careerStats) {
      Object.keys(history.careerStats)
        .filter(key => key.startsWith('WC_Q_'))
        .forEach(key => {
          const stats = history.careerStats[key];
          historicalStats.matchesPlayed += stats.matchesPlayed;
          historicalStats.goals += stats.goals;
          historicalStats.assists += stats.assists;
          historicalStats.motm += stats.motm;
        });
    }

    // Also include current season's qualifier stats in the aggregate
    const currentStats = player.worldCupQualifierStats || { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };

    return {
      matchesPlayed: historicalStats.matchesPlayed + currentStats.matchesPlayed,
      goals: historicalStats.goals + currentStats.goals,
      assists: historicalStats.assists + currentStats.assists,
      motm: historicalStats.motm + currentStats.motm
    };
  });

  detailedTrophies = computed(() => {
    const history = this.playerHistory();
    if (!history || !history.trophies) return [];

    return Array.from(history.trophies.entries())
      .map(([name, data]) => ({
        name,
        wins: data.wins.sort((a, b) => b.season - a.season),
        count: data.wins.length,
        icon: this.getTrophyIcon(name),
        order: this.getTrophyOrder(name),
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  });

  trophyHighlight = computed(() => {
    const trophies = this.detailedTrophies();
    return trophies.length > 0 ? trophies[0] : null;
  });

  individualAwards = computed(() => {
    const history = this.playerHistory();
    if (!history || !history.individualAwards) return [];
    return history.individualAwards
      .map(award => ({
        ...award,
        icon: this.getTrophyIcon(award.award)
      }))
      .sort((a, b) => b.season - a.season);
  });

  clubHistory = computed(() => {
    const history = this.playerHistory();
    if (!history || !history.clubHistory) return [];
    return history.clubHistory.slice().sort((a, b) => a.season - b.season);
  });

  constructor() {
    effect(() => {
      const container = this.radarChartContainer();
      if (this.activeTab() === 'overview' && this.playerData() && container) {
        this.drawRadarChart(container.nativeElement, this.keyAttributes());
      }
    });
  }

  ngOnInit(): void {
    const player = this.playerData().player;
    const team = this.playerData().team;

    this.playerForm = this.fb.group({
      name: [player.name, Validators.required],
      isGoalkeeper: [player.isGoalkeeper],
      nationalityId: [player.nationalityId, [Validators.required]],
      marketValue: [player.marketValue / 1_000_000, [Validators.required, Validators.min(0)]],
      overall: [player.overall, [Validators.required, Validators.min(1), Validators.max(100)]],
      age: [player.age, [Validators.required, Validators.min(15), Validators.max(50)]],
      contractYears: [player.contractYears, [Validators.required, Validators.min(0), Validators.max(10)]],
    });

    if (this.isNationalTeamContext()) {
      this.playerForm.addControl('nationalTeamNumber', this.fb.control(
        // MODIFICAÇÃO AQUI: Garante que o número exibido é o número de clube se não houver override
        player.number,
        [Validators.required, Validators.min(1), Validators.max(99)]
      ));
    } else {
      this.playerForm.addControl('number', this.fb.control(
        player.number,
        [Validators.required, Validators.min(1), Validators.max(99)]
      ));
    }

    if (team.countryId === 'BBB') {
      this.playerForm.disable();
    }

    this.renewalForm = this.fb.group({
      newContractLength: [3, [Validators.required, Validators.min(1), Validators.max(5)]]
    });

    const history = this.universeService.getPlayerHistory(player.id);
    this.playerHistory.set(history as PlayerHistory);

    const currentOverallPoint = { season: this.universeService.season(), overall: player.overall };
    this.chartData.set([...history.overallHistory, currentOverallPoint]);
  }

  onSave(): void {
    if (this.playerForm.valid) {
      const formValues = this.playerForm.value;
      const originalPlayer = this.playerData().player;

      // --- LÓGICA MODIFICADA ---
      // Se for um contexto de seleção nacional e o número mudou, emita um evento separado
      if (this.isNationalTeamContext() && formValues.nationalTeamNumber !== originalPlayer.number) {
        this.saveNationalTeamNumber.emit({
          playerId: originalPlayer.id,
          clubTeamId: (originalPlayer as any).clubId,
          newNumber: formValues.nationalTeamNumber
        });
      }

      // Prossiga com a emissão de outros detalhes (exceto o número, nesse caso)
      const playerToSave: Player = JSON.parse(JSON.stringify(originalPlayer));

      playerToSave.name = formValues.name;
      playerToSave.isGoalkeeper = formValues.isGoalkeeper;
      playerToSave.nationalityId = formValues.nationalityId;
      playerToSave.marketValue = formValues.marketValue * 1_000_000;
      playerToSave.overall = formValues.overall;
      playerToSave.age = formValues.age;
      playerToSave.contractYears = formValues.contractYears;

      let teamIdToEmit = this.playerData().team.id;

      if (this.isNationalTeamContext()) {
        playerToSave.number = (originalPlayer as any).clubNumber; // Mantenha o número do clube
        teamIdToEmit = (originalPlayer as any).clubId;
      } else {
        playerToSave.number = formValues.number;
      }

      this.savePlayerDetails.emit({ player: playerToSave, teamId: teamIdToEmit });
    }
  }

  onStartRenewal(): void {
    this.confirmingAction.set(null);
    this.isRenewing.set(true);
  }

  onCancelRenewal(): void {
    this.isRenewing.set(false);
  }

  onConfirmRenewal(): void {
    if (this.renewalForm.invalid) return;
    this.renewContract.emit({
      player: this.playerData().player,
      teamId: this.playerData().team.id,
      newLength: this.renewalForm.value.newContractLength
    });
    this.isRenewing.set(false);
  }

  onTerminate(): void {
    this.isRenewing.set(false);
    this.confirmingAction.set('terminate');
  }

  onRetire(): void {
    this.isRenewing.set(false);
    this.confirmingAction.set('retire');
  }

  cancelAction(): void {
    this.confirmingAction.set(null);
  }

  confirmAction(): void {
    const action = this.confirmingAction();
    if (action === 'terminate') {
      this.terminateContract.emit({ player: this.playerData().player, teamId: this.playerData().team.id });
    } else if (action === 'retire') {
      this.retirePlayer.emit({ player: this.playerData().player, teamId: this.playerData().team.id });
    }
  }

  onClose(): void {
    this.closeModal.emit();
  }

  careerStatsAsArray(stats: Player['careerStats']): { country: string; data: any }[] {
    if (!stats) return [];
    return Object.keys(stats)
      .filter(key => !key.startsWith('WC_Q_')) // Filter out individual qualifiers
      .map(key => ({
        country: this.getCompetitionName(key),
        data: stats[key]
      })).sort((a, b) => b.data.matchesPlayed - a.data.matchesPlayed);
  }

  getCompetitionName(code: string): string {
    const intComp = this.universeService.internationalCompetitions().find(c => c.id === code);
    if (intComp) {
      return intComp.name;
    }
    if (this.universeService.CONTINENT_NAMES[code]) {
      return this.universeService.CONTINENT_NAMES[code];
    }
    return this.universeService.COUNTRY_NAMES[code] || code;
  }

  private generateKeyAttributes(player: Player, isGk: boolean): { axis: string, value: number }[] {
    const ovr = player.overall;
    const stat = (base: number, variance: number) => Math.round(Math.max(40, Math.min(99, ovr * base + (Math.random() - 0.5) * variance)));

    if (isGk) {
      return [
        { axis: "Reflexos", value: stat(1.05, 10) },
        { axis: "Agilidade", value: stat(0.95, 10) },
        { axis: "Posicion.", value: stat(1.0, 8) },
        { axis: "Mão a Mão", value: stat(1.02, 12) },
        { axis: "Distrib.", value: stat(0.90, 15) }
      ];
    } else {
      return [
        { axis: "Finaliz.", value: stat(1.05, 10) },
        { axis: "Drible", value: stat(1.02, 12) },
        { axis: "Passe", value: stat(0.98, 8) },
        { axis: "Defesa", value: stat(0.85, 15) },
        { axis: "Físico", value: stat(0.95, 10) }
      ];
    }
  }

  private drawRadarChart(container: HTMLElement, data: { axis: string, value: number }[]) {
    d3.select(container).select('svg').remove();

    const width = 280, height = 280;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;

    const svg = d3.select(container).append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const angleSlice = Math.PI * 2 / data.length;
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 100]);

    const axisGrid = svg.append("g").attr("class", "axisWrapper");
    axisGrid.selectAll(".levels")
      .data(d3.range(1, 6).reverse())
      .enter()
      .append("circle")
      .attr("r", (d: number) => radius / 5 * d)
      .style("fill", "#1f2937")
      .style("stroke", "#4b5563")
      .style("fill-opacity", 0.5);

    const axis = axisGrid.selectAll(".axis")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "axis");

    axis.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", (_: any, i: number) => rScale(100) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (_: any, i: number) => rScale(100) * Math.sin(angleSlice * i - Math.PI / 2))
      .style("stroke", "#4b5563").style("stroke-width", "1px");

    axis.append("text")
      .style("font-size", "11px").attr("text-anchor", "middle")
      .style("fill", "#d1d5db").attr("dy", "0.35em")
      .attr("x", (_: any, i: number) => rScale(115) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (_: any, i: number) => rScale(115) * Math.sin(angleSlice * i - Math.PI / 2))
      .text((d: any) => d.axis);

    const radarLine = d3.lineRadial()
      .curve(d3.curveCardinalClosed)
      .radius((d: any) => rScale(d.value))
      .angle((_: any, i: number) => i * angleSlice);

    svg.append("path")
      .datum(data)
      .attr("d", radarLine)
      .style("fill", "#6366f1").style("fill-opacity", 0.6);

    svg.append("path")
      .datum(data)
      .attr("d", radarLine)
      .style("fill", "none").style("stroke", "#818cf8").style("stroke-width", "2px");
  }

  getTrophyIcon(name: string): string {
    name = name.toLowerCase();
    if (name.includes('melhor do mundo')) return 'fa-globe';
    if (name.includes('artilheiro')) return 'fa-futbol';
    if (name.includes('assistente')) return 'fa-hands-helping';
    if (name.includes('melhor jogador')) return 'fa-star';
    if (name.includes('luva de ouro')) return 'fa-mitten';
    if (name.includes('revelação')) return 'fa-leaf';
    if (name.includes('seleção da temporada')) return 'fa-users';
    if (name.includes('champions') || name.includes('libertadores') || name.includes('copa do mundo')) return 'fa-trophy';
    return 'fa-shield-alt';
  }

  getTrophyOrder(name: string): number {
    name = name.toLowerCase();
    if (name.includes('copa do mundo')) return 1;
    if (name.includes('mundial de clubes')) return 2;
    if (name.includes('champions')) return 3;
    if (name.includes('libertadores')) return 4;
    if (name.includes('liga nacional')) return 5;
    if (name.includes('copa nacional')) return 6;
    return 99;
  }
}
