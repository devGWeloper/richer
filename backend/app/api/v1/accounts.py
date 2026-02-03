from fastapi import APIRouter, Depends, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.broker.kis_broker import KISBroker
from app.core.database import get_db
from app.core.exceptions import AppException, NotFoundError
from app.core.security import encrypt_value
from app.engine.manager import trading_manager
from app.engine.state import SessionState
from app.models.account import KISAccount
from app.models.trade_session import TradeSession
from app.models.user import User
from app.schemas.account import (
    AccountCreate,
    AccountResponse,
    AccountUpdate,
    AccountVerifyResponse,
)
from app.services.account_service import (
    get_account,
    get_decrypted_credentials,
    get_user_accounts,
    mask_account_no,
)

router = APIRouter()


def _to_response(account: KISAccount) -> AccountResponse:
    return AccountResponse(
        id=account.id,
        user_id=account.user_id,
        label=account.label,
        account_no_masked=mask_account_no(account.account_no),
        environment=account.environment,
        is_active=account.is_active,
        created_at=account.created_at,
    )


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    accounts = await get_user_accounts(db, current_user.id)
    return [_to_response(a) for a in accounts]


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    body: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        account = KISAccount(
            user_id=current_user.id,
            label=body.label,
            app_key=encrypt_value(body.app_key),
            app_secret=encrypt_value(body.app_secret),
            account_no=encrypt_value(body.account_no),
            account_suffix=body.account_suffix,
            environment=body.environment,
            hts_id=body.hts_id,
        )
    except Exception as e:
        logger.bind(category="account").error(f"Failed to encrypt account credentials: {e}")
        raise AppException("계좌 정보 암호화에 실패했습니다. 다시 시도해주세요.")

    db.add(account)
    await db.flush()
    await db.refresh(account)
    logger.bind(category="account").info(f"Account created: {account.id} for user {current_user.id}")
    return _to_response(account)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: int,
    body: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await get_account(db, account_id, current_user.id)
    if not account:
        raise NotFoundError("Account not found")

    if body.label is not None:
        account.label = body.label
    if body.environment is not None:
        account.environment = body.environment
    if body.hts_id is not None:
        account.hts_id = body.hts_id
    if body.is_active is not None:
        account.is_active = body.is_active

    await db.flush()
    await db.refresh(account)
    return _to_response(account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await get_account(db, account_id, current_user.id)
    if not account:
        raise NotFoundError("Account not found")

    # 해당 계좌로 실행 중인 세션들을 찾아서 종료
    result = await db.execute(
        select(TradeSession).where(
            TradeSession.account_id == account_id,
            TradeSession.user_id == current_user.id,
            TradeSession.status.in_(
                [SessionState.RUNNING, SessionState.PAUSED, SessionState.PENDING]
            ),
        )
    )
    active_sessions = result.scalars().all()

    for session in active_sessions:
        # 메모리에서 실행 중인 executor 종료
        trading_manager.stop_session(session.id)
        # DB 상태 업데이트
        session.status = SessionState.STOPPED
        logger.bind(category="account").info(
            f"Stopped session {session.id} due to account {account_id} deletion"
        )

    await db.delete(account)


@router.post("/{account_id}/verify", response_model=AccountVerifyResponse)
async def verify_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await get_account(db, account_id, current_user.id)
    if not account:
        raise NotFoundError("Account not found")

    creds = get_decrypted_credentials(account)
    broker = KISBroker(**creds)

    try:
        await broker.connect()
        balance = await broker.get_balance()
        logger.bind(category="account").info(f"Account {account_id} verified successfully")
        return AccountVerifyResponse(
            success=True, message="연결 성공! API 인증이 정상적으로 완료되었습니다.", balance=balance
        )
    except Exception as e:
        logger.bind(category="account").warning(f"Account {account_id} verification failed: {e}")
        # 사용자 친화적인 에러 메시지로 변환
        error_msg = str(e)
        if "access_token" in error_msg.lower() or "token" in error_msg.lower():
            user_msg = "API 인증에 실패했습니다. App Key와 App Secret을 확인해주세요."
        elif "account" in error_msg.lower():
            user_msg = "계좌번호가 올바르지 않습니다. 계좌번호를 확인해주세요."
        elif "network" in error_msg.lower() or "connection" in error_msg.lower():
            user_msg = "네트워크 연결에 실패했습니다. 잠시 후 다시 시도해주세요."
        else:
            user_msg = "연결에 실패했습니다. 입력 정보를 확인하고 다시 시도해주세요."
        return AccountVerifyResponse(success=False, message=user_msg)
