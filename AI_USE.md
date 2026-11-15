# Use of artificial intelligence

The AllpaNina team used AI assistants during the NASA Space Apps Challenge 2026. This page states how, so that judges and users can weigh the work accordingly.

## What AI was used for

- **Coding assistant (Claude, by Anthropic).** Wrote and revised code under the team's direction: the processing scripts (`scripts/`), the packaged algorithm (`allpanina/`, including region mode and the FIRMS downloader), the in-browser version of the algorithm and the "Mi región" page (`frontend/src/services/region/`, `frontend/src/pages/region/`), and their tests.
- **Review and documentation.** Drafted and checked review documents, the data contract, guides and this README, and pointed out errors and inconsistencies for the team to decide on.
- Team members also used AI assistants in their own work on the frontend and the analyses.

## What the team decided and checked

- **Scientific decisions are the team's.** The indicator, the filters, the train/validation/test periods, the κ calibration rules and the reporting thresholds were set by the team before looking at the results, and are recorded in [`DECISIONS.md`](DECISIONS.md).
- **The reserved test was run once**, after a written authorisation signed by team members ([`docs/peru/AUTORIZACION_TEST.md`](docs/peru/AUTORIZACION_TEST.md)). Its result was reviewed and signed by the team ([`docs/peru/RESULTADO_TEST.md`](docs/peru/RESULTADO_TEST.md)).
- **Outputs are checked by tests, not trusted.** The packaged algorithm must reproduce the published files byte for byte (`python -m allpanina --verificar`), and the in-browser version must reproduce the Ucayali pilot byte for byte (`frontend/tests/region-pipeline.test.ts`).

## Limits

AI-generated code can contain errors that tests do not catch. The "any region" results are labelled **exploratory** because no one on the team has reviewed them region by region. Active-fire detections are not confirmed fires, and AllpaNina must not be used for tactical or local emergency decisions.
