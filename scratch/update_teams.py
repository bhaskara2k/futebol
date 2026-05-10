
import sys

with open('/home/hiagomedeiros/Documentos/futebol-integration/src/data/europe.data.ts', 'r') as f:
    lines = f.readlines()

ita_start = 410 # 0-indexed line 411 is 410
ita_end = 571 # 0-indexed line 572 is 571

ita_teams = [
    '{ teamName: "AC MILAN", countryId: "ITA", players: [] },',
    '{ teamName: "INTER MILAN", countryId: "ITA", players: [] },',
    '{ teamName: "JUVENTUS", countryId: "ITA", players: [] },',
    '{ teamName: "SSC NAPOLI", countryId: "ITA", players: [] },',
    '{ teamName: "LAZIO", countryId: "ITA", players: [] },',
    '{ teamName: "AS ROMA", countryId: "ITA", players: [] },',
    '{ teamName: "ATALANTA BC", countryId: "ITA", players: [] },',
    '{ teamName: "ACF FIORENTINA", countryId: "ITA", players: [] },',
    '{ teamName: "BOLOGNA FC", countryId: "ITA", players: [] },',
    '{ teamName: "TORINO FC", countryId: "ITA", players: [] },',
    '{ teamName: "AC MONZA", countryId: "ITA", players: [] },',
    '{ teamName: "GENOA CFC", countryId: "ITA", players: [] },',
    '{ teamName: "US LECCE", countryId: "ITA", players: [] },',
    '{ teamName: "UDINESE CALCIO", countryId: "ITA", players: [] },',
    '{ teamName: "CAGLIARI CALCIO", countryId: "ITA", players: [] },',
    '{ teamName: "HELLAS VERONA", countryId: "ITA", players: [] },',
    '{ teamName: "US SASSUOLO", countryId: "ITA", players: [] },',
    '{ teamName: "FROSINONE CALCIO", countryId: "ITA", players: [] },',
    '{ teamName: "US SALERNITANA", countryId: "ITA", players: [] },',
    '{ teamName: "EMPOLI FC", countryId: "ITA", players: [] },',
    '{ teamName: "UC SAMPDORIA", countryId: "ITA", players: [] },',
    '{ teamName: "SPEZIA CALCIO", countryId: "ITA", players: [] },',
    '{ teamName: "US CREMONESE", countryId: "ITA", players: [] },',
    '{ teamName: "VENEZIA FC", countryId: "ITA", players: [] },',
    '{ teamName: "SSC BARI", countryId: "ITA", players: [] },',
    '{ teamName: "US CATANZARO", countryId: "ITA", players: [] },',
    '{ teamName: "COMO 1907", countryId: "ITA", players: [] },',
    '{ teamName: "MODENA FC", countryId: "ITA", players: [] },',
    '{ teamName: "PALERMO FC", countryId: "ITA", players: [] },',
    '{ teamName: "PARMA CALCIO", countryId: "ITA", players: [] },',
    '{ teamName: "PISA SC", countryId: "ITA", players: [] },',
    '{ teamName: "REGGIANA 1919", countryId: "ITA", players: [] },'
]

ger_start = 571 # Original line 572
ger_end = 732 # Original line 733

ger_teams = [
    '{ teamName: "BAYER LEVERKUSEN", countryId: "GER", players: [] },',
    '{ teamName: "BAYERN MUNICH", countryId: "GER", players: [] },',
    '{ teamName: "VFB STUTTGART", countryId: "GER", players: [] },',
    '{ teamName: "RB LEIPZIG", countryId: "GER", players: [] },',
    '{ teamName: "BORUSSIA DORTMUND", countryId: "GER", players: [] },',
    '{ teamName: "EINTRACHT FRANKFURT", countryId: "GER", players: [] },',
    '{ teamName: "TSG HOFFENHEIM", countryId: "GER", players: [] },',
    '{ teamName: "SC FREIBURG", countryId: "GER", players: [] },',
    '{ teamName: "FC HEIDENHEIM", countryId: "GER", players: [] },',
    '{ teamName: "FC AUGSBURG", countryId: "GER", players: [] },',
    '{ teamName: "WERDER BREMEN", countryId: "GER", players: [] },',
    '{ teamName: "VFL WOLFSBURG", countryId: "GER", players: [] },',
    '{ teamName: "FSV MAINZ 05", countryId: "GER", players: [] },',
    '{ teamName: "BORUSSIA MÖNCHENGLADBACH", countryId: "GER", players: [] },',
    '{ teamName: "UNION BERLIN", countryId: "GER", players: [] },',
    '{ teamName: "VFL BOCHUM", countryId: "GER", players: [] },',
    '{ teamName: "FC KÖLN", countryId: "GER", players: [] },',
    '{ teamName: "SV DARMSTADT 98", countryId: "GER", players: [] },',
    '{ teamName: "SCHALKE 04", countryId: "GER", players: [] },',
    '{ teamName: "HERTHA BSC", countryId: "GER", players: [] },',
    '{ teamName: "HAMBURG SV", countryId: "GER", players: [] },',
    '{ teamName: "FORTUNA DÜSSELDORF", countryId: "GER", players: [] },',
    '{ teamName: "HANNOVER 96", countryId: "GER", players: [] },',
    '{ teamName: "SC PADERBORN 07", countryId: "GER", players: [] },',
    '{ teamName: "SPVGG GREUTHER FÜRTH", countryId: "GER", players: [] },',
    '{ teamName: "FC KAISERSLAUTERN", countryId: "GER", players: [] },',
    '{ teamName: "FC ST. PAULI", countryId: "GER", players: [] },',
    '{ teamName: "HOLSTEIN KIEL", countryId: "GER", players: [] },',
    '{ teamName: "SV ELVERSBERG", countryId: "GER", players: [] },',
    '{ teamName: "FC MAGDEBURG", countryId: "GER", players: [] },',
    '{ teamName: "HANSA ROSTOCK", countryId: "GER", players: [] },',
    '{ teamName: "WEHEN WIESBADEN", countryId: "GER", players: [] },'
]

