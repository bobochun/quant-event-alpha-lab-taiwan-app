from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ApiResponse(BaseModel):
    ok: bool
    data: Any | None = None
    error: str | None = None
    dataSource: str = "Demo"
    sourceNote: str = ""
    generatedAt: str = Field(default_factory=utc_now_iso)


def ok_response(data: Any, data_source: str, source_note: str) -> ApiResponse:
    return ApiResponse(ok=True, data=data, dataSource=data_source, sourceNote=source_note)


def error_response(message: str, data_source: str = "Error", source_note: str = "") -> ApiResponse:
    return ApiResponse(ok=False, data=None, error=message, dataSource=data_source, sourceNote=source_note)
