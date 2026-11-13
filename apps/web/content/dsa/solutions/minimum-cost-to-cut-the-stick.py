from typing import List


def min_cost(n: int, cuts: List[int]) -> int:
    pts = [0] + sorted(cuts) + [n]
    m = len(pts)
    dp = [[0] * m for _ in range(m)]
    for length in range(2, m):
        for i in range(m - length):
            j = i + length
            dp[i][j] = 10**9
            for k in range(i + 1, j):
                dp[i][j] = min(dp[i][j], dp[i][k] + dp[k][j] + pts[j] - pts[i])
    return dp[0][m - 1]
