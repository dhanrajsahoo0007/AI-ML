from functools import lru_cache


def super_egg_drop(k: int, n: int) -> int:
    @lru_cache(None)
    def dp(e: int, f: int) -> int:
        if f == 0:
            return 0
        if e == 1:
            return f
        lo, hi = 1, f
        while lo + 1 < hi:
            mid = (lo + hi) // 2
            left = dp(e - 1, mid - 1)
            right = dp(e, f - mid)
            if left < right:
                lo = mid
            else:
                hi = mid
        x = hi
        return 1 + max(dp(e - 1, x - 1), dp(e, f - x))

    return dp(k, n)
