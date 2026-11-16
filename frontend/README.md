# AllpaNina frontend - final F0-F6 interface

React 19 + TypeScript 6 + Vite 8, Tailwind CSS 4, MapLibre GL and IBM Plex fonts. This is a static application: no FastAPI service or database is needed. Scientific processing and reproduction tools remain in `../allpanina/`, `../scripts/` and `../tests/`.

## Run and verify

Use Node.js 24. From this directory:

```sh
npm ci
npm run dev
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Open the local URL printed by Vite. PowerShell users with script execution restrictions can use `npm.cmd` and `npx.cmd`.

The full Ucayali byte-parity test also needs the original research ZIPs in `../tests/fixtures/`; run `ALLPANINA_LENTO=1 npm test`, or `$env:ALLPANINA_LENTO='1'; npm.cmd test` in PowerShell. The runner reports skipped tests explicitly when inputs or the opt-in are absent. Scientific Python tests use the root requirements and `python -m pytest tests/ -q` from the repository root.

## Routes and data

| Route | Delivered behaviour |
|---|---|
| `/` | Home: published 14-year calendar, department selection and data-derived featured months |
| `/calendar` | Monthly matrix, MODIS/VIIRS/B1 where published, historical analysis, CSV export and published WAPE |
| `/map` | Observed MODIS/VIIRS cells, basemap fallbacks, inspector, collapsible panels and legend inside the + tools menu |
| `/method` | Indicator, B0/B1, calibration, evaluation, limitations and downloadable scientific sources |
| `/my-region` | Five numbered sections, file validation, browser Worker processing and exploratory local results |
| `/about` | Team, sources, acknowledgements and ChatGPT/Codex/Claude disclosure; missing real details remain Pending |

Legacy `/calendario`, `/mapa`, `/metodo`, `/mi-region` redirect while preserving query and hash. Older root URLs carrying query parameters open Calendar. Region and period travel between exploration pages; Calendar and Map retain independent sensor/series choices.

Published Peru products are in `public/data/peru/`. `?data=pilot&mapRegion=PE-UCA` selects the Ucayali pilot, and `?data=demo` explicitly selects synthetic data. DEMO is never a silent fallback. Missing, unpublished and valid zero remain different states.

The map's department crop is visual only: boundary cells retain complete values and can include neighbouring detections. Department totals come from the published CSV. A 10 km national geometry aggregates 1 km cell-days; it is not a count of distinct fire days or burned area. B1 is a calibrated region-month estimate, never a map sensor or a cell-level product. WAPE is retrospective error, not future confidence.

## Production

Publish only `dist/` after `npm ci` and `npm run build`, at the domain root. `npm run preview` is for local inspection of that artifact. Configure SPA page fallback separately from real 404 responses for absent `/data/`, `/cartography/` and `/assets/` files. Compress JSON/GeoJSON over HTTP.

No environment variable is required for published exploration. Optional `VITE_FIRMS_BASE` sets a FIRMS proxy base at build time. All `VITE_*` values are public: never put keys in them. My region asks the user for a FIRMS MAP_KEY if automatic downloading is selected; manual CSV upload remains available when the upstream service or browser access fails. Browser files and results are processed locally.

See the [ISPConfig/Nginx deployment guide](../DEPLOYMENT.md). A successful local build does not certify hosting headers, external services or mobile rendering.

## Architecture and evidence

- `src/features/`: Home, About and Calendar.
- `src/pages/`: Map, Method, My region and Not Found.
- `src/shell/`, `src/ui/`: shared navigation and visual components.
- `src/services/data/`: validated readers of published products.
- `src/services/region/`: browser-side processing, local storage and Worker.
- `src/pages/method/publicCopy.json`: reviewable English explanations linked to original source fields and SHA-256; original scientific products remain unchanged.
- `tests/`: contracts, UI interaction, route compatibility, scientific values and parity checks.

[Reproducibility guide](../REPRODUCIBILITY.md), [published scientific method](public/data/peru/method.json), [evaluation](public/data/peru/validation.json), [fixture provenance](../tests/fixtures/PROVENANCE.json). Internal implementation reports are archived locally and are not required to run the site or its tests.
