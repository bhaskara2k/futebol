import { customPlayersData } from './src/data/index.js';

const brazilTeams = customPlayersData.filter(t => t.countryId === 'BRA');
console.log('Total Brazil Teams:', brazilTeams.length);

const pelotas = brazilTeams.find(t => t.teamName.includes('PELOTAS'));
if (pelotas) {
  console.log('FOUND PELOTAS:', pelotas);
} else {
  console.log('PELOTAS NOT FOUND');
}

const serraBranca = brazilTeams.find(t => t.teamName.includes('SERRA BRANCA'));
if (serraBranca) {
  console.log('FOUND SERRA BRANCA:', serraBranca);
} else {
  console.log('SERRA BRANCA NOT FOUND');
}
