def min_cut(s: str) -> int:
    n = len(s)
    pal = [[False] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            if s[i] == s[j] and (j - i <= 2 or pal[i + 1][j - 1]):
                pal[i][j] = True

    memo: dict[int, int] = {}

    def dfs(i: int) -> int:
        if i == n:
            return -1
        if i in memo:
            return memo[i]
        best = n
        for j in range(i, n):
            if pal[i][j]:
                best = min(best, 1 + dfs(j + 1))
        memo[i] = best
        return best

    return dfs(0)
