def num_trees(n: int) -> int:
    dp = [0] * (n + 1)
    dp[0] = 1
    for i in range(1, n + 1):
        s = 0
        for r in range(1, i + 1):
            s += dp[r - 1] * dp[i - r]
        dp[i] = s
    return dp[n]
