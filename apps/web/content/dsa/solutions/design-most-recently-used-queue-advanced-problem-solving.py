from typing import List


class Solution:
    def __init__(self, n: int) -> None:
        self._queue: List[int] = list(range(1, n + 1))

    def fetch(self, k: int) -> int:
        value = self._queue.pop(k - 1)
        self._queue.append(value)
        return value
