from app.db.base import Base
from app.db.session import engine
from app.models.market import PriceBarModel, QuoteLatestModel, SecurityModel
from app.models.source import JobRunModel, SourceHealthModel


def init_db() -> None:
    # Imports above register models with SQLAlchemy metadata.
    _ = (SecurityModel, QuoteLatestModel, PriceBarModel, SourceHealthModel, JobRunModel)
    Base.metadata.create_all(bind=engine)
