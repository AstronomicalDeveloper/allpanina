# Reproducibility

This is the starting point for verifying AllpaNina. You do not need to search internal reports or guess an execution order.

The website reads the published products in `frontend/public/data/`. Research inputs are not required to open the website. They are retained separately in [`tests/fixtures/`](tests/fixtures/) so an independent checkout can verify that the processing code still reproduces those products.

## 1. Prepare a clean checkout

Use Node.js 24 and Python 3.12 or newer. From the repository root:

```sh
git clone https://github.com/AstronomicalDeveloper/allpanina.git
cd allpanina
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cd frontend
npm ci
cd ..
```

On Windows replace `.venv/bin/python` with `.venv/Scripts/python.exe`. If PowerShell blocks npm scripts, use `npm.cmd` and `npx.cmd`.

## 2. Check normal behaviour

```sh
.venv/bin/python -m pytest tests/ -q
cd frontend
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
cd ..
```

These tests check data contracts, zero/missing/unpublished states, regional aggregation, calibration boundaries, error handling, map interactions, routing and scientific values. The two complete Python regressions and one complete browser-processing regression are opt-in because they process the original archives; a normal run reports them as skipped, not as passed.

## 3. Reproduce the published results

Linux/macOS, from the repository root:

```sh
ALLPANINA_LENTO=1 .venv/bin/python -m pytest tests/ -q
cd frontend
ALLPANINA_LENTO=1 npm test
```

Windows PowerShell:

```powershell
$env:ALLPANINA_LENTO='1'
.venv/Scripts/python.exe -m pytest tests/ -q --basetemp .cache/pytest-reproduction
cd frontend
npm.cmd test
```

The dedicated `--basetemp` directory is managed and cleared by pytest: do not point it at personal files. Keeping it on the repository drive also avoids the Windows cross-drive `relpath` issue.

The slow checks take several minutes. Expected outcome: all selected tests pass, including:

| Check | Evidence |
|---|---|
| `tests/test_algoritmo.py::test_regresion_reproduce_lo_publicado` | Original MODIS/VIIRS inputs reproduce Peru monthly observations, calibrated series and 14 yearly maps byte for byte |
| `tests/test_region.py::test_regresion_ucayali_reproduce_el_piloto` | Regional Python processing reproduces the Ucayali pilot, its factor/series and maps |
| `frontend/tests/region-pipeline.test.ts` with slow mode | Browser-side regional processing reproduces Ucayali series, B0/B1 and 14 maps byte for byte |
| `frontend/tests/department-navigation.test.ts` | Simplified navigation boundaries retain the original INEI codes and extent |
| `tests/test_manifest_download.py` | Archive hashes agree with the independently recorded fixture provenance and the files on disk |

For the packaged Peru verifier alone:

```sh
.venv/bin/python -m allpanina --verificar
```

The verifier writes generated output to a temporary location and reports `OK` for matching files. It does not overwrite the published dataset. Tests also use isolated output directories. Do not run calibration/publication scripts against `frontend/public/data/` merely to check the installation.

## 4. What the fixtures contain

[`tests/fixtures/PROVENANCE.json`](tests/fixtures/PROVENANCE.json) records each retained input's SHA-256, original path and source commit. Files were copied without changing their bytes.

| Input | Purpose and source |
|---|---|
| `DL_FIRE_M-C61_848370.zip` | NASA FIRMS standard MODIS archive; archive entry `fire_archive_M-C61_848370.csv` |
| `DL_FIRE_SV-C2_848371.zip` | NASA FIRMS standard VIIRS archive; archive entry `fire_archive_SV-C2_848371.csv` |
| `region/*.geojson` | Original INEI 2023 Ucayali and department polygons for assignment and navigation checks |
| `peru/AUTORIZACION_TEST.md` | Original scientific authorisation used as a parser/reference input; retained intact, not a new authorisation |
| `peru/valid/method.json` | Frozen calibration reference used to verify final publication assembly |
| `peru/test/*` | Frozen series and evaluation reference files used to check deterministic publication and its approved hashes |
| `peru/ejemplo/monthly_series.csv` | Earlier regional reference required by the reserved-test workflow |

The archive files are the exact original requests, not a promise that a new FIRMS download will have identical archive packaging. The loader checks SHA-256; do not bypass a mismatch just to obtain a green result. FIRMS provides standard and near-real-time products with different fields: the tests use the retained standard archives, not an arbitrary replacement.

Sources and terms: [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) and [INEI](https://ide.inei.gob.pe/). The code's MIT licence does not relicense source observations or boundaries. The original public-tree paths recorded in provenance are historical; current tests use `tests/fixtures/`. Internal reports are archived locally and excluded from the current repository tree; Git history has not been rewritten.

## 5. What passing tests establish

Passing byte-parity checks shows that this implementation produces the same recorded outputs from the same inputs. It helps detect accidental changes to parsing, cell assignment, aggregation and estimates. Scientific evaluation remains the published retrospective comparison, with its assumptions and limitations; reproducibility alone does not establish future predictive accuracy.

The 47 published products remain in [`frontend/public/data/`](frontend/public/data/). Review the national [method](frontend/public/data/peru/method.json), [validation](frontend/public/data/peru/validation.json), [manifest](frontend/public/data/peru/manifest.json) and [scientific decisions](DECISIONS.md). Observed MODIS/VIIRS values, B1 estimates and exploratory My region results must remain distinct.

## 6. Troubleshooting and maintenance

- Missing fixtures: use a complete Git checkout; preserve original inputs and verify provenance before rerunning.
- Windows temporary-drive error: use the dedicated repository-local `--basetemp` shown above.
- Old cached or development files: repeat `npm ci` and test a clean checkout rather than relying on an existing local installation.
- Visual/mobile behaviour and real provider availability require separate browser checks; JSDOM tests do not certify CSS layout, FIRMS CORS or production HTTP configuration.
- pytest 8 has a documented temporary-directory advisory; the project keeps its current constraint pending a separately tested major update. Use trusted, dedicated test directories. NumPy's existing timedelta deprecation warning does not authorise changing frozen calculations.
- The CI workflow runs normal frontend and scientific checks independently. Full archive regressions remain explicit local checks; retain the commands and the original inputs when maintaining the project.
