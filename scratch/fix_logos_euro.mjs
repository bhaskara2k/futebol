
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

// Mapeamento manual para corrigir os furos detectados
const specificFixes = {
  // Itália
  "italia/inter.svg": "inter-milan.svg",
  "italia/milan.svg": "ac-milan.svg",
  "italia/roma.png": "as-roma.png",
  
  // Alemanha
  "alemanha/hamburg.svg": "hamburg-sv.svg",
  "alemanha/hannover.svg": "hannover-96.svg",
  "alemanha/hertha.svg": "hertha-bsc.svg",
  "alemanha/paderborn.svg": "sc-paderborn-07.svg",
  "alemanha/stuttgart.svg": "vfb-stuttgart.svg",
  
  // França
  "franca/psg.svg": "paris-saint-germain.svg"
};

// Invertemos o mapeamento manual anterior para garantir que os arquivos existentes batam com os nomes reais
const manualMappings = {
  // Itália
  "ac-milan": ["milan", "ac-milan"],
  "inter-milan": ["inter", "inter-milan"],
  "as-roma": ["roma", "as-roma"],
  "us-salernitana": ["salernitana"],
  "ssc-napoli": ["napoli"],
  "ssc-bari": ["bari"],

  // Alemanha
  "hamburg-sv": ["hamburg", "hamburg-sv"],
  "hannover-96": ["hannover", "hannover-96"],
  "hertha-bsc": ["hertha", "hertha-bsc"],
  "sc-paderborn-07": ["paderborn", "paderborn-07"],
  "vfb-stuttgart": ["stuttgart", "vfb-stuttgart"],
  "bayern-munich": ["bayern-munchen"],

  // França
  "paris-saint-germain": ["psg", "paris-saint-germain"],
  "as-monaco": ["monaco"],
  "stade-brestois-29": ["brest"]
};

folders.forEach(folder => {
  const dirPath = path.join(process.cwd(), 'public/assets/logos', folder);
  if (!fs.existsSync(dirPath)) return;

  const files = fs.readdirSync(dirPath);
  
  // Aplica as correções específicas primeiro
  for (const [oldRel, newRel] of Object.entries(specificFixes)) {
    const [f, oldName] = oldRel.split('/');
    if (f === folder && files.includes(oldName)) {
      const oldPath = path.join(dirPath, oldName);
      const newPath = path.join(dirPath, newRel);
      if (!fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Correção Específica: ${oldName} -> ${newRel}`);
      }
    }
  }
});

// Re-executa o slugifier básico para o resto
folders.forEach(folder => {
    const dirPath = path.join(process.cwd(), 'public/assets/logos', folder);
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const ext = path.extname(file);
        const name = path.basename(file, ext);
        const slug = slugify(name);
        const oldPath = path.join(dirPath, file);
        const newPath = path.join(dirPath, `${slug}${ext}`);
        if (oldPath !== newPath && !fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
        }
    });
});
