'use strict';

/**
 * Converts the UBIGEO CSV into two JSON files:
 *   data/ubigeo.json       — hierarchical: dept > prov > dist
 *   data/search-index.json — flat array with _searchKey for fuzzy matching
 *
 * Usage: node scripts/build-json.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_PATH = path.join(__dirname, '..', 'UBIGEO 2022_1891 distritos.xlsx - UBIGEO.csv');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Normaliza texto para búsqueda: mayúsculas + sin tildes
function normalize(str) {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function build() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV no encontrado:', CSV_PATH);
    process.exit(1);
  }

  const ubigeo = {};      // { "01": { code, name, provincias: { "0101": { code, name, distritos: {} } } } }
  const searchIndex = []; // [{ _searchKey, codigo, nombre, capital, regionNatural, provincia, departamento }]

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let lineCount = 0;

  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }
    if (!line.trim()) continue;

    // IDDIST,NOMBDEP,NOMBPROV,NOMBDIST,NOM_CAPITAL (LEGAL),COD_ REG_NAT,REGION NATURAL
    const parts = line.split(',');
    if (parts.length < 7) continue;

    const [iddist, nombdep, nombprov, nombdist, capital, codRegNat, ...regionParts] = parts;
    const regionNatural = regionParts.join(',').trim(); // por si hubiera comas en el nombre

    const depCode  = iddist.slice(0, 2);
    const provCode = iddist.slice(0, 4);

    // Departamento
    if (!ubigeo[depCode]) {
      ubigeo[depCode] = { codigo: depCode, nombre: nombdep, provincias: {} };
    }

    // Provincia
    if (!ubigeo[depCode].provincias[provCode]) {
      ubigeo[depCode].provincias[provCode] = { codigo: provCode, nombre: nombprov, distritos: {} };
    }

    // Distrito
    ubigeo[depCode].provincias[provCode].distritos[iddist] = {
      codigo: iddist,
      nombre: nombdist,
      capital: capital,
      codigoRegionNatural: parseInt(codRegNat, 10),
      regionNatural: regionNatural,
    };

    // Índice de búsqueda — incluye nombre de dist, prov y dep para búsqueda cross-level
    searchIndex.push({
      _searchKey: [normalize(nombdist), normalize(nombprov), normalize(nombdep)].join(' '),
      codigo: iddist,
      nombre: nombdist,
      capital: capital,
      regionNatural: regionNatural,
      provincia:     { codigo: provCode, nombre: nombprov },
      departamento:  { codigo: depCode,  nombre: nombdep  },
    });

    lineCount++;
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(DATA_DIR, 'ubigeo.json'),
    JSON.stringify(ubigeo),
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'search-index.json'),
    JSON.stringify(searchIndex),
  );

  const depCount  = Object.keys(ubigeo).length;
  const provCount = Object.values(ubigeo).reduce((a, d) => a + Object.keys(d.provincias).length, 0);

  console.log(`✓ Generado: ${depCount} departamentos, ${provCount} provincias, ${lineCount} distritos`);
  console.log(`  → data/ubigeo.json`);
  console.log(`  → data/search-index.json`);
}

build().catch((err) => { console.error(err); process.exit(1); });
