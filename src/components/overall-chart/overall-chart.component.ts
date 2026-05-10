import { Component, ChangeDetectionStrategy, input, ElementRef, viewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var d3: any;

@Component({
  selector: 'app-overall-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div #chartContainer class="w-full h-64 text-xs"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverallChartComponent implements AfterViewInit, OnChanges {
  history = input.required<{ season: number; overall: number }[]>();
  chartContainer = viewChild<ElementRef<HTMLDivElement>>('chartContainer');

  ngAfterViewInit(): void {
    // A small delay to ensure the container has its final dimensions
    setTimeout(() => this.drawChart(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['history'] && this.chartContainer()) {
      this.drawChart();
    }
  }

  private drawChart(): void {
    const data = this.history();
    const container = this.chartContainer()?.nativeElement;

    if (!data || data.length < 2 || !container) {
        if(container) {
          container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Dados de temporadas insuficientes para exibir o gráfico.</div>';
        }
        return;
    }

    d3.select(container).select('svg').remove();

    const margin = { top: 30, right: 30, bottom: 30, left: 40 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const svg = d3.select(container)
      .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add X axis
    const x = d3.scalePoint()
      .domain(data.map(d => d.season.toString()))
      .range([0, width])
      .padding(0.5);
    svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
      .call((g: any) => g.select(".domain").remove())
      .selectAll("text")
        .style("fill", "#9ca3af"); // text-gray-400

    // Add Y axis
    const yDomain = d3.extent(data, (d: { season: number; overall: number }) => d.overall) as [number, number];
    const y = d3.scaleLinear()
      .domain([Math.max(40, yDomain[0] - 5), Math.min(100, yDomain[1] + 5)])
      .range([height, 0]);
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(10))
      .call((g: any) => g.select(".domain").remove())
      .selectAll("text")
        .style("fill", "#9ca3af");

    // Add gridlines
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(-height).tickFormat(() => ''))
        .selectAll("line")
        .style("stroke", "#374151") // gray-700
        .style("stroke-opacity", "0.5");

    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''))
        .selectAll("line")
        .style("stroke", "#374151") // gray-700
        .style("stroke-opacity", "0.5");

    // Add the line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#818cf8') // indigo-400
      .attr('stroke-width', 2.5)
      .attr('d', d3.line()
        .x((d: { season: number; overall: number }) => x(d.season.toString())!)
        .y((d: { season: number; overall: number }) => y(d.overall))
        .curve(d3.curveMonotoneX)
      );
      
    // Add the points
    svg.selectAll("myCircles")
      .data(data)
      .join("circle")
        .attr("fill", "#6366f1") // indigo-500
        .attr("stroke", "#1f2937") // gray-800
        .attr("stroke-width", 2)
        .attr("cx", (d: { season: number; overall: number }) => x(d.season.toString())!)
        .attr("cy", (d: { season: number; overall: number }) => y(d.overall))
        .attr("r", 5);

    // Add the text labels
    svg.selectAll("myLabels")
      .data(data)
      .join("text")
        .attr("x", (d: { season: number; overall: number }) => x(d.season.toString())!)
        .attr("y", (d: { season: number; overall: number }) => y(d.overall) - 12)
        .text((d: { season: number; overall: number }) => d.overall)
        .attr("text-anchor", "middle")
        .style("fill", "#d1d5db") // gray-300
        .style("font-size", "12px")
        .style("font-weight", "bold");
  }
}