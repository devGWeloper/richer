from enum import Enum


class SessionState(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"


VALID_TRANSITIONS: dict[SessionState, set[SessionState]] = {
    SessionState.PENDING: {SessionState.RUNNING, SessionState.STOPPED},
    SessionState.RUNNING: {SessionState.PAUSED, SessionState.STOPPED, SessionState.ERROR},
    SessionState.PAUSED: {SessionState.RUNNING, SessionState.STOPPED},
    SessionState.STOPPED: set(),
    SessionState.ERROR: {SessionState.STOPPED},
}


def can_transition(current: SessionState, target: SessionState) -> bool:
    """Return True if transitioning from *current* to *target* is valid."""
    return target in VALID_TRANSITIONS.get(current, set())
