# DECISIONS.md - AllpaNina

Scientific decisions frozen by Aldo (T04 of atomic task matrix v1.4).
They must not be changed without explicit authorisation from Aldo + Antonella
(see "Reserved test" below).

> Editorial note: this English translation preserves the recorded decisions; it
> does not amend the method or constitute a new scientific approval. References
> to `docs/` identify the original historical records. Current verification
> instructions and relocated inputs are described in [REPRODUCIBILITY.md](REPRODUCIBILITY.md).

## 1. Pilot region

**Department of Ucayali, Peru (the whole department) - decision revised on
14-nov-2026 by Aldo.**

**Scope change from the previous version of this document:** it previously said
"Province of Coronel Portillo" and explicitly excluded the whole department
("too large to process by hand"). That decision is reversed because the bounding
box used for the province covered only 61% of Coronel Portillo's actual area
according to the INEI polygon (Marco compared the box with the official polygon).
Rather than patching the provincial box, Aldo decided to move to the whole department.

The original rationale still applies at department level: it has the largest
cumulative burned area in the national satellite ranking (MapBiomas Fuego Peru,
2013-2024: Ucayali leads with approximately 350,600 ha).

**Bounding box (covers the whole department) - CORRECTED:**
- lat: -11.55 to -7.15
- lon: -76.10 to -70.40
- Correction: the previous box said lat -11.45 to -8.37
  ("8°22'S to 11°27'S"). The department's northern boundary is near 7°20'S
  (INEI-2007 polygon: maximum latitude -7.27), not 8°22'S. That box excluded
  the northern strip and contained only 86.7% of the department's area.
  The corrected box contains 100%. A margin of 0.1° (approximately 11 km)
  was left around the simplified, provisional INEI-2007 polygon; the margin
  can be reduced once the official GeoPackage is available.
- Actual department area: approximately 102,400 km² (source: INEI, Ucayali
  Statistical Compendium). The rectangular box covers a larger area because
  the department is not rectangular. The box only bounds the FIRMS download;
  the final indicator uses the actual polygon, not the box.

**Official polygon - IN USE (14-nov-2026):** the official INEI GeoPackage is
used, as Aldo decided, rather than the provisional `juaneladio/peru-geojson` polygon.
- Source: INEI Spatial Data Infrastructure,
  `https://ide.inei.gob.pe/files/Departamento.rar` ("Departamental (Actualizado
  al 2023)"; .rar SHA-256 `c6c2b3075229e1b4bfb33e9bfe4979d0a71dbf452f4b04b7c831928bdfc574da`).
  It contains `DEPARTAMENTO.gpkg` (EPSG:4326, 25 departments; fields `ccdd`,
  `nombdep`, `fuente`).
- Ucayali (`ccdd = 25`) was extracted without changing the geometry to
  `docs/region/ucayali_inei_2023.geojson` (valid MultiPolygon, 25,928 vertices;
  lon -75.948 to -70.494, lat -11.448 to -7.262).
- Calculated geodesic area: approximately 105,100 km². This differs by about
  2.7% from the Statistical Compendium's approximately 102,400 km². Report
  the difference without correcting it. **Approved by Aldo (14-nov-2026):**
  report it as stated; the filter uses the official polygon. Include the
  difference in the limitations of `method.json`.
- Rule: a 1 km cell belongs to Ucayali if its **centre** lies inside the polygon.
  The box above contains the entire polygon and is only a fast prefilter.
- Impact (2013–2024): the box counted 65,459 MODIS cell-days and 233,671 VIIRS
  cell-days; the polygon retains 32,439 and 107,854. Most of the difference
  lay in Huanuco, Junin, Pasco and Loreto. The box-based series are superseded.

