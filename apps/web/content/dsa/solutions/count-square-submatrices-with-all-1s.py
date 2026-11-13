from typing import List


def count_squares(matrix: List[List[int]]) -> int:
    if not matrix:
        return 0
    m, n = len(matrix), len(matrix[0])
    dp = [[0] * n for _ in range(m)]
    ans = 0
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == 0:
                continue
            if i == 0 or j == 0:
                dp[i][j] = 1
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
            ans += dp[i][j]
    return ans
