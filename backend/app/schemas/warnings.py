from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


WarningType = Literal["attention", "disposition", "unknown"]
WarningSeverity = Literal["low", "medium", "high", "critical"]


class MarketWarningItem(CamelModel):
    symbol: str
    name: str
    market: str
    warning_type: WarningType = Field(alias="warningType")
    reason: str
    severity: WarningSeverity
    effective_date: str | None = Field(None, alias="effectiveDate")
    end_date: str | None = Field(None, alias="endDate")
    provider: str
    data_source: str = Field(alias="dataSource")
    source_url: str | None = Field(None, alias="sourceUrl")
    source_note: str = Field(alias="sourceNote")
    fetched_at: str = Field(alias="fetchedAt")


class MarketWarningsPayload(CamelModel):
    items: list[MarketWarningItem]
    provider_status: list[dict] = Field(alias="providerStatus")
    source_note: str = Field(alias="sourceNote")
    generated_at: str = Field(alias="generatedAt")
