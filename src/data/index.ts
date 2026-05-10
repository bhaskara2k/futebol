/**
 * 🌍 CUSTOM PLAYERS DATA - INDEX
 * 
 * Este arquivo combina todos os dados de times de todos os continentes
 * em um único array exportado como customPlayersData
 */

import { europeTeams } from './europe.data';
import { southAmericaTeams } from './south-america.data';
import { africaTeams } from './africa.data';
import { asiaTeams } from './asia.data';
import { northAmericaTeams } from './north-america.data';
import { otherTeams } from './other.data';

/**
 * Array combinado de todos os times do mundo
 */
export const customPlayersData = [
    ...europeTeams,
    ...southAmericaTeams,
    ...africaTeams,
    ...asiaTeams,
    ...northAmericaTeams,
    ...otherTeams
];

console.log(`📊 customPlayersData carregado com ${customPlayersData.length} times`);
