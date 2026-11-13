import math
from typing import List


def min_eating_speed(piles: List[int], h: int) -> int:
    def hours(speed: int) -> int:
        return sum(math.ceil(p / speed) for p in piles)

    lo, hi = 1, max(piles)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if hours(mid) <= h:
            hi = mid
        else:
            lo = mid + 1
    return lo
