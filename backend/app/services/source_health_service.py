from app.data_sources.provider_registry import ProviderRegistry


class SourceHealthService:
    def __init__(self, registry: ProviderRegistry | None = None) -> None:
        self.registry = registry or ProviderRegistry()

    async def providers(self):
        return await self.registry.health()
