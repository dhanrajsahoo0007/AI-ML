from typing import List


def coin_change(coins: List[int], amount: int) -> int:
    inf = amount + 1
    dp = [inf] * (amount + 1)
    dp[0] = 0
    for c in coins:
        for v in range(c, amount + 1):
            dp[v] = min(dp[v], dp[v - c] + 1)
    return dp[amount] if dp[amount] <= amount else -1


# --- Glue (same as the starter) ---

def coin_change_tests(a0, a1):  # the entry the tests call
    result = coin_change(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
