# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Richer is a Korean stock auto-trading platform with real-time strategy execution. It uses FastAPI + SQLAlchemy async backend with React + Zustand frontend, integrated with KIS (Korea Investment & Securities) broker API via Mojito2.

## Common Commands

### Backend (from `/backend`)
```bash
pip install -e ".[dev]"              # Install with dev dependencies
pytest                                # Run all tests
pytest tests/test_api.py -v          # Run specific test file
uvicorn app.main:app --reload --port 8000  # Development server
alembic upgrade head                  # Run database migrations
alembic revision --autogenerate -m "description"  # Create migration
```

### Frontend (from `/frontend`)
```bash
npm install                          # Install dependencies
npm run dev                          # Development server (port 5173, proxies to backend:8000)
npm run build                        # Production build
```

### Docker
```bash
docker-compose up                    # Full stack (backend:8000, frontend:80)
docker-compose up --build            # Rebuild and start
```

## Architecture

### Backend Structure (`/backend/app`)
- **api/v1/** - REST endpoints organized by domain (auth, accounts, dashboard, market, strategies, trading, logs)
- **broker/** - KIS broker integration with adapter pattern, rate limiting
- **engine/** - Trading execution engine: `executor.py` runs strategy loop, `manager.py` orchestrates sessions
- **strategies/** - Base strategy interface + implementations (SMA crossover, RSI, Threshold)
- **services/** - Business logic layer between API and data
- **models/** - SQLAlchemy ORM models (async with aiosqlite)
- **schemas/** - Pydantic request/response schemas
- **ws/** - WebSocket connection manager for real-time updates
- **tasks/** - APScheduler background tasks (token refresh)

### Frontend Structure (`/frontend/src`)
- **pages/** - Route components (Login, Dashboard, Trading, Strategies, History, Settings)
- **components/** - Organized by feature (common, dashboard, layout, settings, trading)
- **stores/** - Zustand stores: `authStore` (JWT), `tradingStore` (execution state), `wsStore` (WebSocket)
- **hooks/** - Custom hooks wrapping stores and TanStack Query
- **api/** - Axios client with endpoint functions

### Key Patterns
- Path alias: `@/` resolves to `./src/` in frontend
- Async everywhere: FastAPI async routes, SQLAlchemy async sessions
- Strategy pattern: All trading strategies inherit from `BaseStrategy` and register via decorator
- Signal-based trading: Strategies emit BUY/SELL/HOLD signals, executor handles order placement

### Trading Engine Flow
1. User starts strategy via API → `StrategyManager.start_strategy()`
2. `StrategyExecutor` runs async loop checking market hours (KST 9:00-15:30)
3. Strategy generates signals from price data (via broker adapter)
4. Signals trigger order execution through `OrderService`
5. WebSocket broadcasts state changes to connected clients

### Security
- JWT authentication with bcrypt password hashing
- Fernet encryption for broker credentials stored in DB
- CORS configured via environment variables

## Configuration

Copy `.env.example` to `.env` for local development. Key settings:
- `DATABASE_URL` - SQLite path (async: `sqlite+aiosqlite:///...`)
- `SECRET_KEY` - JWT signing key
- `ENCRYPTION_KEY` - Fernet key for credential encryption
- `KIS_*` - Broker API credentials (app key, secret, account number)

## Testing

Backend tests use pytest-asyncio. Test files in `/backend/tests/`:
- `test_api.py` - API endpoint tests
- `test_strategies.py` - Strategy logic tests

Run single test: `pytest tests/test_api.py::test_function_name -v`
