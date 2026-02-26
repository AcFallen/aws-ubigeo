# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal AWS Lambda HTTP API built with the Serverless Framework v4, Node.js 20.x, and API Gateway (HTTP API v2). Single GET endpoint at `/` returning a JSON response.

## Commands

**Regenerar JSON estático** (correr si el CSV cambia):
```bash
node scripts/build-json.js
```

**Local development** (tunnels a AWS Lambda, sin redeploy):
```bash
serverless dev
```

**Deploy a AWS**:
```bash
serverless deploy
```

## Endpoints

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/departamentos` | Lista todos los departamentos |
| GET | `/departamentos/{code}` | Departamento + sus provincias (`code` = 2 dígitos, ej. `15`) |
| GET | `/provincias/{code}` | Provincia + sus distritos (`code` = 4 dígitos, ej. `1501`) |
| GET | `/distritos/{code}` | Distrito + árbol completo (`code` = 6 dígitos, ej. `150140`) |
| GET | `/buscar?q=...&limit=20` | Búsqueda por coincidencia en nombre de distrito/provincia/departamento |

La búsqueda soporta múltiples palabras (AND): `/buscar?q=san isidro` filtra por ambos términos. Normaliza tildes y mayúsculas.

## Architecture

```
HTTP GET /buscar?q=paucarpata
  → API Gateway (HTTP API v2)
    → Lambda (handler.buscar)
      → data/search-index.json  ← flat array, 1891 entradas
        → filtra por _searchKey (nombre dist + prov + dep, sin tildes)
          → devuelve { codigo, nombre, capital, regionNatural, provincia, departamento }
```

```
HTTP GET /departamentos/{code}
  → Lambda (handler.getDepartamento)
    → data/ubigeo.json  ← jerarquía dept > prov > dist
      → devuelve departamento + array de provincias
```

- **Service**: `aws-ubigeo` (Serverless org: `fallen`, app: `ubigeo-aws`)
- **Runtime**: Node.js 20.x CommonJS — no cambiar a ESM sin actualizar todos los `require`
- **Base de datos estática**: `data/ubigeo.json` (jerarquía, 238 KB) y `data/search-index.json` (búsqueda, 428 KB) se cargan en memoria al arrancar el Lambda container
- **API es pública** por defecto — agregar authorizer antes de producción

## Estructura de datos

Los códigos ubigeo siguen la convención INEI:
- `01` → departamento (2 dígitos)
- `0101` → provincia (4 dígitos = dep + prov)
- `010101` → distrito (6 dígitos = dep + prov + dist)

El CSV fuente es `UBIGEO 2022_1891 distritos.xlsx - UBIGEO.csv` (25 departamentos, 196 provincias, 1891 distritos). Para regenerar los JSON correr `node scripts/build-json.js`.
