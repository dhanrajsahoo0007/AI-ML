from typing import List


def min_energy(height: List[int]) -> int:
    n = len(height)
    if n == 1:
        return 0
    dp = [0] * n
    dp[0] = 0
    dp[1] = abs(height[1] - height[0])
    for i in range(2, n):
        one = dp[i - 1] + abs(height[i] - height[i - 1])
        two = dp[i - 2] + abs(height[i] - height[i - 2])
        dp[i] = min(one, two)
    return dp[n - 1]
