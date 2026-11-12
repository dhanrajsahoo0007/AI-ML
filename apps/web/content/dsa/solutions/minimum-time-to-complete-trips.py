from typing import List


def minimum_time(time: List[int], totalTrips: int) -> int:
    def trips(t: int) -> int:
        return sum(t // x for x in time)

    lo, hi = 1, min(time) * totalTrips
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if trips(mid) >= totalTrips:
            hi = mid
        else:
            lo = mid + 1
    return lo
