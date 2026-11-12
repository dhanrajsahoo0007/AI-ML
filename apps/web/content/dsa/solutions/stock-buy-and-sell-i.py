from typing import List


def max_profit(prices: List[int]) -> int:
    best = 0
    lo = 10**9
    for p in prices:
        lo = min(lo, p)
        best = max(best, p - lo)
    return best
