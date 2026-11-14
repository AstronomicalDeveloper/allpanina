# AllpaNina backend

Preliminary FastAPI application. It exposes only a health endpoint; NASA data
retrieval and satellite analysis are not implemented yet.

## Run locally

Use Python 3.12 or newer. From `backend/`:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

On Linux/macOS, use `.venv/bin/python` instead of `.venv\Scripts\python.exe`.
No environment variables or credentials are required at this stage.

- Health: <http://127.0.0.1:8000/health> returns `{"status":"ok"}`.
- Interactive API documentation: <http://127.0.0.1:8000/docs>.

The health endpoint checks only that the application responds, not NASA service
availability. The virtual environment remains local and must not be committed.
