from typing import List


def max_profit(k: int, prices: List[int]) -> int:
    if not prices:
        return 0
    n = len(prices)
    if k >= n // 2:
        return sum(max(0, prices[i] - prices[i - 1]) for i in range(1, n))
    dp = [[0] * n for _ in range(k + 1)]
    for t in range(1, k + 1):
        maxdiff = -prices[0]
        for i in range(1, n):
            dp[t][i] = max(dp[t][i - 1], prices[i] + maxdiff)
            maxdiff = max(maxdiff, dp[t - 1][i] - prices[i])
    return dp[k][-1]
