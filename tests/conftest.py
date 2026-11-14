"""Utilidades para probar los scripts numerados de scripts/ (sus nombres empiezan con digitos)."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"


def _load(filename: str):
    spec = importlib.util.spec_from_file_location(filename.removesuffix(".py").replace("-", "_"), SCRIPTS_DIR / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def load_script():
    return _load
