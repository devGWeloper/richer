import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_client(client: AsyncClient):
    """Client with a registered and authenticated user."""
    res = await client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "password": "testpass123"},
    )
    token = res.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client


class TestAuthAPI:
    async def test_register(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/auth/register",
            json={"username": "newuser", "password": "password123"},
        )
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_register_duplicate(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/register",
            json={"username": "dupuser", "password": "password123"},
        )
        res = await client.post(
            "/api/v1/auth/register",
            json={"username": "dupuser", "password": "password123"},
        )
        assert res.status_code == 409

    async def test_login(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/register",
            json={"username": "loginuser", "password": "password123"},
        )
        res = await client.post(
            "/api/v1/auth/login",
            json={"username": "loginuser", "password": "password123"},
        )
        assert res.status_code == 200
        assert "access_token" in res.json()

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/register",
            json={"username": "wrongpw", "password": "password123"},
        )
        res = await client.post(
            "/api/v1/auth/login",
            json={"username": "wrongpw", "password": "wrongpassword"},
        )
        assert res.status_code == 401

    async def test_get_me(self, auth_client: AsyncClient):
        res = await auth_client.get("/api/v1/auth/me")
        assert res.status_code == 200
        assert res.json()["username"] == "testuser"

    async def test_refresh_token(self, client: AsyncClient):
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={"username": "refreshuser", "password": "password123"},
        )
        refresh_token = reg_res.json()["refresh_token"]
        res = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert res.status_code == 200
        assert "access_token" in res.json()


class TestStrategiesAPI:
    async def test_list_strategy_types(self, auth_client: AsyncClient):
        res = await auth_client.get("/api/v1/strategies/types")
        assert res.status_code == 200
        types = res.json()
        assert len(types) >= 3

    async def test_create_strategy(self, auth_client: AsyncClient):
        res = await auth_client.post(
            "/api/v1/strategies",
            json={
                "name": "Test Threshold",
                "strategy_type": "threshold",
                "parameters": {"buy_price": 50000, "sell_price": 60000},
            },
        )
        assert res.status_code == 201
        assert res.json()["name"] == "Test Threshold"

    async def test_list_strategies(self, auth_client: AsyncClient):
        await auth_client.post(
            "/api/v1/strategies",
            json={
                "name": "Test",
                "strategy_type": "rsi",
                "parameters": {"rsi_period": 14, "oversold": 30, "overbought": 70},
            },
        )
        res = await auth_client.get("/api/v1/strategies")
        assert res.status_code == 200
        assert len(res.json()) >= 1

    async def test_delete_strategy(self, auth_client: AsyncClient):
        create_res = await auth_client.post(
            "/api/v1/strategies",
            json={
                "name": "ToDelete",
                "strategy_type": "threshold",
                "parameters": {"buy_price": 100, "sell_price": 200},
            },
        )
        sid = create_res.json()["id"]
        res = await auth_client.delete(f"/api/v1/strategies/{sid}")
        assert res.status_code == 204


class TestMarketAPI:
    async def test_search_stocks(self, auth_client: AsyncClient):
        res = await auth_client.get("/api/v1/market/search", params={"q": "삼성"})
        assert res.status_code == 200
        results = res.json()["results"]
        assert len(results) > 0
        assert any("삼성" in r["stock_name"] for r in results)


class TestDashboardAPI:
    async def test_summary(self, auth_client: AsyncClient):
        res = await auth_client.get("/api/v1/dashboard/summary")
        assert res.status_code == 200
        data = res.json()
        assert "total_balance" in data
        assert "active_sessions" in data

    async def test_recent_trades(self, auth_client: AsyncClient):
        res = await auth_client.get("/api/v1/dashboard/recent-trades")
        assert res.status_code == 200
        assert isinstance(res.json(), list)
