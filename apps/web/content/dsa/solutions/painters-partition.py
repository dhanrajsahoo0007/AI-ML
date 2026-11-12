from typing import List


def min_time(boards: List[int], k: int) -> int:
    def painters_needed(cap: int) -> int:
        p = 1
        cur = 0
        for b in boards:
            if b > cap:
                return k + 1
            if cur + b > cap:
                p += 1
                cur = b
            else:
                cur += b
            if p > k:
                return p
        return p

    lo, hi = max(boards), sum(boards)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if painters_needed(mid) <= k:
            hi = mid
        else:
            lo = mid + 1
    return lo
