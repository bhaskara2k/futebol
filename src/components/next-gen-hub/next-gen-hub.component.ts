import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniverseService } from '../../services/universe.service';
import { Player, Team } from '../../models';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';

interface PlayerAttributes {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
}

@Component({
    selector: 'app-next-gen-hub',
    standalone: true,
    imports: [CommonModule, OverallColorPipe],
    templateUrl: './next-gen-hub.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextGenHubComponent {
    universeService = inject(UniverseService);
    viewPlayerDetails = output<{ player: Player, team: Team }>();
    back = output<void>();

    selectedPlayerId = signal<string | null>(null);

    nextGenPlayers = computed(() => {
        const list: { player: Player, team: Team, growth: number }[] = [];

        this.universeService.leagues().forEach(league => {
            league.divisions.forEach(div => {
                div.teams.forEach(team => {
                    team.players.forEach(p => {
                        if (p.age <= 21) {
                            const growth = this.calculateGrowth(p);
                            list.push({ player: p, team: team, growth });
                        }
                    });
                });
            });
        });

        // Sort by a combination of overall and growth potential
        return list.sort((a, b) => {
            const scoreA = a.player.overall + (a.growth * 2);
            const scoreB = b.player.overall + (b.growth * 2);
            return scoreB - scoreA;
        }).slice(0, 50); // Top 50 prospects
    });

    hotspots = computed(() => {
        const players = this.nextGenPlayers();
        const counts: { [key: string]: number } = {};
        players.forEach(p => {
            counts[p.player.nationalityId] = (counts[p.player.nationalityId] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([id, count]) => ({
                id,
                count,
                name: this.universeService.COUNTRY_NAMES[id] || id,
                percentage: (count / (players.length || 1)) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6); // Top 6 hotspots
    });

    selectedPlayerInfo = computed(() => {
        const players = this.nextGenPlayers();
        const id = this.selectedPlayerId();
        if (!id) return players[0] || null;
        return players.find(p => p.player.id === id) || players[0] || null;
    });

    playerAttributes = computed(() => {
        const info = this.selectedPlayerInfo();
        if (!info) return null;
        return this.generateAttributes(info.player);
    });

    private calculateGrowth(player: Player): number {
        if (!player.overallHistory || player.overallHistory.length === 0) {
            // Younger players have higher implicit growth if they are already good
            return Math.max(0, (21 - player.age) * 0.5);
        }
        const last = player.overallHistory[player.overallHistory.length - 1].overall;
        return player.overall - last;
    }

    private generateAttributes(player: Player): PlayerAttributes {
        // Generate deterministic attributes based on player ID and overall
        const seed = this.hashString(player.id);
        const base = player.overall;

        // Spread attributes based on position (if we had it) or just random jitter
        return {
            pace: this.clamp(base + (this.pseudoRandom(seed + 1) * 15 - 7)),
            shooting: this.clamp(base + (this.pseudoRandom(seed + 2) * 20 - 10)),
            passing: this.clamp(base + (this.pseudoRandom(seed + 3) * 15 - 7)),
            dribbling: this.clamp(base + (this.pseudoRandom(seed + 4) * 20 - 10)),
            defending: this.clamp(base + (this.pseudoRandom(seed + 5) * 25 - 15)),
            physical: this.clamp(base + (this.pseudoRandom(seed + 6) * 15 - 7))
        };
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    private pseudoRandom(seed: number): number {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    private clamp(val: number): number {
        return Math.max(40, Math.min(99, Math.round(val)));
    }

    selectPlayer(id: string) {
        this.selectedPlayerId.set(id);
    }

    onPlayerClick(player: Player, team: Team) {
        this.viewPlayerDetails.emit({ player, team });
    }

    getRadarPoints(attrs: PlayerAttributes): string {
        const size = 100;
        const center = size / 2;
        const radius = size * 0.4;

        const keys: (keyof PlayerAttributes)[] = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
        const points = keys.map((key, i) => {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const value = attrs[key] / 100;
            const x = center + radius * value * Math.cos(angle);
            const y = center + radius * value * Math.sin(angle);
            return `${x},${y}`;
        });

        return points.join(' ');
    }
}
