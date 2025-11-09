from __future__ import annotations

import logging
from collections import deque
from datetime import datetime
from typing import Deque, Dict, List, Optional

MAX_LOGS = 5000

_log_buffer: Deque[Dict] = deque(maxlen=MAX_LOGS)

class MemoryLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            _log_buffer.append(
                {
                    "level": record.levelname,
                    "name": record.name,
                    "created": datetime.fromtimestamp(record.created).isoformat(),
                    "message": self.format(record),
                }
            )
        except Exception:
            # Silently ignore logging errors
            pass

_handler: Optional[MemoryLogHandler] = None

def install_memory_handler(level: int = logging.INFO) -> None:
    global _handler
    if _handler is not None:
        return
    _handler = MemoryLogHandler()
    _handler.setLevel(level)
    formatter = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    _handler.setFormatter(formatter)
    root = logging.getLogger()
    # Ensure we don't add multiple times on reloads
    if _handler not in root.handlers:
        root.addHandler(_handler)
    # Ensure uvicorn loggers propagate to root (single handler captures once)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.propagate = True


def get_logs(level: Optional[str] = None, q: Optional[str] = None, limit: int = 200) -> List[Dict]:
    level = (level or "").upper()
    lvlno = getattr(logging, level, None) if level else None
    data = list(_log_buffer)
    if lvlno is not None:
        data = [r for r in data if getattr(logging, r.get("level", "INFO"), logging.INFO) >= lvlno]
    if q:
        ql = q.lower()
        data = [r for r in data if ql in (r.get("message", "").lower() + r.get("name", "").lower())]
    if limit and limit > 0:
        data = data[-limit:]
    return data


def logs_as_text(level: Optional[str] = None, q: Optional[str] = None, limit: int = 1000) -> str:
    rows = get_logs(level=level, q=q, limit=limit)
    return "\n".join(
        f"{r.get('created')} {r.get('level')} [{r.get('name')}] {r.get('message')}" for r in rows
    )
