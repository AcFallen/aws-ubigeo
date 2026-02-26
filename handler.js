'use strict';

const ubigeo      = require('./data/ubigeo.json');
const searchIndex = require('./data/search-index.json');

// ─── helpers ────────────────────────────────────────────────────────────────

const ok  = (body)  => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const err = (code, msg) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: msg }) });

function normalize(str) {
  return str.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ─── GET /departamentos ──────────────────────────────────────────────────────

exports.getDepartamentos = async () => {
  const result = Object.values(ubigeo).map(d => ({
    codigo: d.codigo,
    nombre: d.nombre,
  }));
  return ok(result);
};

// ─── GET /departamentos/{code} ───────────────────────────────────────────────

exports.getDepartamento = async (event) => {
  const code = event.pathParameters?.code;
  const dep = ubigeo[code];
  if (!dep) return err(404, `Departamento '${code}' no encontrado`);

  return ok({
    codigo: dep.codigo,
    nombre: dep.nombre,
    provincias: Object.values(dep.provincias).map(p => ({
      codigo: p.codigo,
      nombre: p.nombre,
    })),
  });
};

// ─── GET /provincias/{code} ──────────────────────────────────────────────────

exports.getProvincia = async (event) => {
  const code = event.pathParameters?.code; // e.g. "0101"
  if (!code || code.length !== 4) return err(400, 'El código de provincia debe tener 4 dígitos');

  const depCode = code.slice(0, 2);
  const dep = ubigeo[depCode];
  if (!dep) return err(404, `Provincia '${code}' no encontrada`);

  const prov = dep.provincias[code];
  if (!prov) return err(404, `Provincia '${code}' no encontrada`);

  return ok({
    codigo: prov.codigo,
    nombre: prov.nombre,
    departamento: { codigo: dep.codigo, nombre: dep.nombre },
    distritos: Object.values(prov.distritos).map(d => ({
      codigo: d.codigo,
      nombre: d.nombre,
    })),
  });
};

// ─── GET /distritos/{code} ───────────────────────────────────────────────────

exports.getDistrito = async (event) => {
  const code = event.pathParameters?.code; // e.g. "150140"
  if (!code || code.length !== 6) return err(400, 'El código de distrito debe tener 6 dígitos');

  const depCode  = code.slice(0, 2);
  const provCode = code.slice(0, 4);

  const dep  = ubigeo[depCode];
  const prov = dep?.provincias[provCode];
  const dist = prov?.distritos[code];

  if (!dist) return err(404, `Distrito '${code}' no encontrado`);

  return ok({
    codigo:             dist.codigo,
    nombre:             dist.nombre,
    capital:            dist.capital,
    regionNatural:      dist.regionNatural,
    provincia:     { codigo: prov.codigo, nombre: prov.nombre },
    departamento:  { codigo: dep.codigo,  nombre: dep.nombre  },
  });
};

// ─── GET /buscar?q={query}&limit={n} ────────────────────────────────────────
//
// Busca distritos (y también por nombre de provincia o departamento).
// Devuelve el árbol completo: distrito → provincia → departamento.
//
// Ejemplos:
//   /buscar?q=paucarpata
//   /buscar?q=san isidro
//   /buscar?q=arequipa&limit=5

exports.buscar = async (event) => {
  const q     = event.queryStringParameters?.q     ?? '';
  const limit = parseInt(event.queryStringParameters?.limit ?? '20', 10);

  if (q.trim().length < 2) {
    return err(400, 'El parámetro q debe tener al menos 2 caracteres');
  }

  // Divide la búsqueda en palabras para que "san isidro" funcione como AND
  const terms = normalize(q.trim()).split(/\s+/).filter(Boolean);

  const matches = searchIndex
    .filter(item => terms.every(t => item._searchKey.includes(t)))
    .slice(0, limit)
    .map(({ _searchKey, ...item }) => item); // quita el campo interno

  return ok({
    query:      q,
    total:      matches.length,
    resultados: matches,
  });
};
