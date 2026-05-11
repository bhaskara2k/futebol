import { Injectable, inject } from '@angular/core';
import { db } from '../firebase.config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { Team, League, InternationalCompetition } from '../models';

export interface SaveMetadata {
  id: string;
  season: number;
  lastPlayed: any;
  teamName?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class FirebasePersistenceService {

  private readonly SAVES_COLLECTION = 'saves';

  /**
   * Lista todos os saves disponíveis no Firebase
   */
  async listSaves(): Promise<SaveMetadata[]> {
    try {
      const q = query(collection(db, this.SAVES_COLLECTION), orderBy('metadata.lastPlayed', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          season: data.metadata?.season || 1,
          lastPlayed: data.metadata?.lastPlayed,
          teamName: data.metadata?.teamName,
          description: data.metadata?.description
        };
      });
    } catch (error) {
      console.error('❌ Erro ao listar saves:', error);
      return [];
    }
  }

  /**
   * Remove recursivamente todos os valores 'undefined' de um objeto para compatibilidade com Firebase
   */
  private cleanObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObject(item));
    }

    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        newObj[key] = this.cleanObject(val);
      }
    });
    return newObj;
  }

  /**
   * Salva o estado atual do jogo em subcoleções (Escalável)
   */
  async saveGame(saveId: string, state: any): Promise<void> {
    console.log(`💾 Iniciando salvamento complexo: ${saveId}`);
    try {
      const saveRef = doc(db, this.SAVES_COLLECTION, saveId);
      
      // 1. Salvar Metadados (Documento Principal)
      const metadata = {
        id: saveId,
        season: state.season,
        lastPlayed: Timestamp.now(),
        teamName: state.userTeamName || 'N/A',
        description: state.description || `Temporada ${state.season}`
      };
      await setDoc(saveRef, { metadata });

      // Helper para simplificar objetos de jogadores em históricos (redução de payload)
      const simplifyPlayer = (p: any) => {
        if (!p) return null;
        return {
          id: p.id,
          name: p.name,
          overall: p.overall,
          nationalityId: p.nationalityId
        };
      };

      // Helper para simplificar objetos de times em históricos
      const simplifyTeam = (t: any) => {
        if (!t) return null;
        return {
          id: t.id,
          teamName: t.teamName,
          logoUrl: t.logoUrl
        };
      };

      // Helper para limpar registros de histórico (SeasonRecord / InternationalSeasonRecord)
      const cleanHistory = (history: any[]) => {
        if (!history || !Array.isArray(history)) return [];
        return history.map(record => {
          const newRecord = { ...record };
          
          // Se for SeasonRecord (Nacional), precisamos limpar cada divisão e copa
          const compKeys = ['division1', 'division2', 'division3', 'division4', 'division5', 'division6', 'division7', 'division8', 'cup', 'leagueCup', 'supercup'];
          compKeys.forEach(key => {
            if (newRecord[key]) {
              const comp = { ...newRecord[key] };
              if (comp.champion) comp.champion = simplifyTeam(comp.champion);
              if (comp.runnerUp) comp.runnerUp = simplifyTeam(comp.runnerUp);
              
              ['topScorer', 'topAssister', 'topMotm'].forEach(pKey => {
                if (comp[pKey] && comp[pKey].player) {
                  comp[pKey] = { ...comp[pKey], player: simplifyPlayer(comp[pKey].player) };
                }
              });
              newRecord[key] = comp;
            }
          });

          // Se for InternationalSeasonRecord, os campos são diretos
          if (newRecord.champion && !newRecord.division1) newRecord.champion = simplifyTeam(newRecord.champion);
          if (newRecord.runnerUp && !newRecord.division1) newRecord.runnerUp = simplifyTeam(newRecord.runnerUp);
          
          ['topScorer', 'topAssister', 'topMotm', 'bestPlayer', 'goldenGlove', 'revelation'].forEach(key => {
            if (newRecord[key] && newRecord[key].player) {
              newRecord[key] = {
                ...newRecord[key],
                player: simplifyPlayer(newRecord[key].player)
              };
            }
          });

          // Limpar Time da Temporada
          if (newRecord.teamOfTheSeason && Array.isArray(newRecord.teamOfTheSeason)) {
            newRecord.teamOfTheSeason = newRecord.teamOfTheSeason.map((pr: any) => ({
              ...pr,
              player: simplifyPlayer(pr.player)
            }));
          }

          return newRecord;
        });
      };

      // 2. Salvar Times (Subcoleção)
      await this.saveCollectionChunked(
        collection(db, this.SAVES_COLLECTION, saveId, 'teams'),
        state.teams,
        (t: Team) => {
          const teamData = {
            ...t,
            players: t.players?.map(p => ({ ...p }))
          };
          return this.cleanObject(teamData);
        }
      );

      // 3. Salvar Ligas (Subcoleção)
      await this.saveCollectionChunked(
        collection(db, this.SAVES_COLLECTION, saveId, 'leagues'),
        state.leagues,
        (l: League) => {
          const leagueData: any = { 
            ...l,
            history: cleanHistory(l.history) // LIMPEZA CRÍTICA DE HISTÓRICO
          };
          
          leagueData.divisions = l.divisions.map(d => {
            const fixturesObj: { [key: string]: any } = {};
            d.fixtures.forEach((roundMatches, idx) => {
              fixturesObj[idx.toString()] = roundMatches.map(m => ({
                ...m,
                homeTeam: m.homeTeam.id,
                awayTeam: m.awayTeam.id,
                events: {
                   goals: m.events.goals.map(g => ({ ...g, player: g.player.id })),
                   assists: m.events.assists.map(a => ({ ...a, player: a.player.id })),
                   motm: m.events.motm?.id || null
                }
              }));
            });

            return {
              ...d,
              teams: d.teams.map(t => t.id),
              fixtures: fixturesObj,
              topScorers: d.topScorers.map(p => p.id),
              topAssists: d.topAssists.map(p => p.id),
              topMotm: d.topMotm.map(p => p.id)
            };
          });

          return this.cleanObject(leagueData);
        }
      );

      // 4. Salvar Competições Internacionais (Subcoleção)
      if (state.internationalComps) {
        await this.saveCollectionChunked(
          collection(db, this.SAVES_COLLECTION, saveId, 'international'),
          state.internationalComps,
          (c: InternationalCompetition) => {
             const data: any = {
                ...c,
                teams: c.teams.map(t => t.id),
                history: cleanHistory(c.history), // LIMPEZA CRÍTICA DE HISTÓRICO
                leaguePhase: c.leaguePhase?.map(d => {
                    const fixturesObj: { [key: string]: any } = {};
                    d.fixtures.forEach((roundMatches, idx) => {
                      fixturesObj[idx.toString()] = roundMatches.map(m => ({
                        ...m,
                        homeTeam: m.homeTeam.id,
                        awayTeam: m.awayTeam.id
                      }));
                    });
                    return {
                      ...d,
                      teams: d.teams.map(t => t.id),
                      fixtures: fixturesObj
                    };
                })
             };
             return this.cleanObject(data);
          }
        );
      }

      // 5. Salvar Resumos de Temporada (Subcoleção para evitar limite de 1MB)
      if (state.summaries && Array.isArray(state.summaries)) {
        await this.saveCollectionChunked(
          collection(db, this.SAVES_COLLECTION, saveId, 'summaries'),
          state.summaries,
          (s: any, idx: number) => ({
             ...s,
             id: s.season ? `season_${s.season}` : `summary_${idx}`
          })
        );
      }

      console.log(`✅ Jogo salvo com sucesso: ${saveId}`);
    } catch (error) {
      console.error('❌ Erro crítico ao salvar jogo:', error);
      throw error;
    }
  }

  /**
   * Helper para salvar coleções grandes em lotes (Firestore limit: 500 ops)
   */
  private async saveCollectionChunked(collRef: any, items: any[], transform: (item: any, idx: number) => any): Promise<void> {
    const CHUNK_SIZE = 10; // Reduzido drasticamente para evitar limite de payload de 10MB por lote
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach((item, idx) => {
        const transformed = transform(item, i + idx);
        const id = transformed.id || item.id || item.countryId || `doc_${i + idx}`;
        const itemRef = doc(collRef, String(id));
        batch.set(itemRef, transformed);
      });

      await batch.commit();
      console.log(`📦 Lote de ${chunk.length} documentos salvo em ${collRef.path}`);
    }
  }

  /**
   * Carrega um save reconstruindo o estado a partir das subcoleções
   */
  async loadSave(saveId: string): Promise<any> {
    console.log(`📂 Iniciando carregamento complexo: ${saveId}`);
    try {
      const saveRef = doc(db, this.SAVES_COLLECTION, saveId);
      const docSnap = await getDoc(saveRef);

      if (!docSnap.exists()) {
        console.warn('⚠️ Save não encontrado no documento principal.');
        return null;
      }

      const mainData = docSnap.data();
      const state: any = {
        season: mainData.metadata?.season || 1,
        userTeamName: mainData.metadata?.teamName || 'N/A'
      };

      // 1. Carregar Times
      const teamsSnap = await getDocs(collection(db, this.SAVES_COLLECTION, saveId, 'teams'));
      state.teams = teamsSnap.docs.map(d => {
        const team = d.data() as Team;
        if (!team.players) team.players = [];
        return team;
      });

      // 2. Carregar Ligas
      const leaguesSnap = await getDocs(collection(db, this.SAVES_COLLECTION, saveId, 'leagues'));
      state.leagues = leaguesSnap.docs.map(d => {
        const data = d.data() as any;
        
        // Reconstruir divisões
        data.divisions = data.divisions.map((div: any) => {
          // Restaurar Times
          const teamsInDiv = (div.teams || []).map((id: string) => 
            state.teams.find((t: Team) => t.id === id)
          ).filter(Boolean);

          // Restaurar Fixtures (Converter Objeto de volta para Match[][])
          const fixtures: any[][] = [];
          if (div.fixtures) {
            Object.keys(div.fixtures).sort((a, b) => Number(a) - Number(b)).forEach(key => {
              const roundMatches = div.fixtures[key].map((m: any) => {
                const homeT = state.teams.find((t: Team) => t.id === m.homeTeam);
                const awayT = state.teams.find((t: Team) => t.id === m.awayTeam);
                const allPlayers = state.teams.flatMap((t: Team) => t.players || []);

                return {
                  ...m,
                  homeTeam: homeT,
                  awayTeam: awayT,
                  events: {
                    goals: (m.events?.goals || []).map((g: any) => ({ ...g, player: allPlayers.find(p => p.id === g.player) })),
                    assists: (m.events?.assists || []).map((a: any) => ({ ...a, player: allPlayers.find(p => p.id === a.player) })),
                    motm: allPlayers.find(p => p.id === m.events?.motm) || null
                  }
                };
              });
              fixtures.push(roundMatches);
            });
          }

          return {
            ...div,
            teams: teamsInDiv,
            fixtures: fixtures,
            topScorers: (div.topScorers || []).map((id: string) => state.teams.flatMap((t: Team) => t.players || []).find(p => p.id === id)).filter(Boolean),
            topAssists: (div.topAssists || []).map((id: string) => state.teams.flatMap((t: Team) => t.players || []).find(p => p.id === id)).filter(Boolean),
            topMotm: (div.topMotm || []).map((id: string) => state.teams.flatMap((t: Team) => t.players || []).find(p => p.id === id)).filter(Boolean)
          };
        });

        return data as League;
      });

      // 3. Carregar Internacionais
      const intSnap = await getDocs(collection(db, this.SAVES_COLLECTION, saveId, 'international'));
      state.internationalComps = intSnap.docs.map(d => {
         const data = d.data() as any;
         // Restaurar referências de times
         data.teams = (data.teams || []).map((id: string) => state.teams.find((t: Team) => t.id === id)).filter(Boolean);
         
         if (data.leaguePhase) {
            data.leaguePhase = data.leaguePhase.map((div: any) => {
                const fixtures: any[][] = [];
                if (div.fixtures) {
                    Object.keys(div.fixtures).sort((a, b) => Number(a) - Number(b)).forEach(key => {
                        const roundMatches = div.fixtures[key].map((m: any) => ({
                            ...m,
                            homeTeam: state.teams.find((t: Team) => t.id === m.homeTeam),
                            awayTeam: state.teams.find((t: Team) => t.id === m.awayTeam)
                        }));
                        fixtures.push(roundMatches);
                    });
                }
                return {
                    ...div,
                    teams: (div.teams || []).map((id: string) => state.teams.find((t: Team) => t.id === id)).filter(Boolean),
                    fixtures: fixtures
                };
            });
         }
         return data;
      });

      // 4. Carregar Resumos (Subcoleção)
      const summariesSnap = await getDocs(collection(db, this.SAVES_COLLECTION, saveId, 'summaries'));
      if (!summariesSnap.empty) {
        state.summaries = summariesSnap.docs
          .map(d => d.data())
          .sort((a: any, b: any) => (a.season || 0) - (b.season || 0));
      } else {
        state.summaries = [];
      }

      console.log(`✅ Save reconstruído com sucesso: ${saveId} (${state.teams.length} times)`);
      return state;
    } catch (error) {
      console.error('❌ Erro ao carregar save:', error);
      throw error;
    }
  }

  /**
   * Deleta um save e tenta limpar subcoleções básicas
   */
  async deleteSave(saveId: string): Promise<void> {
    try {
      // Deleta o principal
      await deleteDoc(doc(db, this.SAVES_COLLECTION, saveId));
      
      // Tentativa de limpar metadados de summaries
      await deleteDoc(doc(db, this.SAVES_COLLECTION, saveId, 'global', 'summaries'));
      
      console.log(`🗑️ Save principal deletado: ${saveId}`);
    } catch (error) {
      console.error('❌ Erro ao deletar save:', error);
      throw error;
    }
  }

  /**
   * Renomeia o save (atualiza a descrição nos metadados)
   */
  async renameSave(saveId: string | number, newName: string): Promise<void> {
    try {
      const id = String(saveId);
      const saveRef = doc(db, this.SAVES_COLLECTION, id);
      const docSnap = await getDoc(saveRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const metadata = {
          ...data.metadata,
          description: newName
        };
        await setDoc(saveRef, { metadata }, { merge: true });
        console.log(`📝 Save ${saveId} renomeado para "${newName}"`);
      }
    } catch (error) {
      console.error('❌ Erro ao renomear save:', error);
      throw error;
    }
  }
}
