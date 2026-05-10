import fs from 'fs';

const teams = fs.readFileSync('teams_to_check.txt', 'utf8').split('\n').filter(Boolean);
const logos = fs.readFileSync('existing_logos.txt', 'utf8').split('\n').filter(Boolean);

function toSlug(name) {
  return name.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-');
}

const missing = [];
teams.forEach(team => {
  const slug = toSlug(team);
  const found = logos.some(l => l.startsWith(slug + '.'));
  if (!found) {
    missing.push({ team, slug });
  }
});

console.log('Missing logos:', missing.length);
missing.forEach(m => console.log(`- ${m.team} (expected: ${m.slug})`));
