import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * 🌐 API SERVICE - Comunicação com Backend Node.js
 * 
 * Conecta o frontend Angular ao backend Express + SQLite
 */

const API_URL = 'http://localhost:3008/api';

export interface HealthResponse {
    status: string;
    database: string;
    version: number;
    timestamp: string;
}

export interface StatsResponse {
    countries: number;
    teams: number;
    players: number;
    snapshots: number;
    matches: number;
}

export interface SnapshotInfo {
    season: number;
    type: string;
    sizeMB: string;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);

    /**
     * Health check do backend
     */
    healthCheck(): Observable<HealthResponse> {
        return this.http.get<HealthResponse>(`${API_URL}/health`);
    }

    /**
     * Obter estatísticas do banco de dados
     */
    getStats(): Observable<StatsResponse> {
        return this.http.get<StatsResponse>(`${API_URL}/stats`);
    }

    /**
     * Listar snapshots disponíveis
     */
    listSnapshots(): Observable<{ snapshots: SnapshotInfo[] }> {
        return this.http.get<{ snapshots: SnapshotInfo[] }>(`${API_URL}/snapshots`);
    }

    /**
     * Obter versão do schema
     */
    getSchemaVersion(): Observable<any> {
        return this.http.get(`${API_URL}/schema/version`);
    }

    /**
     * Obter dados base (países, times, jogadores)
     */
    getBaseData(): Observable<any> {
        return this.http.get(`${API_URL}/base-data`);
    }

    /**
     * Salvar estado da temporada
     */
    saveSeason(season: number, teams: any[], leagues: any[], internationalCompetitions?: any[], countries?: any[], matches?: any[], transfers?: any[], awards?: any[], titles?: any[]): Observable<any> {
        // Higienização profunda para evitar referências circulares e excesso de dados
        const sanitizedTeams = teams.map(t => ({
            id: t.id,
            teamName: t.teamName,
            countryId: t.countryId,
            countryName: t.countryName,
            continent: t.continent,
            division: t.division,
            budget: t.budget,
            stats: t.stats,
            players: t.players?.map((p: any) => ({
                id: p.id,
                name: p.name,
                nationalityId: p.nationalityId,
                isGoalkeeper: p.isGoalkeeper,
                overall: p.overall,
                value: p.value,
                jerseyNumber: p.jerseyNumber,
                contractYears: p.contractYears,
                stats: p.stats
            }))
        }));

        return this.http.post(`${API_URL}/season/save`, {
            season,
            teams: sanitizedTeams,
            leagues: leagues?.map(l => ({ id: l.id, name: l.name, countryId: l.countryId, status: l.status })),
            internationalCompetitions,
            countries,
            matches: matches?.map(m => ({
                id: m.id,
                homeTeamId: m.homeTeamId,
                awayTeamId: m.awayTeamId,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                competitionName: m.competitionName,
                round_number: m.round_number || m.round_idx,
                homeScorers: m.homeScorers,
                awayScorers: m.awayScorers
            })),
            transfers,
            awards,
            titles
        });
    }

    /**
     * Carregar estado da temporada
     */
    loadSeason(season: number): Observable<any> {
        return this.http.get(`${API_URL}/season/${season}`);
    }

    /**
     * Criar snapshot
     */
    createSnapshot(season: number, type: 'auto' | 'manual', data: any, description?: string): Observable<any> {
        return this.http.post(`${API_URL}/snapshots`, {
            season,
            type,
            data,
            description
        });
    }

    /**
     * Obter última temporada salva
     */
    getLatestSeason(): Observable<{ season: number }> {
        return this.http.get<{ season: number }>(`${API_URL}/season/latest`);
    }

    /**
     * Deleta um snapshot
     */
    deleteSnapshot(season: number, type: string): Observable<any> {
        return this.http.delete(`${API_URL}/snapshots/${season}/${type}`);
    }

    // ============================================================================
    // MÉTODOS GENÉRICOS HTTP (para saves e outras operações)
    // ============================================================================

    /**
     * GET genérico
     */
    get<T>(endpoint: string): Observable<T> {
        return this.http.get<T>(`${API_URL}${endpoint}`);
    }

    /**
     * POST genérico
     */
    post<T>(endpoint: string, body: any): Observable<T> {
        return this.http.post<T>(`${API_URL}${endpoint}`, body);
    }

    /**
     * PUT genérico
     */
    put<T>(endpoint: string, body: any): Observable<T> {
        return this.http.put<T>(`${API_URL}${endpoint}`, body);
    }

    /**
     * Reseta todo o banco de dados do backend
     */
    resetDatabase(): Observable<any> {
        return this.http.post(`${API_URL}/reset-database`, {});
    }

    /**
     * DELETE genérico
     */
    delete<T>(endpoint: string): Observable<T> {
        return this.http.delete<T>(`${API_URL}${endpoint}`);
    }
}
