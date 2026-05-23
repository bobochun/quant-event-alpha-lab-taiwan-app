from app.db.base import Base
from app.db.session import engine
from app.models.intelligence import CrawlRunModel, IntelligenceItemModel
from app.models.market import (
    DataQualityReportModel,
    EventStudyResultModel,
    FactorScoreModel,
    PriceBarModel,
    QuantJobRunModel,
    QuoteLatestModel,
    SecurityModel,
)
from app.models.source import JobRunModel, SourceHealthModel


def init_db() -> None:
    # Imports above register every SQLAlchemy model with Base.metadata.
    # SQLite local mode uses create_all; production PostgreSQL should use Alembic migrations.
    _ = (
        SecurityModel,
        QuoteLatestModel,
        PriceBarModel,
        FactorScoreModel,
        EventStudyResultModel,
        DataQualityReportModel,
        QuantJobRunModel,
        SourceHealthModel,
        JobRunModel,
        IntelligenceItemModel,
        CrawlRunModel,
    )
    Base.metadata.create_all(bind=engine)
