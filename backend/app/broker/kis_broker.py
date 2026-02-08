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

    async def get_index_price(self, index_type: str = "kospi") -> dict[str, Any]:
        """
        KOSPI/KOSDAQ 지수 정보를 조회합니다.
        지수 조회가 불가능한 경우 대표 ETF로 대체합니다.
        """
        # 지수를 대표하는 ETF 코드
        etf_map = {
            "kospi": ("069500", "KODEX 200"),      # KOSPI를 대표하는 ETF
            "kosdaq": ("229200", "KODEX 코스닥150"),  # KOSDAQ을 대표하는 ETF
        }

        etf_code, etf_name = etf_map.get(index_type.lower(), ("069500", "KODEX 200"))

        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(self._broker.fetch_price, etf_code)

            if isinstance(result, dict):
                output = result.get("output", result)
                return {
                    "index_code": etf_code,
                    "index_name": f"{index_type.upper()} ({etf_name})",
                    "current_value": float(output.get("stck_prpr", 0)),
                    "change": float(output.get("prdy_vrss", 0)),
                    "change_rate": float(output.get("prdy_ctrt", 0)),
                    "volume": int(output.get("acml_vol", 0)),
                    "trade_value": int(float(output.get("acml_tr_pbmn", 0)) / 1000000),  # 백만 단위
                    "high": float(output.get("stck_hgpr", 0)),
                    "low": float(output.get("stck_lwpr", 0)),
                    "open_value": float(output.get("stck_oprc", 0)),
                }
            return {
                "index_code": etf_code,
                "index_name": index_type.upper(),
                "current_value": 0,
                "change": 0,
                "change_rate": 0,
                "volume": 0,
                "trade_value": 0,
                "high": 0,
                "low": 0,
                "open_value": 0,
            }
        except Exception as e:
            logger.warning(f"Failed to fetch index {index_type}: {e}")
            raise BrokerConnectionError(f"Failed to fetch index {index_type}: {e}") from e

    async def get_index_chart(self, index_type: str = "kospi", count: int = 20) -> list[dict[str, Any]]:
        """지수 차트 데이터 (일봉)를 조회합니다."""
        etf_map = {
            "kospi": "069500",
            "kosdaq": "229200",
        }
        etf_code = etf_map.get(index_type.lower(), "069500")

        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(
                self._broker.fetch_ohlcv, etf_code, timeframe="D", adj_price=True
            )
            if hasattr(result, "to_dict"):
                records = result.to_dict(orient="records")
                return [
                    {
                        "time": str(r.get("stck_bsop_date", ""))[-4:],  # MMDD 형식
                        "value": float(r.get("stck_clpr", 0)),
                    }
                    for r in records[:count]
                ][::-1]  # 시간순 정렬
            return []
        except Exception as e:
            logger.warning(f"Failed to fetch index chart {index_type}: {e}")
            return []

    async def _fetch_stock_price(self, code: str, name: str, mkt: str) -> dict[str, Any] | None:
        """단일 종목 가격 조회 헬퍼"""
        try:
            await self._rate_limiter.acquire()
            result = await asyncio.to_thread(self._broker.fetch_price, code)
            if isinstance(result, dict):
                output = result.get("output", result)
                return {
                    "stock_code": code,
                    "stock_name": name,
                    "current_price": float(output.get("stck_prpr", 0)),
                    "change": float(output.get("prdy_vrss", 0)),
                    "change_rate": float(output.get("prdy_ctrt", 0)),
                    "volume": int(output.get("acml_vol", 0)),
                    "trade_value": int(float(output.get("acml_tr_pbmn", 0)) / 1000000),
                    "market": mkt,
                }
        except Exception as e:
            logger.warning(f"Failed to fetch price for {code}: {e}")
        return None

    async def get_popular_stocks(
        self, category: str = "volume", market: str = "all", limit: int = 5
    ) -> list[dict[str, Any]]:
        """
        인기 종목을 조회합니다.
        category: "volume" (거래량 상위), "gainers" (상승률 상위), "losers" (하락률 상위)

        참고: KIS API에서 실시간 순위 조회가 제한적이므로
        주요 종목들의 현재가를 조회하여 정렬합니다.
        """
        # 대표 종목 리스트 (KOSPI + KOSDAQ 주요 종목) - 조회 수 최소화
        major_stocks = [
            ("005930", "삼성전자", "KOSPI"),
            ("000660", "SK하이닉스", "KOSPI"),
            ("373220", "LG에너지솔루션", "KOSPI"),
            ("035420", "NAVER", "KOSPI"),
            ("035720", "카카오", "KOSPI"),
            ("005380", "현대차", "KOSPI"),
            ("000270", "기아", "KOSPI"),
            ("068270", "셀트리온", "KOSPI"),
            ("247540", "에코프로비엠", "KOSDAQ"),
            ("086520", "에코프로", "KOSDAQ"),
        ]

        # 시장 필터링
        if market.lower() != "all":
            major_stocks = [s for s in major_stocks if s[2].lower() == market.lower()]

        # 병렬로 가격 조회 (최대 limit+2개만)
        stocks_to_fetch = major_stocks[:limit + 2]
        tasks = [
            self._fetch_stock_price(code, name, mkt)
            for code, name, mkt in stocks_to_fetch
        ]
        results_raw = await asyncio.gather(*tasks, return_exceptions=True)

        # 성공한 결과만 필터링
        results = [r for r in results_raw if isinstance(r, dict) and r is not None]

        # 카테고리별 정렬
        if category == "volume":
            results.sort(key=lambda x: x["volume"], reverse=True)
        elif category == "gainers":
            results.sort(key=lambda x: x["change_rate"], reverse=True)
        elif category == "losers":
            results.sort(key=lambda x: x["change_rate"])

        # 랭크 부여
        return [
            {**item, "rank": idx + 1}
            for idx, item in enumerate(results[:limit])
        ]
