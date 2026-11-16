# Use of artificial intelligence

The AllpaNina team used AI assistants during the NASA Space Apps Challenge 2026. This page states how, so that judges and users can weigh the work accordingly.

## What AI was used for

- **ChatGPT — OpenAI.** Used for development assistance, technical questions, review and documentation.
- **Codex — OpenAI.** Assisted with repository inspection, frontend integration, UI corrections, automated checks, Git operations authorised by the team, and documentation. Passing automated checks does not imply an independent scientific audit or a completed visual review.
- **Claude — Anthropic.** Assisted with development and review of processing scripts, the Python package, browser-side regional processing, frontend code, tests and documentation under the team's direction.

These tools assisted the team; they did not own scientific decisions or final validation. Their participation is not evidence that every generated suggestion was adopted or independently audited. The public About page recognises the same three tools.

## What the team decided and checked

- **Scientific decisions are the team's.** The indicator, the filters, the train/validation/test periods, the κ calibration rules and the reporting thresholds were set by the team before looking at the results, and are recorded in [`DECISIONS.md`](DECISIONS.md).
- **The reserved test was run once**, after a written authorisation signed by team members ([the retained authorisation fixture](tests/fixtures/peru/AUTORIZACION_TEST.md)). The original review record is archived locally; [published evaluation files](frontend/public/data/peru/validation.json) and the [reproducibility guide](REPRODUCIBILITY.md) remain available.
- **Outputs are checked by tests, not trusted.** The packaged algorithm must reproduce the published files byte for byte (`python -m allpanina --verificar`), and the in-browser version must reproduce the Ucayali pilot byte for byte (`frontend/tests/region-pipeline.test.ts`).

## Limits

AI-generated code can contain errors that tests do not catch. The "any region" results are labelled **exploratory** because no one on the team has reviewed them region by region. Active-fire detections are not confirmed fires, and AllpaNina must not be used for tactical or local emergency decisions.
