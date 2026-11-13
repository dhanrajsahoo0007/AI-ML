from typing import List


def cut_rod(prices: List[int], n: int) -> int:
    dp = [0] * (n + 1)
    for w in range(1, n + 1):
        best = 0
        for i in range(1, w + 1):
            best = max(best, prices[i - 1] + dp[w - i])
        dp[w] = best
    return dp[n]
