from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AccountCreate(BaseModel):
    label: str
    app_key: str
    app_secret: str
    account_no: str
    account_suffix: str = "01"
    environment: str = "vps"
    hts_id: Optional[str] = None


class AccountUpdate(BaseModel):
    label: Optional[str] = None
    environment: Optional[str] = None
    hts_id: Optional[str] = None
    is_active: Optional[bool] = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    label: str
    account_no_masked: str = Field(
        ..., description="Masked account number showing only last 4 characters"
    )
    environment: str
    is_active: bool
    created_at: datetime


class AccountVerifyResponse(BaseModel):
    success: bool
    message: str
    balance: Optional[dict] = None
