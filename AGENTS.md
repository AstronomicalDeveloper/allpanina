# AGENTS.md — AllpaNina

## Project context
AllpaNina is a NASA Space Apps Challenge project focused on the analysis and visualization of wildfires using NASA satellite data. The priority is to deliver a working, demonstrable, scientifically honest prototype within the hackathon timeframe.

## Architecture
This repository is a monorepo:
- `frontend/`: React, TypeScript, Vite, UI, maps, charts and API clients.
- `backend/`: Python, FastAPI, validation, satellite data handling and analysis.
- `backend/app/api/`: HTTP route definitions.
- `backend/app/services/`: satellite processing, calculations and business logic.
- `backend/app/schemas/`: API request/response models.
- `backend/tests/`: automated backend tests.
- `data/`: information about datasets and small approved test fixtures; do not commit downloaded or generated large data.
- `docs/`: sources, methodology, architecture decisions and demo instructions.

Treat this as the intended layout, not as proof that every folder or dependency already exists. Inspect the repository before modifying it. Do not create unused scaffolding.

## Priorities
1. Keep the end-to-end demo working.
2. Preserve accuracy, traceability and clarity of satellite data.
3. Make small, reviewable, testable changes.
4. Prefer simple solutions over speculative features or premature abstractions.
5. Respect teammates' concurrent changes.

## Collaboration rules
- Never overwrite, revert or delete another contributor's work without explicit permission.
- Do not commit directly to `main` unless the team explicitly instructs you to.
- Use focused feature branches and pull requests when possible.
- Before changing a module, inspect adjacent code, existing conventions and interfaces.
- Avoid unrelated refactors and mass reformatting.
- Document new setup steps and environment variables in the relevant README or `.env.example`.
- Do not add dependencies unless needed for a concrete task.
- Never run destructive shell commands without explicit approval.

## Frontend conventions
- Use React functional components and TypeScript with explicit types at API boundaries.
- Keep presentation components separate from HTTP and data transformation code.
- Place API clients in `frontend/src/services/`.
- Define shared frontend types in `frontend/src/types/` (do not invent response shapes independently of the API contract).
- Make loading, empty, network-error and malformed-data states visible and understandable.
- Keep map layers and legends clear: units, timestamps, sources and meaning must be shown when appropriate.
- Avoid hardcoded API URLs and credentials; use Vite environment variables for public configuration only (`VITE_*` is exposed to the browser).
- Respect responsive layout, keyboard navigation and accessible labels where feasible.

## Backend conventions
- Keep FastAPI routes thin; implement data processing in `backend/app/services/`.
- Validate inbound inputs and outbound data with explicit schemas.
- Handle upstream API outages, timeouts, missing values and empty responses gracefully.
- Use UTC or explicit time zones in timestamps; document units and coordinate reference systems.
- Prefer reproducible computations and deterministic test fixtures.
- Keep secrets in environment variables, never in source or responses.
- Do not assume a NASA service, endpoint, rate limit or dataset is available without checking its documentation or actual behavior.

## Scientific and data integrity
- Identify the source of each satellite dataset (such as MODIS or VIIRS), its acquisition/observation time, fields and relevant limitations.
- Clearly distinguish observed satellite hotspots, model-derived classifications, predictions and illustrative/demo data.
- A hotspot is not automatically a confirmed wildfire; do not imply otherwise.
- Do not fabricate observations, geospatial positions, validation results or performance metrics.
- Any algorithm or risk score must document its assumptions and limitations.
- Clearly label mock and fallback data; never silently present it as live NASA data.
- Do not commit bulk satellite datasets or generated binary outputs without team approval.

## API contract
- Keep endpoint paths and JSON shapes stable once frontend and backend agree on them.
- If an endpoint changes, update the schema, frontend client, mock fixture, tests and relevant docs in the same task when possible.
- Prefer versioned examples of API responses in `docs/` or small test fixtures.
- Include meaningful error messages and appropriate HTTP status codes.
- Do not bypass validation simply to get the demo working.

## Testing and completion
- Run only relevant available checks, such as frontend lint/build and backend tests; inspect package scripts and Python configuration before choosing commands.
- If a check cannot run, say so rather than reporting it as successful.
- For every substantial change, report: files changed, what works, checks run, limitations and the next integration step.
- Keep a simple reproducible path from clean checkout to local demo.

## Agent-specific guidance
- These instructions apply to Codex and other coding agents reading this file.
- `CLAUDE.md` may point to this file for Claude Code; do not maintain conflicting rules across agent files.
- Agent-specific local settings, sessions, credentials, caches and logs must not be committed.
- Shared agent prompts or skills can be versioned if they contain no private information.

## Scope guardrails
- Do not add authentication, databases, queues, containers, cloud services, microservices or sophisticated CI solely for architectural completeness.
- Prefer a single FastAPI app and a single Vite frontend until a real requirement proves otherwise.
- Ask for a decision when changing core methodology, external data sources or documented API contracts would affect other teammates.

## Definition of done
A task is complete when the intended behavior is implemented, integrations/contracts are consistent, relevant checks have been attempted, documentation is updated where needed, and any known limitations are explicitly stated.

## Continuous Integration — GitHub Actions

The project will use GitHub Actions for automated
continuous integration (CI).

Create a workflow at:
`.github/workflows/ci.yml`

The workflow must:

- Run on pull requests targeting `main`.
- Run on pushes to `main`.
- Validate the React + TypeScript frontend.
- Install dependencies using `npm ci`.
- Run frontend lint and build checks.
- Validate the Python backend.
- Install backend dependencies.
- Run backend tests using pytest.
- Keep frontend and backend checks independent.
- Fail when a required validation fails.
- Avoid deployment and unnecessary external services.

Inspect existing scripts and tests before implementing
the workflow. Do not invent commands that do not exist.

Keep the workflow simple, fast and compatible with
GitHub-hosted runners.