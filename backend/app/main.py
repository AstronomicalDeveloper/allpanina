"""Preliminary AllpaNina API entry point."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(
    title="AllpaNina API",
    version="0.1.0",
    description="Preliminary API. Satellite data processing is not implemented yet.",
)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    """Check that the API is running; no upstream services are checked."""
    return HealthResponse()
