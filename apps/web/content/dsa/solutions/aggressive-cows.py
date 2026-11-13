from typing import List


def aggressive_cows(stalls: List[int], k: int) -> int:
    stalls.sort()
    n = len(stalls)

    def can(min_dist: int) -> bool:
        placed = 1
        last = stalls[0]
        for i in range(1, n):
            if stalls[i] - last >= min_dist:
                placed += 1
                last = stalls[i]
                if placed == k:
                    return True
        return False

    lo, hi = 0, stalls[-1] - stalls[0]
    best = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        if can(mid):
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best
