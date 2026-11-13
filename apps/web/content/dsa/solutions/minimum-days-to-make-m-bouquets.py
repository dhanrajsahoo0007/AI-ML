from typing import List


def min_days(bloomDay: List[int], m: int, k: int) -> int:
    if m * k > len(bloomDay):
        return -1

    def bouquets_by(day: int) -> int:
        streak = 0
        b = 0
        for d in bloomDay:
            if d <= day:
                streak += 1
                if streak == k:
                    b += 1
                    streak = 0
            else:
                streak = 0
        return b

    lo, hi = 1, max(bloomDay)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if bouquets_by(mid) >= m:
            hi = mid
        else:
            lo = mid + 1
    return lo
