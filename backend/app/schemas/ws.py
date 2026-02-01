from pydantic import BaseModel


class WSMessage(BaseModel):
    type: str
    channel: str
    timestamp: str
    payload: dict
