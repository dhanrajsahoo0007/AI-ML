from functools import lru_cache


def super_egg_drop(k: int, n: int) -> int:
    @lru_cache(None)
    def dp(e: int, f: int) -> int:
        if f == 0:
            return 0
        if e == 1:
            return f
        best = 10**9
        for x in range(1, f + 1):
            best = min(best, 1 + max(dp(e - 1, x - 1), dp(e, f - x)))
        return best

    return dp(k, n)