**FIRMS download - do not repeat (verified):** the files already in `docs/`
cover all of Peru (MODIS: lat -18.16 to -0.03, lon -81.28 to -68.72;
VIIRS: lat -18.34 to -0.03, lon -81.29 to -68.69), so Ucayali's box lies
entirely within them. The box is applied during aggregation
(`scripts/04_monthly_series.py`), not downloading. The ZIPs, their hashes and
`docs/datos.md` remain valid. `monthly_series.csv`, the GeoJSON and
`manifest.json` must be regenerated with the new box because the previous
outputs used the provincial box.

## 2. Sensors

- MODIS Terra + Aqua (standard MCD14ML product, FIRMS)
- VIIRS Suomi NPP (standard product, FIRMS)

VIIRS S-NPP: NOAA announced the end of delivery of all products on
1 November 2026; NASA states that delivery of new science data ended on
2 November 2026 (source: NASA LP DAAC). The historical archive is unaffected.
Document this as a limitation in `method.json`.

**Correction regarding VIIRS Version 2 (verified against Marco's actual data):**
NASA released VIIRS Version 2 on 29 August 2023, announcing coverage "from
2018 onwards", which suggested that 2013-2017 would remain in Version 1.
**That is no longer the case:** in Marco's downloaded archive, all VIIRS
records from 2012 to 2026 have `version = 2`: NASA completed reprocessing
of the entire historical archive to V2. There is no mixture of versions
within our training period. Remove this limitation from `method.json`.

## 3. Reference period

**2013-01 to 2026-07** (corrected, not 2026-09). FIRMS standard products have
an approximately 2-3 month delay. At download time, 2026-09 was available only
as NRT (near real-time), not as the validated standard product. Do not use NRT
for the frozen method; at most it may be used in the observational map,
explicitly labelled as such.

**Deliverables also start at 2013-01 (T12 review, Aldo, 14-nov-2026):**
Marco's sample `monthly_series.csv` started at 2012-01. Keep 2013-01 as the
first month of **all** deliverables (`monthly_series.csv`, GeoJSON,
`manifest.json` -> `periodo.desde = "2013-01"`). Exclude 2012: it is outside
training (section 4), and VIIRS 2012-01 is incomplete (coverage starts on
20 January). Data from 2012 may remain in `data/processed/`, but not in the
deliverables sent to Antonella or Landry.

## 4. Train / validation / test split

- **Train:** 2013-01 to 2022-12 (10 years) - fits the B1 calibration factor.
- **Validation:** 2023-01 to 2024-12 (2 years) - compares B0 with B1 and selects the method.
- **Test (reserved):** 2025-01 to 2026-07.

**Documented risk (date corrected; the first citation was wrong):** MODIS
changes version (V6 -> V6.1) at the start of validation. According to the
final NASA LP DAAC announcement, which superseded the preliminary
15 February announcement, the correct dates are:
**Terra: 17 February 2023. Aqua: 23 February 2023**
(https://www.earthdata.nasa.gov/data/alerts-outages/modis-version-6-forward-processing-has-been-discontinued).
This is within weeks of the January 2023 split and may introduce a
processing-algorithm discontinuity rather than a real change in fire activity.
Record it explicitly as a limitation in `method.json`. If Antonella sees an
unusual jump there, it must be reviewed with Aldo before interpreting it as a real signal.

## 5. Cell size and grid

- EPSG:6933 equal-area grid, **1 km × 1 km cells**.

## 6. Day definition: Lima or UTC

Use **Lima local time (UTC-5, no daylight saving time)** to assign a detection
to a calendar day. Preserve the original UTC timestamp unchanged in
`data/raw/` and `data/processed/` for traceability. Conversion to a Lima day
occurs only when aggregating to `cell_days`.

## 7. Type filter and quality control (QC) - CORRECTED

**The standard VIIRS product does include a `type` column**, with the same
codes as MODIS: 0=presumed vegetation fire, 1=volcano, 2=static source,
3=offshore. The earlier statement that the column was absent was wrong:
it is missing from the VIIRS NRT product, not from the standard product used here.

- **MODIS and VIIRS:** discard rows with `type != 0`.
- **Verified in Marco's actual data:** `type` exists without nulls for all
  years of both sensors (MODIS 2003–2026; VIIRS 2012–2026), and all VIIRS
  records are `version = 2`. The filter behaves consistently throughout training.
- **Known limitation of VIIRS `version = 2`:** NASA documents that versions
  1 and 2 labelled some type 2 static sources as type 0, corrected in
  version 3 (May 2025). The `type = 0` filter may retain some static sources
  in VIIRS. Document this in `method.json`.
- **Minimum confidence:** MODIS `confidence >= 30`; VIIRS `confidence` in
  {nominal, high}, excluding `low`. The threshold is adjustable: if Antonella
  finds that it removes too much actual pilot-region data, review it with
  Aldo before changing training.

## 8. Status rule - CORRECTED again

The previous rule unintentionally combined "no detection" and "no data"
into an ambiguous state. This corrected version avoids inventing a coverage
percentage that cannot be calculated from FIRMS CSVs:

- **`status: "ok"`** - the sensor was operating that month, **even when
  `cell_days` is 0**. Zero detections with an operating sensor is a real
  observation, not a missing value.
- **`status: "missing"`** - the month is **outside the known availability
  window** of the sensor: before launch/standard coverage, after a documented
  end of delivery such as VIIRS S-NPP in November 2026, or another officially
  documented gap. Never use `missing` merely because `cell_days` is 0; that is `ok`.
- **Second `missing` case (approved by Aldo, 14-nov-2026, proposed by Marco):**
  the sensor is within its availability window but has **no detections
  anywhere in Peru** that month, not just in Ucayali. A whole month without
  a single national hotspot is not considered credible and is treated as a
  data gap. If Ucayali has 0 but the rest of Peru has detections, the month
  is `ok` with `cell_days = 0`. This rule is not triggered in 2013-2024;
  it is recorded for any future extension. Implemented in
  `scripts/04_monthly_series.py`.

There is no third ambiguous state. Distinguishing cloud cover or poor
sampling from actual absence of fire would require coverage data that FIRMS
does not provide; that is outside this hackathon's scope.

## 9. Codes

- `region_id`: **PE-UCA** (Peru, department of Ucayali). Changed from
  `PE-UCA-CPO` to `PE-UCA` with the scope change in section 1
  (province -> whole department), 14-nov-2026. DEMO files continue to use
  `DEMO-01` because they are deliberately synthetic.
- `sensor_group`: `MODIS` | `VIIRS` (already fixed in the data contract).

## Reserved test - golden rule

Nobody runs the test (2025-01 to 2026-07) or examines its results until
Aldo + Antonella jointly authorise it (T29 of the matrix). Run it **once only**.
Changing any part of the method after seeing the test result invalidates the validation.

## 10. Calibration factor formula (B1) and error-sign convention

**Factor kappa:**

```
κ = Σ cell_days_MODIS(train, whole region) / Σ cell_days_VIIRS(train, whole region)
B1 = B0 × κ
```

One number for the whole region, fitted once using the sum across the
**entire** training period (2013-2022): neither month-by-month factors nor
an average of monthly factors. If the training VIIRS sum is 0, kappa cannot
be calculated. Record this edge case in `method.json`; do not invent a
default value such as kappa=1.

**Error-sign convention (mandatory for Antonella and Landry's presentation):**

```
signed_error = estimate - modis_observed
```

- Positive -> the method **overestimates**: it exceeds the MODIS observation.
- Negative -> the method **underestimates**.
- `absolute_error = |signed_error|`
- `bias` = mean `signed_error` over the evaluation period, not mean
  `absolute_error`: bias must be able to be negative.
- `MAE` = mean `absolute_error`.
- `WAPE` = sum of `|signed_error|` / sum of `modis_observed` over the evaluation
  period; undefined when the denominator is 0 (see section 8).

Use the same convention in `validation.json`, `method.json` and every plot
Landry builds that uses the error's sign. Nobody reverses it independently.

### Frozen value for T29 (14-nov-2026, approved by Aldo + Antonella in T27)

- **Kappa = 0.2936037257560573**
  (training MODIS sum 24,902 / VIIRS sum 84,815; 120 months, 2013-01 to 2022-12).
- Input series: `docs/ejemplo/monthly_series.csv`
  (sha256 `47f833ebf27f710847d68179b495c1a1b5033abb4b762af5617622223c02f171`, INEI polygon).
- **Method selected for the test: B1.** Criterion: lower validation WAPE
  (B1 0.178 vs B0 2.06; 24 months, 2023-01 to 2024-12).
  Review: `docs/REVISION_T27.md`.
- Report test MAE, WAPE, bias, number of matched months and monthly residuals
  sorted by absolute error, for both B0 and B1.
- Execute once with
  `python scripts/06_calibrate.py <serie_con_test> --split test --autorizado-aldo-antonella`.
  Before examining metrics, confirm that the script prints kappa = 0.2936...;
  otherwise stop and review it with Aldo.
- None of the above changes after the test result has been seen.

## 11. Peru extension (version 2)

### 11.1 Scope - P01 (approved by Aldo, 14-nov-2026)

Reference plan: *AllpaNina Peru - Steps to include all of Peru v2.1*.
This section is written **before** anyone calculates validation or test
metrics for any region other than Ucayali.

- **Regions (26):** national Peru and its 25 departments, using official INEI
  polygons from the "Departamental (Actualizado al 2023)" layer, the same
  source as Ucayali's polygon (section 1).
- **`region_id` codes:**
  - `PE`: national Peru.
  - `PE-<ccdd>` per department, using the 2-digit INEI code: `PE-01` Amazonas,
    `PE-02` Áncash, `PE-03` Apurímac, `PE-04` Arequipa, `PE-05` Ayacucho,
    `PE-06` Cajamarca, `PE-07` Callao, `PE-08` Cusco, `PE-09` Huancavelica,
    `PE-10` Huánuco, `PE-11` Ica, `PE-12` Junín, `PE-13` La Libertad,
    `PE-14` Lambayeque, `PE-15` Lima, `PE-16` Loreto, `PE-17` Madre de Dios,
    `PE-18` Moquegua, `PE-19` Pasco, `PE-20` Piura, `PE-21` Puno, `PE-22` San Martín,
    `PE-23` Tacna, `PE-24` Tumbes, `PE-25` Ucayali.
  - Within the extension, Ucayali is `PE-25`. `PE-UCA` is retained **only** for
    the v1 pilot, so the regression can compare them unambiguously: the
    results must match apart from the region's name.
- **Cell assignment:** a 1 km cell belongs to the department whose polygon
  contains its **centre**, as in section 1, assigning each cell to one
  department. Discard cells whose centres lie outside all 25 polygons.
  `PE` is the sum of the 25 departments.
- **Data:** no new download. Use the same FIRMS ZIPs in `docs/`
  (MODIS through 2026-08 and VIIRS through 2026-07, all of Peru), with
  the hashes in `docs/datos.md`.
- **Unchanged rules:** period and splits (sections 3 and 4: train 2013-01
  to 2022-12, validation 2023-01 to 2024-12, test 2025-01 to 2026-07),
  cell/grid (section 5), Lima day (section 6), filters (section 7),
  `ok`/`missing` status (section 8), factor formula and error sign (section 10).
- **Reserved test:** 2025-01 to 2026-07 stays reserved for all new regions.
  Ucayali's test was already examined in T29; report the national test
  with and without Ucayali (section 11.3).
- **Location:** national files go in `frontend/public/data/peru/`.
  The Ucayali v1 files in `frontend/public/data/` remain **frozen** and
  unchanged. Work on `feature/calibracion`.
- **National map:** 10 km cells formed by summing already deduplicated
  1 km cells. Department series always use 1 km cells. See contract v1.1 (P03).
- **Excluded:** the rest of the world, forecasting, cell-level calibration
  and frontend work; Landry receives the files at the end, in P20.

### 11.2 Kappa strata - P02 (approved by Aldo, 14-nov-2026)

**Rule fixed before calculating any validation or test metric outside Ucayali:**

- A department gets **its own kappa** if its train period (2013-01 to 2022-12)
  has **VIIRS sum >= 5,000 and MODIS sum >= 1,000** cell-days. 17 qualify.
- The other 8 (Lima, Huancavelica, Arequipa, Ica, Tumbes, Moquegua, Tacna and
  Callao) form **one pooled stratum**, using a factor calculated from the sums of all 8.
- National `PE` has its own factor based on all 25 departments, used as a
  validation reference (P10), not to calibrate individual departments.
- Same formula as section 10, **training only**:
  kappa = MODIS training cell-day sum / VIIRS training cell-day sum;
  B1 = VIIRS times its stratum's kappa. Validation and test evaluate the
  factor; they never fit it.
- **Stratum membership is frozen** as shown in the table. Slightly different
  official P09 calculations do not move a department between strata:
  report the difference and review it with Aldo.

**Rationale:** a threshold of 1,000 VIIRS cell-days admitted Moquegua and Ica,
whose annual factors range from 0.06 to 0.39. The 8 low-activity departments
have low factors (0.207 together); the national factor (0.249) would overestimate them.

**Table of the 25 departments (train 2013-2022; 1 km cell-days inside each INEI polygon):**

| `region_id` | Department | Σ VIIRS | Σ MODIS | κ train | κ annual min–max | Stratum |
| --- | --- | ---: | ---: | ---: | :---: | --- |
| `PE-22` | San Martín | 87,753 | 18,715 | 0.213 | 0.155–0.245 | κ own |
| `PE-25` | Ucayali | 84,815 | 24,902 | 0.294 | 0.262–0.338 | κ own |
| `PE-10` | Huánuco | 61,639 | 16,634 | 0.270 | 0.218–0.323 | κ own |
| `PE-16` | Loreto | 52,653 | 10,524 | 0.200 | 0.159–0.237 | κ own |
| `PE-12` | Junín | 45,682 | 10,684 | 0.234 | 0.188–0.298 | κ own |
| `PE-17` | Madre de Dios | 35,838 | 12,087 | 0.337 | 0.305–0.349 | κ own |
| `PE-08` | Cusco | 23,796 | 6,442 | 0.271 | 0.225–0.325 | κ own |
| `PE-19` | Pasco | 21,019 | 5,592 | 0.266 | 0.226–0.308 | κ own |
| `PE-06` | Cajamarca | 15,750 | 3,025 | 0.192 | 0.134–0.273 | κ own |
| `PE-20` | Piura | 14,491 | 2,773 | 0.191 | 0.137–0.265 | κ own |
| `PE-13` | La Libertad | 13,861 | 3,466 | 0.250 | 0.215–0.303 | κ own |
| `PE-01` | Amazonas | 11,310 | 1,851 | 0.164 | 0.133–0.195 | κ own |
| `PE-21` | Puno | 10,910 | 3,163 | 0.290 | 0.195–0.381 | κ own |
| `PE-05` | Ayacucho | 10,536 | 2,635 | 0.250 | 0.168–0.322 | κ own |
| `PE-14` | Lambayeque | 8,641 | 2,350 | 0.272 | 0.213–0.347 | κ own |
| `PE-02` | Áncash | 8,381 | 1,897 | 0.226 | 0.206–0.265 | κ own |
| `PE-03` | Apurímac | 5,536 | 1,657 | 0.299 | 0.191–0.373 | κ own |
| `PE-15` | Lima | 4,626 | 836 | 0.181 | 0.109–0.233 | Pooled |
| `PE-09` | Huancavelica | 4,452 | 1,071 | 0.241 | 0.168–0.277 | Pooled |
| `PE-04` | Arequipa | 4,068 | 945 | 0.232 | 0.177–0.283 | Pooled |
| `PE-11` | Ica | 2,788 | 348 | 0.125 | 0.070–0.203 | Pooled |
| `PE-24` | Tumbes | 1,781 | 489 | 0.275 | 0.132–0.388 | Pooled |
| `PE-18` | Moquegua | 1,003 | 243 | 0.242 | 0.063–0.385 | Pooled |
| `PE-23` | Tacna | 480 | 71 | 0.148 | 0.073–0.353 | Pooled |
| `PE-07` | Callao | 101 | 0 | 0.000 | — | Pooled |
| — | **Pooled stratum (8)** | **19,299** | **4,003** | **0.207** | — | — |
| `PE` | **Peru (25 departments)** | **531,910** | **132,400** | **0.249** | — | Reference |

Source: plan v2.1, calculated by Marco using `cell_days.parquet`
(scripts 01-03, FIRMS ZIPs in `docs/`), INEI 2023 polygons and training only.
These values are **preliminary**: Antonella calculates the official factors
in P09 with the pipeline, and they must match. Callao has training MODIS
sum = 0; it belongs only to the pooled stratum, never an own-factor stratum.

### 11.3 Metric rules - P04 (Aldo + Antonella, 14-nov-2026)

Unified version. Antonella wrote her own P04 version (commit `0bef9b3`),
matching everything except the criterion in item 4. Aldo combined the two:
the department-level criterion determines selection, and Antonella's
criterion is also reported.

Fixed **before** calculating validation or test metrics outside Ucayali.

**1. Minimum for reporting a region.**
- Report a region for a split when its MODIS sum in that split is
  **>= 50 cell-days**.
- Assess validation and test separately: a region may be reportable in
  one and not the other.
- Below the threshold, `validation.json` records `reportable: false`,
  a `motivo` and no metrics (contract v1.1, section E). Its months still
  contribute to `PE` and `PE-SIN-25`.

**2. WAPE.**
- If the split's MODIS sum is 0, report WAPE as `null`, never 0.
- Report MAE and bias if the region is reportable.
- Calculate metrics from matched months (`status = ok` for both sensors),
  as in the pilot.

**3. Test with and without Ucayali.**
- Report test results for `PE`, `PE-SIN-25` (Peru without Ucayali), and
  each reportable region.
- Mark `PE-25` (Ucayali) as "test already examined in T29". The previously
  unseen result is `PE-SIN-25`.

**4. How P10 decides whether stratification improves results** (a rule
named in the plan but not previously fixed):
- Compare the following three alternatives, all with training-only factors:
  - **(a) Stratified**, as in section 11.2.
  - **(b) One national factor**, from `PE`, for all departments.
  - **(c) Ucayali's factor** (0.29360) for all departments.
- **Criterion:** aggregate validation WAPE across the 25 departments:
  sum of absolute errors / MODIS sum, over all 25 departments and all 24 months.
- **Select stratification if its aggregate WAPE is lower than both (b) and (c).**
  Otherwise, in P11 choose whichever of (a), (b) and (c) has the lowest
  aggregate WAPE, document it and freeze it. Do not create new alternatives
  after seeing validation.
- **Also report** Antonella's proposal, without using it to decide selection:
  - national `PE` WAPE, with national estimate equal to the sum of department
    B1 estimates, for all three alternatives and B0;
  - the number of reportable regions where stratification has lower WAPE than (b).
- Test results do not influence this choice.

**5. No changes.** Use the same pilot metrics (MAE, WAPE and bias), without
adding or removing any. These rules do not change after validation or test results are seen.

## 12. Peru extension: frozen calibration - P11 (15-nov-2026)

Review: `docs/peru/REVISION_P11.md`. Marco conducted it with Claude under
Aldo's delegation while Aldo was absent. **Aldo ratified it unchanged on
15-nov-2026, before P14** (`REVISION_P11.md`, appendix A).
Verdict: **approved with conditions**. Conditions 1 to 5 were met
(15-nov-2026), including Aldo's ratification. This is frozen **before** running the test.

- **Input series:** `docs/peru/ejemplo/monthly_series.csv` (P07), SHA-256
  `b3ceeae6df820b19f7f132558cea08e51d27f6528f04b460c4c6c8b517893109`.
- **Method:** (a), stratified (section 11.2). Selected using section 11.3,
  rule 4: aggregate validation WAPE across 25 departments was 0.203,
  versus 0.265 for the national factor and 0.280 for Ucayali's factor.
- **Formula:** kappa = MODIS training sum / VIIRS training sum, using
  2013-01 to 2022-12; B1 = VIIRS times the regional stratum factor.
- **`PE` and `PE-SIN-25`:** B1 = **sum of their departments' B1 estimates**:
  all departments for `PE`, all except `PE-25` for `PE-SIN-25`. This follows
  the series rule `PE` = sum of departments. The VIIRS times national factor
  version (0.24891429001146811) is reported as a validation and test reference,
  as required by section 11.3. This supersedes contract v1.1 section D.
- **Frozen factors** (stop if the test script prints different values):

| `region_id` | Department | Stratum | κ |
| --- | --- | --- | --- |
| `PE-01` | Amazonas | own | `0.1636604774535809` |
| `PE-02` | Áncash | own | `0.2263453048562224` |
| `PE-03` | Apurímac | own | `0.2993135838150289` |
| `PE-04` | Arequipa | pooled | `0.2074200735789419` |
| `PE-05` | Ayacucho | own | `0.25009491268033407` |
| `PE-06` | Cajamarca | own | `0.19206349206349208` |
| `PE-07` | Callao | pooled | `0.2074200735789419` |
| `PE-08` | Cusco | own | `0.2707177676920491` |
| `PE-09` | Huancavelica | pooled | `0.2074200735789419` |
| `PE-10` | Huánuco | own | `0.2698616135887993` |
| `PE-11` | Ica | pooled | `0.2074200735789419` |
| `PE-12` | Junín | own | `0.23387767610875182` |
| `PE-13` | La Libertad | own | `0.2500541086501695` |
| `PE-14` | Lambayeque | own | `0.27195926397407705` |
| `PE-15` | Lima | pooled | `0.2074200735789419` |
| `PE-16` | Loreto | own | `0.19987465101703605` |
| `PE-17` | Madre de Dios | own | `0.3372677046710196` |
| `PE-18` | Moquegua | pooled | `0.2074200735789419` |
| `PE-19` | Pasco | own | `0.2660450068985204` |
| `PE-20` | Piura | own | `0.19136015457870403` |
| `PE-21` | Puno | own | `0.28991750687442713` |
| `PE-22` | San Martín | own | `0.21326906202636947` |
| `PE-23` | Tacna | pooled | `0.2074200735789419` |
| `PE-24` | Tumbes | pooled | `0.2074200735789419` |
| `PE-25` | Ucayali | own | `0.2936037257560573` (same as pilot, §10) |
| `PE` | Peru (reference only) | nacional | `0.24891429001146811` |

- **Conditions before P12:** the 5 in `docs/peru/REVISION_P11.md`, section 4:
  1. `PE` as the sum of departments.
  2. Limitations in `method.json`.
  3. Corrections in `P09_P10.md`.
  4. Approved status in `method.json`.
  5. Aldo's ratification.

  Conditions 1 to 4 were met on 15-nov-2026 (`REVISION_P11.md`, section 4).
  Condition 5 was met that same day: Aldo ratified the review unchanged.
  Aldo, Marco and Antonella sign P12 (`docs/peru/AUTORIZACION_TEST.md`).
