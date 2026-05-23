from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class QuantDatasetDiagnostic(CamelModel):
    dataset: str
    records: int
    demo_records: int = Field(alias="demoRecords")
    latest_timestamp: str | None = Field(None, alias="latestTimestamp")
    staleness_hours: float | None = Field(None, alias="stalenessHours")
    status: str
    warning: str | None


class QuantDiagnosticsPayload(CamelModel):
    readiness_score: float = Field(alias="readinessScore")
    readiness_level: str = Field(alias="readinessLevel")
    datasets: list[QuantDatasetDiagnostic]
    recommendations: list[str]
    generated_at: str = Field(alias="generatedAt")
