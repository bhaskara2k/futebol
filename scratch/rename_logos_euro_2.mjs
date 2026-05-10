
import fs from 'fs';
import path from 'path';

const folders = ['portugal', 'russia', 'holanda'];

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const manualMappings = {
  // Portugal
  "sl-benfica": "benfica",
  "fc-porto": "porto",
  "sporting-cp": "sporting",
  "sc-braga": "braga",
  "vitoria-sc": "vitoria-guimaraes",
  "moreirense-fc": "moreirense",
  "fc-arouca": "arouca",
  "rio-ave-fc": "rio-ave",
  "gil-vicente-fc": "gil-vicente",
  "gd-estoril-praia": "estoril",
  "boavista-fc": "boavista",
  "estrela-da-amadora": "estrela",
  "fc-famalicao": "famalicao",
  "portimonense-sc": "portimonense",
  "sc-farense": "farense",
  "gd-chaves": "chaves",
  "cd-vizela": "vizela",
  "casa-pia-ac": "casa-pia",
  "santa-clara": "santa-clara",
  "nacional-da-madeira": "nacional",
  "avs-futebol-sad": "avs",
  "maritimo": "maritimo",
  "pacos-de-ferreira": "pacos-ferreira",
  "gd-torreense": "torreense",

  // Russia
  "zenit-st-petersburg": "zenit",
  "fk-krasnodar": "krasnodar",
  "dynamo-moscow": "dynamo",
  "spartak-moscow": "spartak",
  "lokomotiv-moscow": "lokomotiv",
  "cska-moscow": "cska",
  "fk-rostov": "rostov",
  "rubin-kazan": "rubin",

  // Holanda
  "psv-eindhoven": "psv",
  "feyenoord": "feyenoord",
  "fc-twente": "twente",
  "az-alkmaar": "az",
  "ajax": "ajax",
  "nec-nijmegen": "nec",
  "fc-utrecht": "utrecht",
  "sparta-rotterdam": "sparta",
  "go-ahead-eagles": "go-ahead",
  "fortuna-sittard": "fortuna",
  "sc-heerenveen": "heerenveen",
  "pec-zwolle": "zwolle",
  "almere-city": "almere",
  "heracles-almelo": "heracles",
  "rkc-waalwijk": "rkc",
  "vitesse": "vitesse"
};

folders.forEach(folder => {
  const dirPath = path.join(process.cwd(), 'public/assets/logos', folder);
  if (!fs.existsSync(dirPath)) return;

  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const ext = path.extname(file);
    const name = path.basename(file, ext);
    const slug = slugify(name);
    
    let targetSlug = slug;
    for (const [realSlug, fileSlug] of Object.entries(manualMappings)) {
        if (slug === fileSlug) {
            targetSlug = realSlug;
            break;
        }
    }

    const oldPath = path.join(dirPath, file);
    const newPath = path.join(dirPath, `${targetSlug}${ext}`);

    if (oldPath !== newPath && !fs.existsSync(newPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`${folder}: Renomeado ${file} -> ${targetSlug}${ext}`);
    }
  });
});
