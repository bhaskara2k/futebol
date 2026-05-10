import fs from 'fs';
import path from 'path';

const logosDir = '/home/hiagomedeiros/Documentos/futebol-integration/public/assets/logos/inglaterra';
const teamNames = [
    "ARSENAL", "LIVERPOOL FC", "CHELSEA", "MANCHESTER UNITED", "MANCHESTER CITY",
    "NEWCASTLE UNITED", "WEST HAM UNITED", "LEICESTER CITY", "SUNDERLAND FC",
    "NORWICH CITY", "ASTON VILLA", "BRIGHTON AND HOVE ALBION", "FULHAM",
    "WOLVERHAMPTON", "SOUTHAMPTON FC", "NOTTINGHAM FOREST", "STOKE CITY",
    "EVERTON", "CRYSTAL PALACE", "MIDDLESBROUGH", "BRISTOL CITY", "TOTTENHAM HOTSPUR",
    "AFC BOURNEMOUTH", "BIRMINGHAM CITY", "BURNLEY", "COVENTRY CITY", "PORTSMOUTH",
    "HULL CITY", "BLACKBURN ROVERS", "SHEFFIELD UNITED", "LEEDS UNITED",
    "SWANSEA CITY", "BARNSLEY", "DERBY COUNTY", "BLACKPOOL FC", "BOLTON WANDERERS",
    "BRENTFORD FC", "HUDDERSFIELD TOWN", "CAMBRIDGE UNITED", "IPSWICH TOWN",
    "CARDIFF CITY", "PLYMOUTH ARGYLE", "LUTON TOWN", "WIGAN ATHLETIC",
    "CHARLTON ATHLETIC", "ROTHERHAM UNITED", "CREWE ALEXANDRA", "PETERBOROUGH UNITED",
    "EXETER CITY", "AFC WIMBLEDON", "MILWALL", "LEYTON ORIENT", "OXFORD UNITED",
    "PRESTON NORTH END", "QUEENS PARK RANGERS", "SHEFFIELD WEDNESDAY", "WALSALL",
    "WATFORD", "WEST BROMWICH ALBION", "WREXHAM", "WYCOMBE WANDERERS",
    "STOCKPORT COUNTY", "BRADFORD CITY", "STEVENAGE"
];

const manualMap = {
    'wolves.svg': 'wolverhampton.svg',
    'brighton.svg': 'brighton-and-hove-albion.svg',
    'bournemouth.svg': 'afc-bournemouth.svg',
    'plymouth.svg': 'plymouth-argyle.svg',
    'millwall.svg': 'milwall.svg',
    'leyton.svg': 'leyton-orient.svg',
    'preston.svg': 'preston-north-end.svg',
    'qpr.svg': 'queens-park-rangers.svg',
    'west-brom.svg': 'west-bromwich-albion.svg',
    'sheffield.svg': 'sheffield-united.svg',
    'wednesday.svg': 'sheffield-wednesday.svg',
    'sheffield-wednesday.svg': 'sheffield-wednesday.svg',
    'peterborough.svg': 'peterborough-united.svg'
};

function getSlug(name) {
    return name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

const files = fs.readdirSync(logosDir);

console.log(`🔍 Iniciando correção manual e automática...`);

// 1. Aplica mapeamento manual primeiro
Object.entries(manualMap).forEach(([oldName, newName]) => {
    const oldPath = path.join(logosDir, oldName);
    const newPath = path.join(logosDir, newName);
    if (fs.existsSync(oldPath)) {
        console.log(`🛠️ Correção Manual: ${oldName} -> ${newName}`);
        fs.renameSync(oldPath, newPath);
    }
});

// 2. Tenta os slugs automáticos para o que sobrou
const updatedFiles = fs.readdirSync(logosDir);
teamNames.forEach(name => {
    const slug = getSlug(name);
    const targetFile = slug + '.svg';
    
    if (updatedFiles.includes(targetFile)) {
        return;
    }

    // Busca heurística simples
    let found = updatedFiles.find(f => {
        const fLower = f.toLowerCase();
        const baseName = name.toLowerCase().split(' ')[0];
        return fLower.startsWith(baseName) && fLower.endsWith('.svg');
    });

    if (found) {
        console.log(`🔄 Automático: ${found} -> ${targetFile}`);
        fs.renameSync(path.join(logosDir, found), path.join(logosDir, targetFile));
    }
});
