from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.account import KISAccount
    from app.models.strategy import Strategy
    from app.models.trade import Trade
    from app.models.trade_log import TradeLog
    from app.models.trade_session import TradeSession


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    accounts: Mapped[List["KISAccount"]] = relationship(
        "KISAccount", back_populates="user", lazy="selectin"
    )
    strategies: Mapped[List["Strategy"]] = relationship(
        "Strategy", back_populates="user", lazy="selectin"
    )
    trade_sessions: Mapped[List["TradeSession"]] = relationship(
        "TradeSession", back_populates="user", lazy="selectin"
    )
    trades: Mapped[List["Trade"]] = relationship(
        "Trade", back_populates="user", lazy="selectin"
    )
    trade_logs: Mapped[List["TradeLog"]] = relationship(
        "TradeLog", back_populates="user", lazy="selectin"
    )
