def min_insertions(s: str) -> int:
    n = len(s)
    dp = [[0] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        dp[i][i] = 1
        for j in range(i + 1, n):
            if s[i] == s[j]:
                inner = dp[i + 1][j - 1] if i + 1 <= j - 1 else 0
                dp[i][j] = 2 + inner
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])
    return n - dp[0][n - 1]
