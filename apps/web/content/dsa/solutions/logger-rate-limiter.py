from typing import Dict


class Logger:
    def __init__(self) -> None:
        self._last: Dict[str, int] = {}

    def shouldPrintMessage(self, timestamp: int, message: str) -> bool:
        prev = self._last.get(message, -10_000_000)
        if timestamp < prev + 10:
            return False
        self._last[message] = timestamp
        return True