fra_start = 732 # Original line 733
fra_end = 893 # Original line 894

fra_teams = [
    '{ teamName: "PARIS SAINT-GERMAIN", countryId: "FRA", players: [] },',
    '{ teamName: "AS MONACO", countryId: "FRA", players: [] },',
    '{ teamName: "STADE BRESTOIS 29", countryId: "FRA", players: [] },',
    '{ teamName: "LILLE OSC", countryId: "FRA", players: [] },',
    '{ teamName: "OGC NICE", countryId: "FRA", players: [] },',
    '{ teamName: "RC LENS", countryId: "FRA", players: [] },',
    '{ teamName: "OLYMPIQUE LYONNAIS", countryId: "FRA", players: [] },',
    '{ teamName: "OLYMPIQUE DE MARSEILLE", countryId: "FRA", players: [] },',
    '{ teamName: "STADE DE REIMS", countryId: "FRA", players: [] },',
    '{ teamName: "STADE RENNAIS FC", countryId: "FRA", players: [] },',
    '{ teamName: "TOULOUSE FC", countryId: "FRA", players: [] },',
    '{ teamName: "MONTPELLIER HSC", countryId: "FRA", players: [] },',
    '{ teamName: "RC STRASBOURG", countryId: "FRA", players: [] },',
    '{ teamName: "FC NANTES", countryId: "FRA", players: [] },',
    '{ teamName: "LE HAVRE AC", countryId: "FRA", players: [] },',
    '{ teamName: "FC METZ", countryId: "FRA", players: [] },',
    '{ teamName: "FC LORIENT", countryId: "FRA", players: [] },',
    '{ teamName: "CLERMONT FOOT 63", countryId: "FRA", players: [] },',
    '{ teamName: "AJ AUXERRE", countryId: "FRA", players: [] },',
    '{ teamName: "ANGERS SCO", countryId: "FRA", players: [] },',
    '{ teamName: "AS SAINT-ÉTIENNE", countryId: "FRA", players: [] },',
    '{ teamName: "RODEZ AF", countryId: "FRA", players: [] },',
    '{ teamName: "PARIS FC", countryId: "FRA", players: [] },',
    '{ teamName: "SM CAEN", countryId: "FRA", players: [] },',
    '{ teamName: "EA GUINGAMP", countryId: "FRA", players: [] },',
    '{ teamName: "AC AJACCIO", countryId: "FRA", players: [] },',
    '{ teamName: "GRENOBLE FOOT 38", countryId: "FRA", players: [] },',
    '{ teamName: "AMIENS SC", countryId: "FRA", players: [] },',
    '{ teamName: "PAU FC", countryId: "FRA", players: [] },',
    '{ teamName: "SC BASTIA", countryId: "FRA", players: [] },',
    '{ teamName: "FC ANNECY", countryId: "FRA", players: [] },',
    '{ teamName: "US CONCARNEAU", countryId: "FRA", players: [] },'
]

# We must replace from bottom to top or keep track of indices.
# Bottom up:
new_lines = lines[:fra_start] + ["  // French Teams (EU) - 16 Primera + 8 Segunda + 8 Terceira\n"] + [f"  {t}\n" for t in fra_teams] + lines[fra_end:]
new_lines = new_lines[:ger_start] + ["  // German Teams (EU) - 16 Primera + 8 Segunda + 8 Terceira\n"] + [f"  {t}\n" for t in ger_teams] + new_lines[ger_end:]
new_lines = new_lines[:ita_start] + ["  // Italian Teams (EU) - 16 Primera + 8 Segunda + 8 Terceira\n"] + [f"  {t}\n" for t in ita_teams] + new_lines[ita_end:]

with open('/home/hiagomedeiros/Documentos/futebol-integration/src/data/europe.data.ts', 'w') as f:
    f.writelines(new_lines)
