"""
Product Ingestion Service
Adapters for sourcing products from various platforms.
All adapters normalize into the product_catalog schema
and run AssetPrepService before eligibility for Live mode.
"""

from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass


@dataclass
class NormalizedProduct:
    """Normalized product data from any adapter."""

    source_id: str
    source_platform: str
    name: str
    brand: str
    category: str
    price: float
    image_url: str
    description: str
    material: Optional[str] = None
    finish: Optional[str] = None
    color: Optional[str] = None
    dimensions: Optional[dict] = None
    room_types: list[str] | None = None
    style_tags: list[str] | None = None


class ProductIngestionAdapter(ABC):
    """Base adapter interface for product ingestion."""

    @abstractmethod
    async def search(self, query: str, limit: int = 20) -> list[NormalizedProduct]:
        """Search for products on the platform."""
        ...

    @abstractmethod
    async def get_product(self, product_id: str) -> Optional[NormalizedProduct]:
        """Get a specific product by its platform ID."""
        ...

    @abstractmethod
    async def get_category(
        self, category: str, limit: int = 50
    ) -> list[NormalizedProduct]:
        """Get products by category."""
        ...


class PinterestAdapter(ProductIngestionAdapter):
    """
    Pinterest adapter stub.
    In production: uses Pinterest API to search pins for product inspiration
    and extract product links from pins.
    """

    async def search(self, query: str, limit: int = 20) -> list[NormalizedProduct]:
        # Production: Call Pinterest API
        # GET https://api.pinterest.com/v5/search/pins?query={query}
        return []

    async def get_product(self, product_id: str) -> Optional[NormalizedProduct]:
        return None

    async def get_category(
        self, category: str, limit: int = 50
    ) -> list[NormalizedProduct]:
        return []


class SerpAdapter(ProductIngestionAdapter):
    """
    SERP adapter stub.
    In production: uses Google Shopping API / SerpAPI to find
    products with prices and images.
    """

    async def search(self, query: str, limit: int = 20) -> list[NormalizedProduct]:
        # Production: Call SerpAPI
        # GET https://serpapi.com/search?engine=google_shopping&q={query}
        return []

    async def get_product(self, product_id: str) -> Optional[NormalizedProduct]:
        return None

    async def get_category(
        self, category: str, limit: int = 50
    ) -> list[NormalizedProduct]:
        return []


class HomeDepotAdapter(ProductIngestionAdapter):
    """
    Home Depot adapter stub.
    In production: uses Home Depot Affiliate API for product data,
    pricing, and availability.
    """

    async def search(self, query: str, limit: int = 20) -> list[NormalizedProduct]:
        # Production: Call Home Depot API
        return []

    async def get_product(self, product_id: str) -> Optional[NormalizedProduct]:
        return None

    async def get_category(
        self, category: str, limit: int = 50
    ) -> list[NormalizedProduct]:
        return []


class ProductIngestionService:
    """
    Orchestrates product ingestion from multiple sources.
    Normalizes data and runs asset preparation.
    """

    def __init__(self):
        self.adapters: dict[str, ProductIngestionAdapter] = {
            "pinterest": PinterestAdapter(),
            "serp": SerpAdapter(),
            "homedepot": HomeDepotAdapter(),
        }

    async def ingest_from_source(
        self,
        source: str,
        query: str,
        limit: int = 20,
    ) -> list[NormalizedProduct]:
        """
        Search a source, normalize results, and prepare assets.

        Flow:
        1. Call adapter.search()
        2. Normalize each product
        3. Run AssetPrepService on each image
        4. Insert into product_catalog with insertion_ready status
        5. Return results
        """
        adapter = self.adapters.get(source)
        if not adapter:
            raise ValueError(f"Unknown source: {source}")

        products = await adapter.search(query, limit)

        # In production: for each product, run asset prep
        # for product in products:
        #     prep_result = await asset_prep.prepare(product.image_url, product.source_id)
        #     product.is_insertion_ready = prep_result.is_insertion_ready

        return products

    async def ingest_all_sources(
        self, query: str, limit: int = 10
    ) -> list[NormalizedProduct]:
        """Search all adapters in parallel and merge results."""
        import asyncio

        tasks = [
            self.ingest_from_source(source, query, limit)
            for source in self.adapters
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_products = []
        for result in results:
            if isinstance(result, list):
                all_products.extend(result)

        return all_products
