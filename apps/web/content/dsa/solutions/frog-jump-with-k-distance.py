from typing import List


def min_jump_cost(stones: List[int], k: int) -> int:
    n = len(stones)
    dp = [float("inf")] * n
    dp[0] = 0
    for i in range(1, n):
        for j in range(1, min(i, k) + 1):
            dp[i] = min(dp[i], dp[i - j] + abs(stones[i] - stones[i - j]))
    return int(dp[n - 1])
