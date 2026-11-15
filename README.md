## Ejecutar la integración científica L5/T32

Frontend: Node.js 24, `cd frontend`, `npm ci`, `npm run dev`.
Por defecto se utilizan los resultados reales publicados en `frontend/public/data/`.
Modo sintético explícito: `?data=demo`; sin fallback silencioso.

Pruebas científicas desde la raíz (Python 3.12 en CI):

```sh
python -m venv .venv
# Windows PowerShell:
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m pytest tests/ -q
# Linux/macOS: usar .venv/bin/python en lugar de .venv/Scripts/python.exe
```

CI ejecuta `tests/` con las dependencias científicas de la raíz y las pruebas,
lint y build del frontend. No ejecuta el pipeline ni recalibra resultados.
[Informe T32 y procedencia](docs/t32/INTEGRACION_T32.md).

## 🤝 Git Collaboration Workflow

To keep AllpaNina stable and allow multiple team members to work simultaneously, we follow a simplified **GitHub Flow**.

### 1. Branching strategy

The `main` branch contains the latest stable and integrated version of the project.

Cada integrante tiene su propia rama.


### 2. Step-by-step workflow

**Step 1 — Update your local repository**

Before starting a new task, synchronize your local `main` branch:

```bash
git switch main
git pull origin main
```

**Step 2 — Create a feature branch**

Create a new branch using the appropriate naming convention:

```bash
git switch -c feat/frontend-map
```

**Step 3 — Make and commit your changes**

Implement your assigned task and verify that it works.

```bash
git status
git add .
git commit -m "feat: implement wildfire map"
```

**Step 4 — Push your branch to GitHub**

```bash
git push -u origin feat/frontend-map
```

**Step 5 — Open a Pull Request (PR)**

1. Go to the repository on GitHub.
2. Select **Compare & pull request**.
3. Set `main` as the destination branch.
4. Explain what you implemented and how it was tested.
5. Request a review from another team member.

After approval and successful checks, merge the PR into `main`.

**Step 6 — Synchronize before your next task**

```bash
git switch main
git pull origin main
```

Create a new branch for the next task. Delete merged branches when they are no longer needed.

### 3. Collaboration rules

- **Never push directly to `main`.**
- Create one branch per task, not per developer.
- Keep commits small and descriptive.
- Test your changes before opening a PR.
- Coordinate changes that affect shared files or API contracts.
- Never commit passwords, API keys, credentials, or local environment files.
- Do not force-push to `main`.
- Do not merge a PR with unresolved conflicts or failing required checks.
- Review another contributor's changes before merging whenever possible.

### 4. Working with AI coding agents

Codex, Claude, and other AI coding assistants must follow the same collaboration rules.

- Read `AGENTS.md` before making changes.
- Work on the branch assigned to the current task.
- Do not create unnecessary branches.
- Do not modify unrelated code without authorization.
- Do not commit secrets or generated temporary files.
- Review and test AI-generated changes before committing.
- Never merge automatically into `main` without human approval.

### 5. Commit message conventions

Use concise, descriptive commit messages following this format:

```text
type: short description
```

Examples:

```bash
git commit -m "feat: add satellite hotspot markers"
git commit -m "fix: handle empty NASA API responses"
git commit -m "docs: update installation instructions"
git commit -m "test: add fire analysis unit tests"
```

### 6. Resolving merge conflicts

If your branch is outdated, synchronize it with the latest `main`:

```bash
git fetch origin
git switch feat/frontend-map
git merge origin/main
```

If Git reports conflicts:

1. Open the conflicting files.
2. Resolve the differences carefully.
3. Remove all conflict markers.
4. Stage the resolved files.
5. Complete the merge:

```bash
git add .
git commit
git push
```

If you are unsure how to resolve a conflict, ask another team member before proceeding.

---

**Our priority:** Deliver a functional, integrated, and reproducible solution within the hackathon timeframe. Collaboration practices should support development, not slow it down.

## 🇵🇪 Peru national extension (v2)

AllpaNina started with a validated pilot for the Ucayali department (`frontend/public/data/`, unchanged). Version 2 extends the same method to **Peru as a whole (`PE`) and its 25 departments (`PE-01` … `PE-25`, INEI codes)**. All Peru files are in [`frontend/public/data/peru/`](frontend/public/data/peru/) and follow data contract v1.1 ([`docs/contrato_datos.md`](docs/contrato_datos.md)).

**Indicator.** `cell_days`: number of (1 km cell, day) pairs with at least one active-fire detection, per region, month and sensor. The grid is EPSG:6933 and days are in Lima local time. A cell belongs to the department whose official INEI 2023 polygon contains its centre.

**Method.**
- `B0` = VIIRS without correction.
- `B1` = VIIRS × κ, where κ = Σ MODIS / Σ VIIRS over the training period (2013-01 to 2022-12 only).
- **κ is stratified.** The 17 departments with enough data have their own κ (0.164–0.337); the 8 low-activity departments share one pooled κ (0.207). Using a single national κ (0.249) instead would overestimate Amazonas (own κ 0.164) by ~52% and underestimate Madre de Dios (own κ 0.337) by ~26% (training κ from [`DECISIONS.md`](DECISIONS.md) §11.2: 0.249 / 0.164 ≈ 1.52 and 0.249 / 0.337 ≈ 0.74).
- National `B1` is the **sum** of the 25 departmental estimates, so the national value always equals the sum of its departments.
- Every rule was frozen before looking at validation or test data ([`DECISIONS.md`](DECISIONS.md) §11–12).

