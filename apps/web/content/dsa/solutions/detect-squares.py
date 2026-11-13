from collections import Counter
from typing import List


class Solution:
    def __init__(self) -> None:
        self._cnt: Counter = Counter()

    def add(self, point: List[int]) -> None:
        self._cnt[tuple(point)] += 1

    def count(self, point: List[int]) -> int:
        x1, y1 = point[0], point[1]
        ans = 0
        for (x3, y3), c in self._cnt.items():
            if x3 == x1 or y3 == y1:
                continue
            if abs(x1 - x3) != abs(y1 - y3):
                continue
            x2, y2 = x1, y3
            x4, y4 = x3, y1
            ans += c * self._cnt[(x2, y2)] * self._cnt[(x4, y4)]
        return ans
