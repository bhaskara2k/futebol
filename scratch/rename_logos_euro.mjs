
import fs from 'fs';
import path from 'path';

const folders = ['italia', 'alemanha', 'franca'];

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Mapeamento manual para casos onde o slug automático pode falhar ou o arquivo tem nome diferente
const manualMappings = {
  // Itália
  "ac-milan": "ac-milan",
  "inter-milan": "inter-milan",
  "juventus": "juventus",
  "ssc-napoli": "napoli",
  "lazio": "lazio",
  "as-roma": "as-roma",
  "atalanta-bc": "atalanta",
  "acf-fiorentina": "fiorentina",
  "bologna-fc": "bologna",
  "torino-fc": "torino",
  "ac-monza": "monza",
  "genoa-cfc": "genoa",
  "us-lecce": "lecce",
  "udinese-calcio": "udinese",
  "cagliari-calcio": "cagliari",
  "hellas-verona": "verona",
  "us-sassuolo": "sassuolo",
  "frosinone-calcio": "frosinone",
  "us-salernitana": "salernitana",
  "empoli-fc": "empoli",
  "uc-sampdoria": "sampdoria",
  "spezia-calcio": "spezia",
  "us-cremonese": "cremonese",
  "venezia-fc": "venezia",
  "ssc-bari": "bari",
  "us-catanzaro": "catanzaro",
  "como-1907": "como",
  "modena-fc": "modena",
  "palermo-fc": "palermo",
  "parma-calcio": "parma",
  "pisa-sc": "pisa",
  "reggiana-1919": "reggiana",

  // Alemanha
  "bayer-leverkusen": "bayer-leverkusen",
  "bayern-munich": "bayern-munchen",
  "vfb-stuttgart": "vfb-stuttgart",
  "rb-leipzig": "rb-leipzig",
  "borussia-dortmund": "borussia-dortmund",
  "eintracht-frankfurt": "eintracht-frankfurt",
  "tsg-hoffenheim": "hoffenheim",
  "sc-freiburg": "freiburg",
  "fc-heidenheim": "heidenheim",
  "fc-augsburg": "augsburg",
  "werder-bremen": "werder-bremen",
  "vfl-wolfsburg": "wolfsburg",
  "fsv-mainz-05": "mainz",
  "borussia-monchengladbach": "borussia-monchengladbach",
  "union-berlin": "union-berlin",
  "vfl-bochum": "bochum",
  "fc-koln": "koln",
  "sv-darmstadt-98": "darmstadt",
  "schalke-04": "schalke-04",
  "hertha-bsc": "hertha-bsc",
  "hamburg-sv": "hamburg-sv",
  "fortuna-dusseldorf": "fortuna-dusseldorf",
  "hannover-96": "hannover-96",
  "sc-paderborn-07": "paderborn-07",
  "spvgg-greuther-furth": "greuther-furth",
  "fc-kaiserslautern": "kaiserslautern",
  "fc-st-pauli": "st-pauli",
  "holstein-kiel": "holstein-kiel",
  "sv-elversberg": "elversberg",
  "fc-magdeburg": "magdeburg",
  "hansa-rostock": "hansa-rostock",
  "wehen-wiesbaden": "wehen-wiesbaden",

  // França
  "paris-saint-germain": "paris-saint-germain",
  "as-monaco": "monaco",
  "stade-brestois-29": "brest",
  "lille-osc": "lille",
  "ogc-nice": "nice",
  "rc-lens": "lens",
  "olympique-lyonnais": "lyon",
  "olympique-de-marseille": "marseille",
  "stade-de-reims": "reims",
  "stade-rennais-fc": "rennes",
  "toulouse-fc": "toulouse",
  "montpellier-hsc": "montpellier",
  "rc-strasbourg": "strasbourg",
  "fc-nantes": "nantes",
  "le-havre-ac": "le-havre",
  "fc-metz": "metz",
  "fc-lorient": "lorient",
  "clermont-foot-63": "clermont",
  "aj-auxerre": "auxerre",
  "angers-sco": "angers",
  "as-saint-etienne": "saint-etienne",
  "rodez-af": "rodez",
  "paris-fc": "paris-fc",
  "sm-caen": "caen",
  "ea-guingamp": "guingamp",
  "ac-ajaccio": "ajaccio",
  "grenoble-foot-38": "grenoble",
  "amiens-sc": "amiens",
  "pau-fc": "pau",
  "sc-bastia": "bastia",
  "fc-annecy": "annecy",
  "us-concarneau": "concarneau"
};

folders.forEach(folder => {
  const dirPath = path.join(process.cwd(), 'public/assets/logos', folder);
  if (!fs.existsSync(dirPath)) {
    console.log(`Diretório não encontrado: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const ext = path.extname(file);
    const name = path.basename(file, ext);
    const slug = slugify(name);
    
    // Procura se algum time real mapeia para este arquivo
    let targetSlug = slug;
    for (const [realSlug, fileSlug] of Object.entries(manualMappings)) {
        if (slug === fileSlug) {
            targetSlug = realSlug;
            break;
        }
    }

    const oldPath = path.join(dirPath, file);
    const newPath = path.join(dirPath, `${targetSlug}${ext}`);

    if (oldPath !== newPath) {
      if (fs.existsSync(newPath)) {
          console.log(`Conflito: ${newPath} já existe. Pulando ${file}`);
      } else {
          fs.renameSync(oldPath, newPath);
          console.log(`Renomeado: ${file} -> ${targetSlug}${ext}`);
      }
    }
  });
});
