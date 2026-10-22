import time
from datetime import datetime, timezone
from typing import Any, Optional, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures a datetime is timezone-aware UTC, whether loaded from SQLite or Postgres."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class TTLCache:
    """High-performance in-memory TTL cache for expensive analytics and static lookups."""

    def __init__(self, default_ttl_seconds: int = 15):
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if time.time() > expires_at:
            self._cache.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        self._cache[key] = (time.time() + ttl, value)

    def invalidate(self, prefix: Optional[str] = None) -> None:
        if prefix is None:
            self._cache.clear()
        else:
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(prefix)]
            for k in keys_to_remove:
                self._cache.pop(k, None)


# Shared global caches
dashboard_cache = TTLCache(default_ttl_seconds=15)
static_cache = TTLCache(default_ttl_seconds=3600)  # 1 hour for bureaus, SLA config
