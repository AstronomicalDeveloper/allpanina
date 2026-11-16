# AllpaNina

**A reproducible history of satellite thermal activity, with an explicit comparison between MODIS and VIIRS.**

Built for the **NASA Space Apps Challenge 2026**. *Allpa* means land and *nina* means fire in Quechua. [Source repository](https://github.com/AstronomicalDeveloper/allpanina). A public deployment is planned; no live application URL is claimed yet.

## Why this project?

MODIS and VIIRS observe the same planet with different instruments and pixel sizes. Joining their raw detection counts produces an apparent jump that can reflect the change of sensor rather than a change in fire activity.

AllpaNina goes beyond displaying hotspots: it builds comparable cell-day series, publishes the calibration and its measured error, distinguishes observations from estimates, and retains the inputs and tests needed to reproduce its outputs. The delivered national record covers **January 2013 to July 2026**, Peru and its 25 departments, with the earlier Ucayali pilot available separately.

## Explore

| Page | What it offers |
|---|---|
| **Home** | A 14-year calendar, department selection and data-derived featured months |
| **Calendar** | Monthly MODIS/VIIRS and published B1 estimates, historical comparisons, CSV export and evaluation warnings |
| **Map** | Observed MODIS/VIIRS cells, basemap fallbacks, selectable cells, mobile panels and a legend inside the **+** tools menu |
| **Method** | Indicator, calibration, published evaluation, limitations, provenance and source downloads |
| **My region** | A five-section workflow to load FIRMS files and generate exploratory results locally in a browser Worker |
| **About** | Team contributions, data acknowledgements and AI disclosure |

Routes: `/`, `/calendar`, `/map`, `/method`, `/my-region`, `/about`. Legacy Spanish routes redirect while preserving query parameters and anchors. `?data=pilot&mapRegion=PE-UCA` opens the pilot; `?data=demo` explicitly selects synthetic data. Failed loads never silently switch to DEMO.

## Scientific method

1. Filter and organise FIRMS thermal detections by sensor, spatial cell and local day. Repeated detections in the same cell-day count once for that sensor group.
2. Aggregate **cell-days** into regional monthly observations. A regional total can exceed the number of days in a month.
3. Compare unscaled VIIRS (**B0**) with a calibrated estimate (**B1 = B0 times kappa**). Factors are fitted on training, with separate validation and test periods. National B1 sums the published department estimates using their own or grouped factors.
4. Publish retrospective metrics, residuals and limitations alongside the observations. The map retains observed values: B1 is a **region-month estimate**, never a cell-level satellite observation.

Read the [data contract](docs/contrato_datos.md), [scientific source guide](docs/peru/SOURCE_README.md), [decisions and assumptions](DECISIONS.md), and published [method](frontend/public/data/peru/method.json), [evaluation](frontend/public/data/peru/validation.json) and [manifest](frontend/public/data/peru/manifest.json).

## Technology and architecture

- **Web:** React, TypeScript, Vite, Tailwind CSS, MapLibre GL and locally served IBM Plex fonts.
- **Science:** Python, pandas, NumPy, PyArrow, pyproj and Shapely.
- **Validation:** Node test runner, JSDOM, pytest and GitHub Actions.

```text
frontend/             Static web app, browser Worker and interface tests
frontend/public/data/ Frozen scientific products and manifests
allpanina/            Reproducible scientific Python package and CLI
scripts/              Preparation and publication utilities
scripts/data/         Country codes and time-zone reference tables
tests/                Scientific tests and byte-parity regressions
docs/                 Contracts, provenance, research inputs and technical guides
```

The website consumes static files; no FastAPI server, database or authentication service is required. My region processes files on the user's computer and marks its outputs as exploratory.

## Run locally

Use **Node.js 24**. In `frontend/`:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. In PowerShell, `npm.cmd` and `npx.cmd` work when `.ps1` scripts are restricted. See the [frontend guide](frontend/README.md) for configuration and route details.

## Tests and reproducibility

Frontend, from `frontend/`:

```sh
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Include Ucayali byte parity with `ALLPANINA_LENTO=1 npm test`; PowerShell: `$env:ALLPANINA_LENTO='1'; npm.cmd test`.

Scientific checks, from the repository root, using Python 3.12 or newer:

```sh
python -m venv .venv
# Linux/macOS: .venv/bin/python; Windows: .venv/Scripts/python.exe
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m pytest tests/ -q
ALLPANINA_LENTO=1 .venv/bin/python -m pytest tests/ -q
```

PowerShell: set `$env:ALLPANINA_LENTO='1'` before running the Python command. If the repository and system temporary directory are on different Windows drives, use a dedicated `--basetemp .cache/pytest-local` directory on the repository drive; pytest clears that dedicated directory.

The slow regressions use the original FIRMS ZIPs retained in `docs/` and compare Peru and Ucayali with published outputs byte for byte. The package also provides `python -m allpanina --verificar`. These are reproducibility checks, not a new scientific evaluation or permission to recalibrate frozen results. [Research inputs and provenance](docs/datos.md).

## Sources and acknowledgements

- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/): MODIS Collection 6.1 (MCD14ML, Terra/Aqua) and VIIRS 375 m (VNP14IMGML, Suomi NPP) standard archives. We acknowledge FIRMS, NASA LANCE and ESDIS.
- [INEI Peru](https://ide.inei.gob.pe/): official department boundaries, updated to 2023.
- [MINAM Geoservidor](https://geoservidorperu.minam.gob.pe/): reference cartography and protected natural areas.
- [NASA GIBS](https://gibs.earthdata.nasa.gov/) and Esri: map imagery, basemaps and reference overlays; provider attribution remains in the map.
- [geoBoundaries](https://www.geoboundaries.org/): world administrative boundaries, mostly CC BY 4.0 with country-specific licences in the [catalogue](frontend/public/cartography/world/index.json).
- IANA time-zone reference data and IBM Plex fonts (SIL Open Font License); see the source tables and frontend acknowledgements.

FIRMS data are provided as is and are not intended for tactical emergency decisions. Original sources retain their own terms; the code licence does not relicense the data.

## Scientific limits

A thermal detection is **not a confirmed wildfire or burned area**. Zero, missing data and unpublished periods have different meanings. FIRMS does not provide cloud-cover observations, so zero detections do not prove absence of fire.

A fixed factor can underestimate extreme peaks or overestimate quiet periods. Retrospective WAPE is **not accuracy or a confidence percentage for future months**. Ucayali's test was examined earlier; the separate national analysis excluding Ucayali must be read with its published context. My region outputs have not received the same regional review as the frozen national products. See the complete limitations in [Method](frontend/public/data/peru/method.json).

The national map's 10 km geometries aggregate 1 km cell-days. Department clipping is visual: boundary cells retain complete values, while department totals come from the CSV. The delivered series ends in July 2026; later sensor availability does not extend the validated record automatically.

## Team and contributions

| Member | Agreed responsibilities |
|---|---|
| Aldo | Scientific method, study area, data contracts and frozen test period |
| Marco | FIRMS acquisition, normalisation, cell-days, series and observed maps |
| Antonella | B0/B1 calibration, error metrics, residuals, validation and test |
| Juan Matías | Interactive React/MapLibre map, filters, interactions and integration tests |
| Landry | Web architecture, calendar, method, integration and deployment |
| Adriana | Wireframes, visual system, accessibility, legends, video and pitch |

Full names, affiliations and biographies remain pending confirmation by the members. No awards or affiliations are claimed.

## AI, licence and deployment

The team used **ChatGPT and Codex (OpenAI)** and **Claude (Anthropic)** for programming, documentation, review and technical assistance. Scientific decisions and final validation remain human responsibilities. Read [AI_USE.md](AI_USE.md).

Code is released under the [MIT License](LICENSE). Data, imagery and fonts retain their source licences.

The planned target is a **static site on Ubuntu with ISPConfig and Nginx**, potentially `allpanina.astrodev.pe`; it is **not deployed by this repository task**. Build with `npm ci && npm run build` and publish only `frontend/dist/`, never the repository or research ZIPs. The [deployment guide](docs/DESPLIEGUE_ESTATICO.md) covers isolated web roots, HTTPS, SPA routes, real resource 404s, compression, caching, Workers and verification without changing the existing BugLab site.

For maintenance evidence, see the [predeployment audit](docs/AUDITORIA_PREDEPLOY.md). Historical implementation notes remain linked from the frontend guide, rather than being presented as current features.
