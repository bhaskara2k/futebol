import fs from 'fs';
import path from 'path';

const logosDir = '/home/hiagomedeiros/Documentos/futebol-integration/public/assets/logos/espanha';
const teamNames = [
    "REAL MADRID CF", "FC BARCELONA", "ATLÉTICO DE MADRID", "REAL SOCIEDAD", "VILLARREAL CF",
    "REAL BETIS", "ATHLETIC CLUB", "SEVILLA FC", "GIRONA FC", "VALENCIA CF",
    "CA OSASUNA", "RAYO VALLECANO", "RC CELTA DE VIGO", "RCD MALLORCA", "GETAFE CF",
    "UD ALMERÍA", "GRANADA CF", "UD LAS PALMAS", "DEPORTIVO ALAVÉS", "CÁDIZ CF",
    "ELCHE CF", "RCD ESPANYOL", "REAL VALLADOLID CF", "SD EIBAR", "LEVANTE UD",
    "CD LEGANÉS", "REAL OVIEDO", "SPORTING DE GIJÓN", "RACING DE SANTANDER", "REAL ZARAGOZA",
    "CD TENERIFE", "RC DEPORTIVO LA CORUÑA"
];

const manualMap = {
    'real-madrid.svg': 'real-madrid-cf.svg',
    'barcelona.svg': 'fc-barcelona.svg',
    'atletico-madrid.svg': 'atletico-de-madrid.svg',
    'villarreal.svg': 'villarreal-cf.svg',
    'athletic-bilbao.svg': 'athletic-club.svg',
    'sevilla.svg': 'sevilla-fc.svg',
    'girona.svg': 'girona-fc.svg',
    'valencia.svg': 'valencia-cf.svg',
    'osasuna.svg': 'ca-osasuna.svg',
    'celta-de-vigo.svg': 'rc-celta-de-vigo.svg',
    'mallorca.svg': 'rcd-mallorca.svg',
    'getafe.svg': 'getafe-cf.svg',
    'almeria.svg': 'ud-almeria.svg',
    'granada.png': 'granada-cf.svg',
    'laspalmas.png': 'ud-las-palmas.svg',
    'alaves.svg': 'deportivo-alaves.svg',
    'cadiz.svg': 'cadiz-cf.svg',
    'elche.svg': 'elche-cf.svg',
    'espanyol.svg': 'rcd-espanyol.svg',
    'valladolid.svg': 'real-valladolid-cf.svg',
    'eibar.svg': 'sd-eibar.svg',
    'levante.svg': 'levante-ud.svg',
    'leganes.svg': 'cd-leganes.svg',
    'sporting-gijon.svg': 'sporting-de-gijon.svg',
    'racing-santander.svg': 'racing-de-santander.svg',
    'zaragoza.svg': 'real-zaragoza.svg',
    'tenerife.svg': 'cd-tenerife.svg',
    'deportivo-la-coruna.png': 'rc-deportivo-la-coruna.svg'
};

function getSlug(name) {
    return name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

const files = fs.readdirSync(logosDir);

console.log(`🔍 Iniciando correção para ESPANHA...`);

Object.entries(manualMap).forEach(([oldName, newName]) => {
    const oldPath = path.join(logosDir, oldName);
    const newPath = path.join(logosDir, newName);
    if (fs.existsSync(oldPath)) {
        console.log(`🛠️ Correção: ${oldName} -> ${newName}`);
        fs.renameSync(oldPath, newPath);
    }
});

console.log(`✅ Concluído.`);
