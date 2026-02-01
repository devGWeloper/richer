from loguru import logger


async def refresh_kis_tokens():
    """Placeholder for KIS token auto-refresh task."""
    logger.bind(category="system").debug("KIS token refresh check")