**Results (WAPE, lower is better).**

| Period | Region | B0 (uncalibrated) | B1 (calibrated) |
|---|---|---:|---:|
| Validation 2023-01 to 2024-12 | Peru | 2.86 | **0.12** |
| Reserved test 2025-01 to 2026-07, run once | Peru without Ucayali (clean result) | 4.58 | **0.33** |
| Reserved test 2025-01 to 2026-07, run once | Peru | 4.30 | **0.31** |

Calibration reduces the error by roughly 14 times in the test and improves on B0 in all 21 reportable departments. In the test, however, `B1` overestimated MODIS in all 19 months. The national MODIS/VIIRS ratio dropped to 0.191 in 2025 and 0.176 in 2026, below its 2013–2024 range of 0.222–0.286. A κ fixed on 2013–2022 cannot follow that change. Terra/Aqua orbital drift is a possible cause, but this has not been tested. In high-activity years the opposite happens and `B1` underestimates the peak (September 2024: −31% in San Martín, −29% in Ucayali). Full results and all limitations: [`docs/peru/RESULTADO_TEST.md`](docs/peru/RESULTADO_TEST.md) and `frontend/public/data/peru/method.json`.

**Main limitations.**
- The error grows when there is little fire activity.
- Four departments (Callao, Moquegua, Tacna, Tumbes) have too little activity for test metrics of their own (Σ MODIS < 50).
- The Ucayali test had already been seen in the pilot, so the clean national reading is "Peru without Ucayali".
- `B1` is validated at region-month scale only. The national map (10 km cells) shows observed values only.
- Suomi NPP VIIRS stopped producing new data in FIRMS on 2 November 2026, so extending the series requires another VIIRS sensor.

**Run or reproduce.** The algorithm is packaged as `allpanina` ([`docs/ALGORITHM` guide, in Spanish](docs/ALGORITMO.md)). It turns raw FIRMS standard CSVs into the files above using the frozen κ, and never recalibrates. Months after 2026-07 are flagged `sin_validar` (not validated).

```bash
pip install -r requirements.txt && python -m pytest
python -m allpanina --verificar      # rebuilds series, calibration and the 14 maps from the FIRMS archives in docs/
                                     # and checks they are byte-for-byte identical to frontend/public/data/peru/
python -m allpanina --modis <fire_archive_M.csv> --viirs <fire_archive_SV.csv> --salida <dir>   # new data
```

The stage-by-stage pipeline (scripts 01–10, including the one-time test run) is documented in [`docs/peru/REPRODUCCION.md`](docs/peru/REPRODUCCION.md).

Review trail: [`REVISION_P07`](docs/peru/REVISION_P07.md) (series), [`REVISION_P11`](docs/peru/REVISION_P11.md) (calibration), [`AUTORIZACION_TEST`](docs/peru/AUTORIZACION_TEST.md) (test authorisation), [`RESULTADO_TEST`](docs/peru/RESULTADO_TEST.md) (signed test result), [`REVISION_P17`](docs/peru/REVISION_P17.md) (final files) and [`REPRODUCCION`](docs/peru/REPRODUCCION.md) (reproduction).

## 🌎 Any region of the world (exploratory)

The same algorithm also runs for **any region on Earth**, for example the province of Mendoza (Argentina). The user gives a free FIRMS `MAP_KEY` and the region's polygon; AllpaNina downloads MODIS and VIIRS from the FIRMS API, harmonizes them and writes the single-region files the web already reads (same format as the Ucayali pilot):

```bash
python -m allpanina region --region-id AR-M --nombre Mendoza --poligono mendoza.geojson \
    --zona-horaria America/Argentina/Mendoza --map-key <MAP_KEY> --salida salida_mendoza/
```

- Calendar days use the region's own time zone.
- A **local κ** is fitted on 2013–2022 only, and offered only if the region has enough training data (Σ VIIRS ≥ 5,000 and Σ MODIS ≥ 1,000 cell-days). Otherwise the web shows observed data only.
- `B1` is evaluated automatically, out of sample, on 2023–2024 and 2025–2026-07.
- These results are **exploratory**: unlike Ucayali and Peru, nobody on the team has reviewed them or signed a reserved test. `method.json` says so.

Guide (in Spanish): [`docs/ALGORITMO.md`](docs/ALGORITMO.md#cualquier-región-el-caso-mendoza).

## 🛰️ Data sources and acknowledgements

AllpaNina uses active-fire detections from NASA's Fire Information for Resource Management System (FIRMS), which is part of NASA's Land, Atmosphere Near real-time Capability for EO (LANCE) and is operated by NASA's Earth Science Data and Information System (ESDIS) project. Sensors used: MODIS (Terra and Aqua, Collection 6.1) and VIIRS (Suomi NPP, 375 m, Collection 2).

FIRMS data are provided "as is". NASA advises against using them for tactical decisions or for conditions at a local scale; AllpaNina is a scientific prototype and must not be used for that purpose. Our acknowledgement follows NASA's request for anyone who shares FIRMS data: see the official acknowledgements and full disclaimer at https://www.earthdata.nasa.gov/data/tools/firms.

Department boundaries come from the National Institute of Statistics and Informatics of Peru (INEI), spatial data infrastructure, layer *Departamental (actualizado al 2023)*, https://ide.inei.gob.pe/ ([`docs/region/`](docs/region/)).

Provenance of the files we downloaded (request IDs, hashes, columns and limitations) is documented in [`docs/datos.md`](docs/datos.md). Raw FIRMS files are not part of the final content of `main`.
