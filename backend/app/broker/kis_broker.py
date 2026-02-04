import asyncio
from typing import Any

from loguru import logger

from app.broker.adapter import BrokerAdapter
from app.broker.exceptions import BrokerConnectionError, BrokerOrderError
from app.broker.rate_limiter import TokenBucketRateLimiter


class KISBroker(BrokerAdapter):
    """Korea Investment & Securities broker implementation using mojito2."""

    def __init__(
        self,
        app_key: str,
        app_secret: str,
        account_no: str,
        account_suffix: str = "01",
        environment: str = "vps",
        hts_id: str | None = None,
    ):
        self.app_key = app_key
        self.app_secret = app_secret
        self.account_no = account_no
        self.account_suffix = account_suffix
        self.environment = environment
        self.hts_id = hts_id
        self._broker = None
        self._rate_limiter = TokenBucketRateLimiter(max_tokens=15, refill_rate=15.0)
        self._cached_balance: dict[str, Any] | None = None

    def _create_broker(self):
        import mojito

        mock = self.environment == "vps"
        acc_no_full = f"{self.account_no}-{self.account_suffix}"
        broker = mojito.KoreaInvestment(
            api_key=self.app_key,
            api_secret=self.app_secret,
            acc_no=acc_no_full,
            exchange="서울",
            mock=mock,
        )
        return broker

    def _parse_balance_result(self, result: Any) -> dict[str, Any]:
        """fetch_balance 결과를 파싱하여 잔고 정보 반환"""
        if result and isinstance(result, dict):
            output2 = result.get("output2", [])
            if output2 and isinstance(output2, list) and len(output2) > 0:
                summary = output2[0]
                return {
                    "tot_evlu_amt": summary.get("tot_evlu_amt", "0"),
                    "evlu_pfls_smtl_amt": summary.get("evlu_pfls_smtl_amt", "0"),
                    "pchs_amt_smtl_amt": summary.get("pchs_amt_smtl_amt", "0"),
                    "dnca_tot_amt": summary.get("dnca_tot_amt", "0"),
                    "nxdy_excc_amt": summary.get("nxdy_excc_amt", "0"),
                }
        return {}

    async def connect(self) -> bool:
        try:
            self._broker = await asyncio.to_thread(self._create_broker)
            # Test connection by fetching balance and cache the result
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(self._broker.fetch_balance)

            # Cache balance result for later use
            balance = self._parse_balance_result(result)
            if balance:
                self._cached_balance = balance

            logger.bind(category="system").info("KIS broker connected successfully")
            return True
        except Exception as e:
            logger.bind(category="system").error(f"KIS broker connection failed: {e}")
            raise BrokerConnectionError(f"Failed to connect: {e}") from e

    async def get_balance(self) -> dict[str, Any]:
        """계좌 잔고 요약 정보를 반환합니다."""
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(self._broker.fetch_balance)

            balance = self._parse_balance_result(result)
            if balance:
                self._cached_balance = balance
                return balance
            return {}
        except Exception as e:
            # API 호출 실패 시 캐시된 값 반환 (connect 시 저장된 값)
            logger.warning(f"get_balance error: {e}, using cached balance")
            if self._cached_balance:
                return self._cached_balance
            raise BrokerConnectionError(f"Failed to fetch balance: {e}") from e

    async def get_holdings(self) -> list[dict[str, Any]]:
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(self._broker.fetch_balance)
            if hasattr(result, "to_dict"):
                records = result.to_dict(orient="records")
                return [r for r in records if r.get("hldg_qty", 0) > 0]
            return []
        except Exception as e:
            raise BrokerConnectionError(f"Failed to fetch holdings: {e}") from e

    async def get_current_price(self, stock_code: str) -> dict[str, Any]:
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(self._broker.fetch_price, stock_code)
            if isinstance(result, dict):
                output = result.get("output", result)
                return {
                    "stock_code": stock_code,
                    "stock_name": str(output.get("hts_kor_isnm", "")),
                    "current_price": float(output.get("stck_prpr", 0)),
                    "change": float(output.get("prdy_vrss", 0)),
                    "change_rate": float(output.get("prdy_ctrt", 0)),
                    "volume": int(output.get("acml_vol", 0)),
                    "high": float(output.get("stck_hgpr", 0)),
                    "low": float(output.get("stck_lwpr", 0)),
                    "open_price": float(output.get("stck_oprc", 0)),
                }
            return {"stock_code": stock_code, "current_price": 0}
        except Exception as e:
            raise BrokerConnectionError(f"Failed to fetch price for {stock_code}: {e}") from e

    async def get_ohlcv(
        self, stock_code: str, period: str = "D", count: int = 60
    ) -> list[dict[str, Any]]:
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(
                self._broker.fetch_ohlcv, stock_code, timeframe=period, adj_price=True
            )
            if hasattr(result, "to_dict"):
                records = result.to_dict(orient="records")
                return [
                    {
                        "date": str(r.get("stck_bsop_date", "")),
                        "open": float(r.get("stck_oprc", 0)),
                        "high": float(r.get("stck_hgpr", 0)),
                        "low": float(r.get("stck_lwpr", 0)),
                        "close": float(r.get("stck_clpr", 0)),
                        "volume": int(r.get("acml_vol", 0)),
                    }
                    for r in records[:count]
                ]
            return []
        except Exception as e:
            raise BrokerConnectionError(f"Failed to fetch OHLCV for {stock_code}: {e}") from e

    async def buy_market(self, stock_code: str, quantity: int) -> dict[str, Any]:
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(
                self._broker.create_market_buy_order, stock_code, quantity
            )
            return self._parse_order_result(result)
        except Exception as e:
            raise BrokerOrderError(f"Market buy failed for {stock_code}: {e}") from e

    async def sell_market(self, stock_code: str, quantity: int) -> dict[str, Any]:
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(
                self._broker.create_market_sell_order, stock_code, quantity
            )
            return self._parse_order_result(result)
        except Exception as e:
            raise BrokerOrderError(f"Market sell failed for {stock_code}: {e}") from e

    async def buy_limit(
        self, stock_code: str, quantity: int, price: int
    ) -> dict[str, Any]:
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(
                self._broker.create_limit_buy_order, stock_code, quantity, price
            )
            return self._parse_order_result(result)
        except Exception as e:
            raise BrokerOrderError(f"Limit buy failed for {stock_code}: {e}") from e

    async def sell_limit(
        self, stock_code: str, quantity: int, price: int
    ) -> dict[str, Any]:
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(
                self._broker.create_limit_sell_order, stock_code, quantity, price
            )
            return self._parse_order_result(result)
        except Exception as e:
            raise BrokerOrderError(f"Limit sell failed for {stock_code}: {e}") from e

    @staticmethod
    def _parse_order_result(result: Any) -> dict[str, Any]:
        if isinstance(result, dict):
            output = result.get("output", result)
            return {
                "order_no": str(output.get("ODNO", output.get("odno", ""))),
                "filled_price": float(output.get("tot_ccld_amt", 0)) or None,
                "filled_quantity": int(output.get("tot_ccld_qty", 0)) or None,
                "raw": result,
            }
        return {"order_no": "", "raw": result}
