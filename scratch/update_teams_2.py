
import sys

with open('/home/hiagomedeiros/Documentos/futebol-integration/src/data/europe.data.ts', 'r') as f:
    lines = f.readlines()

rus_start = 510 # Line 511
rus_end = 672   # Line 673

por_start = 673 # Line 674
por_end = 836   # Line 837

ned_start = 837 # Line 838
ned_end = 1000  # Line 1001 (approx, wait, let's check)

rus_teams = [
    '{ teamName: "ZENIT ST. PETERSBURG", countryId: "RUS", players: [] },',
    '{ teamName: "FK KRASNODAR", countryId: "RUS", players: [] },',
    '{ teamName: "DYNAMO MOSCOW", countryId: "RUS", players: [] },',
    '{ teamName: "SPARTAK MOSCOW", countryId: "RUS", players: [] },',
    '{ teamName: "LOKOMOTIV MOSCOW", countryId: "RUS", players: [] },',
    '{ teamName: "CSKA MOSCOW", countryId: "RUS", players: [] },',
    '{ teamName: "FK ROSTOV", countryId: "RUS", players: [] },',
    '{ teamName: "RUBIN KAZAN", countryId: "RUS", players: [] },'
]

por_teams = [
    '{ teamName: "SL BENFICA", countryId: "POR", players: [] },',
    '{ teamName: "FC PORTO", countryId: "POR", players: [] },',
    '{ teamName: "SPORTING CP", countryId: "POR", players: [] },',
    '{ teamName: "SC BRAGA", countryId: "POR", players: [] },',
    '{ teamName: "VITÓRIA SC", countryId: "POR", players: [] },',
    '{ teamName: "MOREIRENSE FC", countryId: "POR", players: [] },',
    '{ teamName: "FC AROUCA", countryId: "POR", players: [] },',
    '{ teamName: "RIO AVE FC", countryId: "POR", players: [] },',
    '{ teamName: "GIL VICENTE FC", countryId: "POR", players: [] },',
    '{ teamName: "GD ESTORIL PRAIA", countryId: "POR", players: [] },',
    '{ teamName: "BOAVISTA FC", countryId: "POR", players: [] },',
    '{ teamName: "ESTRELA DA AMADORA", countryId: "POR", players: [] },',
    '{ teamName: "FC FAMALICÃO", countryId: "POR", players: [] },',
    '{ teamName: "PORTIMONENSE SC", countryId: "POR", players: [] },',
    '{ teamName: "SC FARENSE", countryId: "POR", players: [] },',
    '{ teamName: "GD CHAVES", countryId: "POR", players: [] },',
    '{ teamName: "CD VIZELA", countryId: "POR", players: [] },',
    '{ teamName: "CASA PIA AC", countryId: "POR", players: [] },',
    '{ teamName: "SANTA CLARA", countryId: "POR", players: [] },',
    '{ teamName: "NACIONAL DA MADEIRA", countryId: "POR", players: [] },',
    '{ teamName: "AVS FUTEBOL SAD", countryId: "POR", players: [] },',
    '{ teamName: "MARÍTIMO", countryId: "POR", players: [] },',
    '{ teamName: "PAÇOS DE FERREIRA", countryId: "POR", players: [] },',
    '{ teamName: "GD TORREENSE", countryId: "POR", players: [] },'
]

ned_teams = [
    '{ teamName: "PSV EINDHOVEN", countryId: "NED", players: [] },',
    '{ teamName: "FEYENOORD", countryId: "NED", players: [] },',
    '{ teamName: "FC TWENTE", countryId: "NED", players: [] },',
    '{ teamName: "AZ ALKMAAR", countryId: "NED", players: [] },',
    '{ teamName: "AJAX", countryId: "NED", players: [] },',
    '{ teamName: "NEC NIJMEGEN", countryId: "NED", players: [] },',
    '{ teamName: "FC UTRECHT", countryId: "NED", players: [] },',
    '{ teamName: "SPARTA ROTTERDAM", countryId: "NED", players: [] },',
    '{ teamName: "GO AHEAD EAGLES", countryId: "NED", players: [] },',
    '{ teamName: "FORTUNA SITTARD", countryId: "NED", players: [] },',
    '{ teamName: "SC HEERENVEEN", countryId: "NED", players: [] },',
    '{ teamName: "PEC ZWOLLE", countryId: "NED", players: [] },',
    '{ teamName: "ALMERE CITY", countryId: "NED", players: [] },',
    '{ teamName: "HERACLES ALMELO", countryId: "NED", players: [] },',
    '{ teamName: "RKC WAALWIJK", countryId: "NED", players: [] },',
    '{ teamName: "VITESSE", countryId: "NED", players: [] },'
]

# Process bottom up
new_lines = lines[:ned_start] + ["  // HOLANDA - 8 Primera + 8 Segunda\n"] + [f"  {t}\n" for t in ned_teams] + lines[ned_end:]
new_lines = new_lines[:por_start] + ["  // PORTUGAL - 12 Primera + 12 Segunda\n"] + [f"  {t}\n" for t in por_teams] + new_lines[por_end:]
new_lines = new_lines[:rus_start] + ["  // RUSSIA - 8 Primera\n"] + [f"  {t}\n" for t in rus_teams] + new_lines[rus_end:]

with open('/home/hiagomedeiros/Documentos/futebol-integration/src/data/europe.data.ts', 'w') as f:
    f.writelines(new_lines)
