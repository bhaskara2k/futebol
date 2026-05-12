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
    let categorySizes: { [key: string]: number } = {
      metadata: 0,
      teams: 0,
      leagues: 0,
      international: 0,
      summaries: 0
    };
    let heaviestDocs: { id: string, size: number, category: string }[] = [];

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
      const metadataSize = new Blob([JSON.stringify(metadata)]).size;
      categorySizes.metadata = metadataSize;
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
      const teamsReport = await this.saveCollectionChunked(
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
      categorySizes.teams = teamsReport.totalSize;
      heaviestDocs.push({ ...teamsReport.heaviest, category: 'Teams' });
 
      // 3. Salvar Ligas (Subcoleção)
      const leaguesReport = await this.saveCollectionChunked(
        collection(db, this.SAVES_COLLECTION, saveId, 'leagues'),
        state.leagues,
        (l: League) => {
          // Helper para limpar as fixtures de uma divisão (Match[][])
          const cleanDivisionFixtures = (fixtures: any[][]) => {
            const fixturesObj: { [key: string]: any } = {};
            fixtures.forEach((roundMatches, idx) => {
              fixturesObj[idx.toString()] = roundMatches.map(m => ({
                ...m,
                homeTeam: m.homeTeam.id,
                awayTeam: m.awayTeam.id,
                events: {
                   goals: (m.events?.goals || []).map((g: any) => ({ ...g, player: g.player?.id })),
                   assists: (m.events?.assists || []).map((a: any) => ({ ...a, player: a.player?.id })),
                   motm: m.events?.motm?.id || null
                }
              }));
            });
            return fixturesObj;
          };

          // Helper para limpar uma Copa (CupRound -> CupMatch)
          const cleanCup = (cup: any) => {
            if (!cup || !cup.rounds) return cup;
            const newCup = { ...cup };
            
            if (newCup.champion) newCup.champion = newCup.champion.id;
            if (newCup.runnerUp) newCup.runnerUp = newCup.runnerUp.id;
            newCup.topScorers = (newCup.topScorers || []).map((p: any) => p.id);
            newCup.topAssists = (newCup.topAssists || []).map((p: any) => p.id);
            newCup.topMotm = (newCup.topMotm || []).map((p: any) => p.id);

            newCup.rounds = cup.rounds.map((round: any) => ({
              ...round,
              matches: round.matches.map((m: any) => {
                const cleanM = {
                  ...m,
                  // Se já for string (ID), mantém. Se for objeto, pega o ID.
                  homeTeam: typeof m.homeTeam === 'object' ? m.homeTeam?.id : m.homeTeam,
                  awayTeam: typeof m.awayTeam === 'object' ? m.awayTeam?.id : m.awayTeam,
                  winner: typeof m.winner === 'object' ? m.winner?.id : m.winner,
                  aggregateWinnerId: m.aggregateWinnerId
                };
                
                // Limpar eventos da ida e volta
                const cleanEvents = (ev: any) => {
                  if (!ev) return ev;
                  return {
                    goals: (ev.goals || []).map((g: any) => ({ 
                      ...g, 
                      player: typeof g.player === 'object' ? g.player?.id : g.player 
                    })),
                    assists: (ev.assists || []).map((a: any) => ({ 
                      ...a, 
                      player: typeof a.player === 'object' ? a.player?.id : a.player 
                    })),
                    motm: typeof ev.motm === 'object' ? ev.motm?.id : ev.motm
                  };
                };

                if (cleanM.eventsLeg1) cleanM.eventsLeg1 = cleanEvents(cleanM.eventsLeg1);
                if (cleanM.eventsLeg2) cleanM.eventsLeg2 = cleanEvents(cleanM.eventsLeg2);
                
                return cleanM;
              })
            }));
            return newCup;
          };

          const leagueData: any = { 
            ...l,
            history: cleanHistory(l.history)
          };
          
          // Limpar Copas com a lógica correta de rounds/matches
          leagueData.cup = cleanCup(l.cup);
          if (l.leagueCup) leagueData.leagueCup = cleanCup(l.leagueCup);
          if (l.supercup) leagueData.supercup = cleanCup(l.supercup);

          leagueData.divisions = l.divisions.map(d => {
            return {
              ...d,
              teams: d.teams.map(t => t.id),
              fixtures: cleanDivisionFixtures(d.fixtures),
              topScorers: (d.topScorers || []).map((p: any) => p.id),
              topAssists: (d.topAssists || []).map((p: any) => p.id),
              topMotm: (d.topMotm || []).map((p: any) => p.id)
            };
          });
 
          return this.cleanObject(leagueData);
        }
      );
      categorySizes.leagues = leaguesReport.totalSize;
      heaviestDocs.push({ ...leaguesReport.heaviest, category: 'Leagues' });
 
      // 4. Salvar Competições Internacionais (Subcoleção)
      if (state.internationalComps) {
        const intReport = await this.saveCollectionChunked(
          collection(db, this.SAVES_COLLECTION, saveId, 'international'),
          state.internationalComps,
          (c: InternationalCompetition) => {
             const data: any = {
                ...c,
                teams: c.teams.map(t => t.id),
                history: cleanHistory(c.history),
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
        categorySizes.international = intReport.totalSize;
        heaviestDocs.push({ ...intReport.heaviest, category: 'International' });
      }
 
      // 5. Salvar Resumos de Temporada (Subcoleção)
      if (state.summaries && Array.isArray(state.summaries)) {
        const summariesReport = await this.saveCollectionChunked(
          collection(db, this.SAVES_COLLECTION, saveId, 'summaries'),
          state.summaries,
          (s: any, idx: number) => ({
             ...s,
             id: s.season ? `season_${s.season}` : `summary_${idx}`
          })
        );
        categorySizes.summaries = summariesReport.totalSize;
        heaviestDocs.push({ ...summariesReport.heaviest, category: 'Summaries' });
      }
 
      const totalSizeInBytes = Object.values(categorySizes).reduce((a, b) => a + b, 0);
      const sizeInKB = totalSizeInBytes / 1024;
      
      console.log('--- 📊 RELATÓRIO DETALHADO DE SAVE ---');
      console.log(`📍 Metadata: ${(categorySizes.metadata / 1024).toFixed(2)} KB`);
      console.log(`🛡️ Teams: ${(categorySizes.teams / 1024).toFixed(2)} KB`);
      console.log(`🏆 Leagues: ${(categorySizes.leagues / 1024).toFixed(2)} KB`);
      console.log(`🌍 International: ${(categorySizes.international / 1024).toFixed(2)} KB`);
      console.log(`📚 Summaries: ${(categorySizes.summaries / 1024).toFixed(2)} KB`);
      console.log(`🚀 TOTAL GERAL: ${sizeInKB.toFixed(2)} KB`);
      
      console.log('--- ⚠️ DOCUMENTOS MAIS PESADOS (INDIVIDUAIS) ---');
      heaviestDocs.sort((a, b) => b.size - a.size).forEach(doc => {
        const docSizeKB = doc.size / 1024;
        const color = docSizeKB > 500 ? '🚨' : docSizeKB > 200 ? '⚠️' : '✅';
        console.log(`${color} [${doc.category}] ID: ${doc.id} | Tamanho: ${docSizeKB.toFixed(2)} KB`);
      });
      console.log('---------------------------------------');
      
      console.log(`✅ Jogo salvo com sucesso: ${saveId}`);
    } catch (error) {
      console.error('❌ Erro crítico ao salvar jogo:', error);
      throw error;
    }
  }

  /**
   * Helper para salvar coleções grandes em lotes (Firestore limit: 500 ops)
   */
  private async saveCollectionChunked(collRef: any, items: any[], transform: (item: any, idx: number) => any): Promise<{ totalSize: number, heaviest: { id: string, size: number } }> {
    const CHUNK_SIZE = 10;
    let totalSize = 0;
    let heaviest = { id: '', size: 0 };

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach((item, idx) => {
        const transformed = transform(item, i + idx);
        const id = transformed.id || item.id || item.countryId || `doc_${i + idx}`;
        const itemRef = doc(collRef, String(id));
        
        const itemSize = new Blob([JSON.stringify(transformed)]).size;
        totalSize += itemSize;
        
        if (itemSize > heaviest.size) {
          heaviest = { id: String(id), size: itemSize };
        }

        // 🔍 BIÓPSIA DE DOCUMENTO PESADO
        if (itemSize > 800 * 1024) {
          console.warn(`🚨 ANALISANDO DOCUMENTO OBESO: [${id}] (${(itemSize / 1024).toFixed(2)} KB)`);
          Object.keys(transformed).forEach(key => {
            const keySize = new Blob([JSON.stringify(transformed[key])]).size;
            console.log(`   - Campo [${key}]: ${(keySize / 1024).toFixed(2)} KB`);
            
            // Se for divisões, analisar cada uma
            if (key === 'divisions' && Array.isArray(transformed[key])) {
              transformed[key].forEach((div: any, idx: number) => {
                const divSize = new Blob([JSON.stringify(div)]).size;
                console.log(`      └─ Divisão ${idx + 1}: ${(divSize / 1024).toFixed(2)} KB`);
              });
            }
          });
        }
        
        batch.set(itemRef, transformed);
      });

      await batch.commit();
      console.log(`📦 Lote de ${chunk.length} documentos salvo em ${collRef.path}`);
    }
    return { totalSize, heaviest };
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
        const allPlayers = state.teams.flatMap((t: Team) => t.players || []);

        // Helper para restaurar fixtures de qualquer competição
        const restoreFixtures = (fixturesObj: any) => {
          const fixtures: any[][] = [];
          if (fixturesObj) {
            Object.keys(fixturesObj).sort((a, b) => Number(a) - Number(b)).forEach(key => {
              const roundMatches = fixturesObj[key].map((m: any) => {
                const homeT = state.teams.find((t: Team) => t.id === m.homeTeam);
                const awayT = state.teams.find((t: Team) => t.id === m.awayTeam);

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
          return fixtures;
        };

        // Helper para restaurar uma Copa (rounds -> matches)
        const restoreCup = (cupObj: any) => {
          if (!cupObj || !cupObj.rounds) return cupObj;
          return {
            ...cupObj,
            champion: state.teams.find((t: Team) => t.id === cupObj.champion) || cupObj.champion,
            runnerUp: state.teams.find((t: Team) => t.id === cupObj.runnerUp) || cupObj.runnerUp,
            topScorers: (cupObj.topScorers || []).map((id: string) => allPlayers.find(p => p.id === id)).filter(Boolean),
            topAssists: (cupObj.topAssists || []).map((id: string) => allPlayers.find(p => p.id === id)).filter(Boolean),
            topMotm: (cupObj.topMotm || []).map((id: string) => allPlayers.find(p => p.id === id)).filter(Boolean),
            rounds: cupObj.rounds.map((round: any) => ({
              ...round,
              matches: round.matches.map((m: any) => {
                const homeT = m.homeTeam ? state.teams.find((t: Team) => t.id === (typeof m.homeTeam === 'string' ? m.homeTeam : m.homeTeam.id)) : null;
                const awayT = m.awayTeam ? state.teams.find((t: Team) => t.id === (typeof m.awayTeam === 'string' ? m.awayTeam : m.awayTeam.id)) : null;
                
                const restoreEvents = (ev: any) => {
                  if (!ev) return ev;
                  return {
                    goals: (ev.goals || []).map((g: any) => ({ ...g, player: allPlayers.find(p => p.id === g.player) })),
                    assists: (ev.assists || []).map((a: any) => ({ ...a, player: allPlayers.find(p => p.id === a.player) })),
                    motm: allPlayers.find(p => p.id === ev.motm) || null
                  };
                };

                return {
                  ...m,
                  homeTeam: homeT || null,
                  awayTeam: awayT || null,
                  winner: m.winner ? state.teams.find((t: Team) => t.id === m.winner) : null,
                  eventsLeg1: restoreEvents(m.eventsLeg1),
                  eventsLeg2: restoreEvents(m.eventsLeg2)
                };
              })
            }))
          };
        };

        // Restaurar Copas
        data.cup = restoreCup(data.cup);
        if (data.leagueCup) data.leagueCup = restoreCup(data.leagueCup);
        if (data.supercup) data.supercup = restoreCup(data.supercup);
        
        // Reconstruir divisões
        data.divisions = data.divisions.map((div: any) => {
          return {
            ...div,
            teams: (div.teams || []).map((id: string) => state.teams.find((t: Team) => t.id === id)).filter(Boolean),
            fixtures: restoreFixtures(div.fixtures),
            topScorers: (div.topScorers || []).map((id: string) => allPlayers.find(p => p.id === id)).filter(Boolean),
            topAssists: (div.topAssists || []).map((id: string) => allPlayers.find(p => p.id === id)).filter(Boolean),
            topMotm: (div.topMotm || []).map((id: string) => allPlayers.find(p => p.id === id)).filter(Boolean)
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
