import sys
from pathlib import Path

from loguru import logger

from app.config import settings


def setup_logging():
    logger.remove()

    log_dir = Path(settings.LOG_DIR)
    log_dir.mkdir(exist_ok=True)

    # Console: DEBUG+, colored
    logger.add(
        sys.stderr,
        level=settings.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>",
        colorize=True,
    )

    # App log: INFO+, daily rotation, 30 days
    logger.add(
        str(log_dir / "app_{time:YYYY-MM-DD}.log"),
        level="INFO",
        rotation="00:00",
        retention="30 days",
        compression="gz",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    )

    # Trading log: engine/strategy/order only, 90 days
    logger.add(
        str(log_dir / "trading_{time:YYYY-MM-DD}.log"),
        level="INFO",
        rotation="00:00",
        retention="90 days",
        compression="gz",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
        filter=lambda record: record["extra"].get("category") in ("engine", "strategy", "order"),
    )

    # Error log: WARNING+, 60 days, backtrace
    logger.add(
        str(log_dir / "error_{time:YYYY-MM-DD}.log"),
        level="WARNING",
        rotation="00:00",
        retention="60 days",
        compression="gz",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        backtrace=True,
        diagnose=True,
    )

    return logger
