import { Component, ChangeDetectionStrategy, inject, signal, computed, AfterViewInit, ElementRef, viewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniverseService } from '../../services/universe.service';
import { Player, Team, Trophy, H2HData } from '../../models';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';
import { CurrencyShortPipe } from '../../pipes/currency-short.pipe';

declare var d3: any;

type ComparisonType = 'teams' | 'players';
type Item = Team | Player | (Player & { teamName: string }) | null;

@Component({
  selector: 'app-analysis-center',
  standalone: true,
  imports: [CommonModule, FormsModule, OverallColorPipe, CurrencyShortPipe],
  templateUrl: './analysis-center.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisCenterComponent implements OnChanges {
  universeService = inject(UniverseService);

  comparisonType = signal<ComparisonType>('teams');
  itemA = signal<Item>(null);
  itemB = signal<Item>(null);
  selectedTeamAId = signal<string | null>(null);
  selectedTeamBId = signal<string | null>(null);
  selectedPlayerAId = signal<string | null>(null);
  selectedPlayerBId = signal<string | null>(null);

  chartContainerA = viewChild<ElementRef>('chartA');
  chartContainerB = viewChild<ElementRef>('chartB');

  allTeams = computed(() => this.universeService.teams().filter(t => t.countryId !== 'AAA' && t.countryId !== 'BBB').sort((a,b) => a.teamName.localeCompare(b.teamName)));
  
  allPlayersWithTeams = computed(() => {
    return this.allTeams().flatMap(team => 
      team.players.map(player => ({...player, teamName: team.teamName}))
    ).sort((a,b) => a.name.localeCompare(b.name));
  });

  h2hData = computed<H2HData | null>(() => {
    const a = this.itemA();
    const b = this.itemB();
    if (this.comparisonType() === 'teams' && a && b && 'players' in a && 'players' in b) {
      return this.universeService.getHeadToHead(a.id, b.id);
    }
    return null;
  });

  playerAStats = computed(() => this.getPlayerCareerStats(this.itemA() as Player));
  playerBStats = computed(() => this.getPlayerCareerStats(this.itemB() as Player));
  
  ngOnChanges(changes: SimpleChanges): void {
      this.drawRadarCharts();
  }

  onComparisonTypeChange(type: ComparisonType) {
    this.comparisonType.set(type);
    this.resetSelections();
  }

  onItemAChange(event: Event) {
    const id = (event.target as HTMLSelectElement).value;
    if (this.comparisonType() === 'teams') {
      this.selectedTeamAId.set(id);
      this.itemA.set(this.allTeams().find(t => t.id === id) || null);
    } else {
      this.selectedPlayerAId.set(id);
      this.itemA.set(this.allPlayersWithTeams().find(p => p.id === id) || null);
    }
    setTimeout(() => this.drawRadarCharts(), 0);
  }

  onItemBChange(event: Event) {
    const id = (event.target as HTMLSelectElement).value;
    if (this.comparisonType() === 'teams') {
      this.selectedTeamBId.set(id);
      this.itemB.set(this.allTeams().find(t => t.id === id) || null);
    } else {
      this.selectedPlayerBId.set(id);
      this.itemB.set(this.allPlayersWithTeams().find(p => p.id === id) || null);
    }
    setTimeout(() => this.drawRadarCharts(), 0);
  }

  resetSelections() {
    this.itemA.set(null);
    this.itemB.set(null);
    this.selectedTeamAId.set(null);
    this.selectedTeamBId.set(null);
    this.selectedPlayerAId.set(null);
    this.selectedPlayerBId.set(null);
  }

  getTrophyCount(team: Team, type: Trophy['type']): number {
    if (!team.trophies) return 0;
    return team.trophies.filter(t => t.type === type).reduce((sum, t) => sum + t.count, 0);
  }

  getTotalMarketValue(team: Team): number {
    return team.players.reduce((sum, p) => sum + p.marketValue, 0);
  }

  private getPlayerCareerStats(player: Player | null) {
    if (!player) return { matchesPlayed: 0, goals: 0, assists: 0, motm: 0 };
    return this.universeService.getPlayerHistory(player.id).totalCareerStats;
  }
  
  private drawRadarCharts() {
    if (this.comparisonType() !== 'players') {
      const containerA = this.chartContainerA()?.nativeElement;
      const containerB = this.chartContainerB()?.nativeElement;
      if (containerA) d3.select(containerA).select('svg').remove();
      if (containerB) d3.select(containerB).select('svg').remove();
      return;
    };

    if (this.itemA() && this.chartContainerA()) {
      this.drawRadarChart(this.chartContainerA()!.nativeElement, this.itemA() as Player, this.playerAStats());
    }
    if (this.itemB() && this.chartContainerB()) {
      this.drawRadarChart(this.chartContainerB()!.nativeElement, this.itemB() as Player, this.playerBStats());
    }
  }

  private drawRadarChart(container: HTMLElement, player: Player, stats: any) {
    d3.select(container).select('svg').remove();
    if (!player) return;

    const maxValues = {
      matchesPlayed: 1000,
      goals: 1000,
      assists: 1000,
      motm: 200,
    };

    const data = [
      { axis: "Overall", value: player.overall / 100 },
      { axis: "Jogos", value: Math.min((stats.matchesPlayed || 0) / maxValues.matchesPlayed, 1) },
      { axis: "Gols", value: Math.min((stats.goals || 0) / maxValues.goals, 1) },
      { axis: "Assist.", value: Math.min((stats.assists || 0) / maxValues.assists, 1) },
      { axis: "MVPs", value: Math.min((stats.motm || 0) / maxValues.motm, 1) }
    ];

    const width = 200, height = 200;
    const margin = { top: 30, right: 30, bottom: 30, left: 30 };
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${width/2 + margin.left}, ${height/2 + margin.top})`);

    const angleSlice = Math.PI * 2 / data.length;
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 1]);

    const axisGrid = svg.append("g").attr("class", "axisWrapper");
    axisGrid.selectAll(".levels")
      .data(d3.range(1, 6).reverse())
      .enter()
      .append("circle")
      .attr("class", "gridCircle")
      .attr("r", (d: any) => radius / 5 * d)
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
      .attr("x2", (d: any, i: number) => rScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (d: any, i: number) => rScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("class", "line")
      .style("stroke", "#4b5563")
      .style("stroke-width", "1px");

    axis.append("text")
      .attr("class", "legend")
      .style("font-size", "11px")
      .attr("text-anchor", "middle")
      .style("fill", "#d1d5db")
      .attr("dy", "0.35em")
      .attr("x", (d: any, i: number) => rScale(1.25) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (d: any, i: number) => rScale(1.25) * Math.sin(angleSlice * i - Math.PI / 2))
      .text((d: any) => d.axis);

    const radarLine = d3.lineRadial()
      .curve(d3.curveLinearClosed)
      .radius((d: any) => rScale(d.value))
      .angle((d: any, i: number) => i * angleSlice);

    svg.append("path")
      .datum(data)
      .attr("class", "radarArea")
      .attr("d", radarLine)
      .style("fill", "#6366f1")
      .style("fill-opacity", 0.6);

    svg.append("path")
      .datum(data)
      .attr("class", "radarStroke")
      .attr("d", radarLine)
      .style("fill", "none")
      .style("stroke", "#818cf8")
      .style("stroke-width", "2px");
  }
}