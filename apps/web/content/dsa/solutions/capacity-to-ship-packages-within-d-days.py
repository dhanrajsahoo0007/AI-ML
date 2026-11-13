from typing import List


def ship_within_days(weights: List[int], days: int) -> int:
    def fits(cap: int) -> bool:
        need = 1
        cur = 0
        for w in weights:
            if cur + w > cap:
                need += 1
                cur = w
            else:
                cur += w
            if need > days:
                return False
        return True

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if fits(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
