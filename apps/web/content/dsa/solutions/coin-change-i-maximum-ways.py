from typing import List


def change(amount: int, coins: List[int]) -> int:
    dp = [0] * (amount + 1)
    dp[0] = 1
    for c in coins:
        for v in range(c, amount + 1):
            dp[v] += dp[v - c]
    return dp[amount]
