import math
from typing import List


def min_speed_on_time(dist: List[int], hour: float) -> int:
    if hour <= len(dist) - 1:
        return -1

    def ok(speed: int) -> bool:
        t = 0.0
        for i in range(len(dist) - 1):
            t += math.ceil(dist[i] / speed)
        t += dist[-1] / speed
        return t <= hour

    lo, hi = 1, 10**7
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if ok(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
