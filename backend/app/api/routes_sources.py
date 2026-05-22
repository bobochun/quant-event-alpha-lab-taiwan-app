from fastapi import APIRouter

from app.schemas.common import ok_response
from app.services.source_health_service import SourceHealthService

router = APIRouter(prefix="/market-data", tags=["sources"])


@router.get("/providers")
async def providers():
    rows = await SourceHealthService().providers()
    return ok_response(
        [row.model_dump(by_alias=True) for row in rows],
        "Demo",
        "provider 狀態包含授權、即時性、週期支援與 fallback 說明。",
    )


@router.get("/source-health")
async def source_health():
    rows = await SourceHealthService().providers()
    return ok_response(
        [row.model_dump(by_alias=True) for row in rows],
        "Demo",
        "資料源健康檢查完成；失敗 provider 不會造成前端白屏。",
    )
