from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.account import KISAccount
    from app.models.strategy import Strategy
    from app.models.trade import Trade
    from app.models.user import User


class TradeSession(Base):
    __tablename__ = "trade_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("kis_accounts.id"), nullable=False
    )
    strategy_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("strategies.id"), nullable=False
    )
    stock_code: Mapped[str] = mapped_column(String(20), nullable=False)
    stock_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    total_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    stopped_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="trade_sessions")
    account: Mapped["KISAccount"] = relationship("KISAccount")
    strategy: Mapped["Strategy"] = relationship("Strategy")
    trades: Mapped[List["Trade"]] = relationship(
        "Trade", back_populates="session", lazy="selectin"
    )
