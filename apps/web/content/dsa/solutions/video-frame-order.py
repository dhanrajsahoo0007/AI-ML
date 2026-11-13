from typing import Dict, Optional, Tuple


class VideoFrameReorderService:
    def __init__(self) -> None:
        self._buf: Dict[int, str] = {}
        self._next = 0

    def SaveFrame(self, seq: int, payload: str) -> None:
        self._buf[seq] = payload

    def GetFrame(self) -> Optional[Tuple[int, str]]:
        if self._next not in self._buf:
            return None
        data = self._buf.pop(self._next)
        out = (self._next, data)
        self._next += 1
        return out
