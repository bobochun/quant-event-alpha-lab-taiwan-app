from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EventType = Literal[
    "investorConference",
    "exDividend",
    "monthlyRevenue",
    "earnings",
    "foreignBrokerReport",
    "majorHolderChange",
    "etfRebalance",
    "attentionStock",
    "dispositionStock",
    "shareholderMeetingGift",
    "productLaunch",
    "aiServerNews",
    "semiconductorNews",
    "industryConference",
    "policy",
    "orderContract",
    "buyback",
    "capitalIncrease",
    "convertibleBond",
    "mergerAcquisition",
    "supplyChainNews",
    "other",
]

DataSource = Literal["Real", "Official", "Cached", "Manual", "Imported", "Estimated", "Demo", "Missing", "Error"]


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class EventData(CamelModel):
    id: str
    symbol: str
    name: str
    event_type: EventType = Field(alias="eventType")
    event_title: str = Field(alias="eventTitle")
    event_date: str = Field(alias="eventDate")
    event_time: str | None = Field(None, alias="eventTime")
    source: str
    source_url: str | None = Field(None, alias="sourceUrl")
    data_source: DataSource = Field(alias="dataSource")
    source_note: str = Field(alias="sourceNote")
    confidence: int
    expected_impact: int = Field(alias="expectedImpact")
    market_awareness: int = Field(alias="marketAwareness")
    related_themes: list[str] = Field(alias="relatedThemes")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


class EventProviderStatus(CamelModel):
    provider: str
    status: Literal["ok", "degraded", "error", "disabled"]
    supports_events: bool = Field(alias="supportsEvents")
    supports_monthly_revenue: bool = Field(False, alias="supportsMonthlyRevenue")
    supports_dividends: bool = Field(False, alias="supportsDividends")
    supports_investor_conference: bool = Field(False, alias="supportsInvestorConference")
    supports_attention_disposition: bool = Field(False, alias="supportsAttentionDisposition")
    token_configured: bool = Field(False, alias="tokenConfigured")
    records_fetched: int = Field(0, alias="recordsFetched")
    error_message: str | None = Field(None, alias="errorMessage")
    source_note: str = Field(alias="sourceNote")
    checked_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="checkedAt")


class EventsPayload(CamelModel):
    events: list[EventData]
    providers: list[EventProviderStatus]
    source_note: str = Field(alias="sourceNote")
    generated_at: str = Field(alias="generatedAt")
