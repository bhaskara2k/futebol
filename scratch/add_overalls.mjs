import fs from 'fs';

let content = fs.readFileSync('src/data/south-america.data.ts', 'utf8');

const lines = content.split('\n');
let currentTier = '';
let newLines = [];

lines.forEach(line => {
  if (line.includes('// SÉRIE A')) currentTier = 'A';
  else if (line.includes('// SÉRIE B')) currentTier = 'B';
  else if (line.includes('// SÉRIE C')) currentTier = 'C';
  else if (line.includes('// SÉRIE D')) currentTier = 'D';
  else if (line.includes('// Módulo')) currentTier = 'E';
  else if (line.includes('// ARGENTINA') || line.includes('// URUGUAI')) currentTier = 'OTHER';

  if (line.includes('teamName:') && line.includes('countryId: "BRA"')) {
    let overall = 50;
    if (currentTier === 'A') overall = 78 + Math.floor(Math.random() * 8);
    else if (currentTier === 'B') overall = 70 + Math.floor(Math.random() * 8);
    else if (currentTier === 'C') overall = 64 + Math.floor(Math.random() * 6);
    else if (currentTier === 'D') overall = 58 + Math.floor(Math.random() * 6);
    else if (currentTier === 'E') overall = 50 + Math.floor(Math.random() * 8);

    line = line.replace('players: []', `overall: ${overall}, players: []`);
  }
  newLines.push(line);
});

fs.writeFileSync('src/data/south-america.data.ts', newLines.join('\n'));
console.log('Successfully updated overalls for Brazil teams.');
