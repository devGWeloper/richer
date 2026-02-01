from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class StrategyCreate(BaseModel):
    name: str
    strategy_type: str
    parameters: dict = Field(default_factory=dict)


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    parameters: Optional[dict] = None
    is_active: Optional[bool] = None


class StrategyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    strategy_type: str
    parameters: dict
    is_active: bool
    created_at: datetime


class StrategyTypeInfo(BaseModel):
    type_name: str
    display_name: str
    description: str
    parameter_schema: dict
