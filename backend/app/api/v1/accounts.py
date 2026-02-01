from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.broker.kis_broker import KISBroker
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.security import encrypt_value
from app.models.account import KISAccount
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
    db.add(account)
    await db.flush()
    await db.refresh(account)
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
        return AccountVerifyResponse(
            success=True, message="Connection successful", balance=balance
        )
    except Exception as e:
        return AccountVerifyResponse(success=False, message=str(e))
