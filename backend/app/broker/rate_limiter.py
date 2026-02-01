import asyncio
import time


class TokenBucketRateLimiter:
    """Async token bucket rate limiter.

    Allows up to ``max_tokens`` calls per second, refilling at a steady rate.
    Each call to ``acquire()`` consumes one token; if no tokens are available
    the coroutine will sleep until a token is replenished.
    """

    def __init__(self, max_tokens: int = 15, refill_rate: float = 15.0):
        """
        Args:
            max_tokens: Maximum burst size (bucket capacity).
            refill_rate: Tokens added per second.
        """
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self._tokens = float(max_tokens)
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self) -> None:
        """Refill tokens based on elapsed time since last refill."""
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self.max_tokens, self._tokens + elapsed * self.refill_rate)
        self._last_refill = now

    async def acquire(self) -> None:
        """Wait until a token is available, then consume one token."""
        async with self._lock:
            self._refill()
            while self._tokens < 1.0:
                deficit = 1.0 - self._tokens
                wait_time = deficit / self.refill_rate
                await asyncio.sleep(wait_time)
                self._refill()
            self._tokens -= 1.0
