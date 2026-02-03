from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt_value, encrypt_value
from app.models.account import KISAccount


async def get_user_accounts(db: AsyncSession, user_id: int) -> list[KISAccount]:
    result = await db.execute(
        select(KISAccount)
        .where(KISAccount.user_id == user_id)
        .order_by(KISAccount.created_at.desc())
    )
    return list(result.scalars().all())


async def get_account(
    db: AsyncSession, account_id: int, user_id: int
) -> KISAccount | None:
    result = await db.execute(
        select(KISAccount).where(
            KISAccount.id == account_id, KISAccount.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def get_first_active_account(
    db: AsyncSession, user_id: int
) -> KISAccount | None:
    result = await db.execute(
        select(KISAccount)
        .where(KISAccount.user_id == user_id, KISAccount.is_active == True)  # noqa: E712
        .limit(1)
    )
    return result.scalar_one_or_none()


def get_decrypted_credentials(account: KISAccount) -> dict:
    try:
        return {
            "app_key": decrypt_value(account.app_key),
            "app_secret": decrypt_value(account.app_secret),
            "account_no": decrypt_value(account.account_no),
            "account_suffix": account.account_suffix,
            "environment": account.environment,
            "hts_id": account.hts_id,
        }
    except Exception as e:
        from app.core.exceptions import AppException
        raise AppException(
            f"계좌 인증 정보를 복호화할 수 없습니다. 계좌를 다시 등록해주세요. (계좌: {account.label})"
        )


def mask_account_no(account_no_encrypted: str) -> str:
    try:
        decrypted = decrypt_value(account_no_encrypted)
        return "****" + decrypted[-4:]
    except Exception:
        return "****"
