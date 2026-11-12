from typing import List


def max_run_time(n: int, batteries: List[int]) -> int:
    def ok(t: int) -> bool:
        return sum(min(b, t) for b in batteries) >= n * t

    lo, hi = 0, sum(batteries) // n
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2
        if ok(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo
