import bisect
from collections import deque
from typing import Deque, List


class MovingAverageExcludingLargest:
    def __init__(self, k: int) -> None:
        if k <= 0:
            raise ValueError("k must be positive")
        self._k = k
        self._dq: Deque[int] = deque()
        self._sorted: List[int] = []

    def add(self, value: int) -> None:
        if len(self._dq) == self._k:
            old = self._dq.popleft()
            idx = bisect.bisect_left(self._sorted, old)
            self._sorted.pop(idx)
        self._dq.append(value)
        bisect.insort(self._sorted, value)

    def get_average(self, x: int) -> int:
        if not (0 <= x < self._k):
            raise ValueError("need 0 <= x < k")
        if len(self._dq) < self._k:
            raise ValueError("window not full")
        # largest x elements are at the right end of sorted list
        use = self._sorted[: len(self._sorted) - x]
        if not use:
            raise ValueError("nothing left after removing x largest")
        return sum(use) // len(use)
