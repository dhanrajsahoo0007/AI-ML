from typing import List


def new21_game(n: int, k: int, maxPts: int) -> float:
    if k == 0 or n >= k + maxPts - 1:
        return 1.0
    dp: List[float] = [0.0] * (n + 1)
    dp[0] = 1.0
    s = 1.0
    W = maxPts
    for i in range(1, n + 1):
        dp[i] = s / W
        if i < k:
            s += dp[i]
        if i - W >= 0 and i - W < k:
            s -= dp[i - W]
    return sum(dp[k:])


# --- Glue (same as the starter) ---

def _rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, list):
        return [_rounded(v) for v in x]
    return x


def new21_game_tests(a0, a1, a2):  # the entry the tests call
    result = new21_game(a0, a1, a2)
    result = _rounded(result)
    return result
