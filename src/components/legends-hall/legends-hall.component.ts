import { Component, ChangeDetectionStrategy, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniverseService } from '../../services/universe.service';
import { Player, Team } from '../../models';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';

@Component({
    selector: 'app-legends-hall',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './legends-hall.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegendsHallComponent {
    universeService = inject(UniverseService);
    back = output<void>();
    viewPlayerDetails = output<{ player: Player, team: Team }>();

    retiredLegends = computed(() => {
        const retiredTeam = this.universeService.teams().find((t: Team) => t.countryId === 'BBB' || t.teamName === 'APOSENTADOS');
        if (!retiredTeam) return [];

        // Sort by peak overall and then by awards/stats
        return [...retiredTeam.players].sort((a, b) => {
            const peakA = this.getPeakOverall(a);
            const peakB = this.getPeakOverall(b);
            if (peakB !== peakA) return peakB - peakA;
            const bAwards = b.bestPlayerInTheWorldAwards || 0;
            const aAwards = a.bestPlayerInTheWorldAwards || 0;
            return bAwards - aAwards;
        });
    });

    getPeakOverall(player: Player): number {
        if (!player.overallHistory || player.overallHistory.length === 0) return player.overall;
        return Math.max(player.overall, ...player.overallHistory.map(h => h.overall));
    }

    getCareerGoals(player: Player): number {
        let goals = 0;
        if (player.careerStats) {
            Object.values(player.careerStats).forEach(s => goals += s.goals);
        }
        return goals;
    }

    getCareerMatches(player: Player): number {
        let matches = 0;
        if (player.careerStats) {
            Object.values(player.careerStats).forEach(s => matches += s.matchesPlayed);
        }
        return matches;
    }

    onPlayerClick(player: Player) {
        const retiredTeam = this.universeService.teams().find((t: Team) => t.countryId === 'BBB' || t.teamName === 'APOSENTADOS');
        if (retiredTeam) {
            this.viewPlayerDetails.emit({ player, team: retiredTeam });
        }
    }
}
