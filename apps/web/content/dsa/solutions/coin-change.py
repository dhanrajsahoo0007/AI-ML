from typing import List


def coin_change(coins: List[int], amount: int) -> int:
    inf = amount + 1
    dp = [inf] * (amount + 1)
    dp[0] = 0
    for v in range(1, amount + 1):
        for c in coins:
            if c <= v:
                dp[v] = min(dp[v], dp[v - c] + 1)
    return dp[amount] if dp[amount] <= amount else -1
